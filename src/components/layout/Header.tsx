import { Moon, Sun, Bell, X, LogOut, Database, User as UserIcon, CheckCheck, Trash2, Dumbbell } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { NetworkStatusBadge } from './NetworkStatusBadge';
import { BackupManagementModal } from '../admin/BackupManagementModal';
import { UserProfileModal } from '../profile/UserProfileModal';
import { notificationService } from '../../services/notificationService';
import { GYM_AVATARS } from '../../constants/gymAvatars';
import { useState, useRef, useEffect, useCallback } from 'react';
import type { AppNotification } from '../../types';

export default function Header() {
  const { isDark, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { settings } = useSettings();
  const [showNotif, setShowNotif] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const notifMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const roleLabels: Record<string, string> = {
    admin: 'Administrador',
    instrutor: 'Instrutor',
    aluno: 'Aluno',
  };

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    const list = await notificationService.getAll(user.id);
    setNotifications(list);
  }, [user]);

  useEffect(() => {
    let active = true;
    async function fetchNotifs() {
      if (!user) return;
      const list = await notificationService.getAll(user.id);
      if (active) setNotifications(list);
    }
    void fetchNotifs();
    return () => {
      active = false;
    };
  }, [user]);

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(e.target as Node)) {
        setShowNotif(false);
      }
    }
    if (showUserMenu || showNotif) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showUserMenu, showNotif]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAsRead = async (id: string) => {
    await notificationService.markAsRead(id);
    await loadNotifications();
  };

  const handleDeleteNotif = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await notificationService.delete(id);
    await loadNotifications();
  };

  const handleMarkAllAsRead = async () => {
    if (!user) return;
    await notificationService.markAllAsRead(user.id);
    await loadNotifications();
  };

  const currentAvatarPreset = GYM_AVATARS.find(a => a.id === user?.avatar);

  return (
    <>
      <header
        className="h-16 flex items-center justify-between px-4 sm:px-6 md:px-8 border-b transition-colors duration-300 w-full"
        style={{
          background: 'var(--bg-secondary)',
          borderColor: 'var(--border-color)',
        }}
      >
        {/* Left - Gym branding & user greeting */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="md:hidden flex-shrink-0">
            {settings.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt={settings.gymName}
                className="w-8 h-8 rounded-xl object-contain bg-black/5 dark:bg-white/10 p-0.5"
                onError={e => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: 'var(--accent)', color: '#ffffff' }}
              >
                <Dumbbell className="w-4 h-4" />
              </div>
            )}
          </div>

          <div className="min-w-0">
            <h2 className="text-sm sm:text-base md:text-lg font-bold truncate leading-tight" style={{ color: 'var(--text-primary)' }}>
              Olá, {user?.name?.split(' ')[0]} 👋
            </h2>
            <p className="text-[10px] sm:text-xs truncate leading-tight" style={{ color: 'var(--text-tertiary)' }}>
              {roleLabels[user?.role || ''] || ''}
              <span className="hidden sm:inline">
                {' '}• {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </span>
            </p>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Online/Offline PWA sync badge */}
          <NetworkStatusBadge />

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-2xl transition-all duration-300 hover:scale-110 cursor-pointer"
            style={{
              background: isDark ? 'rgba(251, 191, 36, 0.1)' : 'rgba(99, 102, 241, 0.1)',
              color: isDark ? '#fbbf24' : '#6366f1',
            }}
            title={isDark ? 'Modo claro' : 'Modo escuro'}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Notifications */}
          <div className="relative" ref={notifMenuRef}>
            <button
              onClick={() => setShowNotif(!showNotif)}
              className="p-2.5 rounded-2xl transition-all duration-200 hover:scale-110 cursor-pointer relative"
              style={{
                background: 'rgba(16, 185, 129, 0.1)',
                color: 'var(--accent)',
              }}
              title="Notificações"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-slate-900 shadow-sm animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotif && (
              <div
                className="absolute right-0 top-12 w-80 max-w-[90vw] rounded-3xl shadow-2xl border p-4 z-50 animate-scale-in max-h-[85vh] overflow-y-auto"
                style={{
                  background: 'var(--card-bg)',
                  borderColor: 'var(--border-color)',
                }}
              >
                <div
                  className="flex items-center justify-between mb-3 pb-2 border-b"
                  style={{ borderColor: 'var(--border-color)' }}
                >
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                      Notificações
                    </h3>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-500/10 text-brand-500">
                        {unreadCount} nova{unreadCount > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllAsRead}
                        className="p-1 rounded-lg text-slate-400 hover:text-brand-500 transition-colors cursor-pointer"
                        title="Marcar todas como lidas"
                      >
                        <CheckCheck className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowNotif(false)}
                      className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                      title="Fechar"
                    >
                      <X className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {notifications.length === 0 ? (
                    <p className="text-xs text-center py-6" style={{ color: 'var(--text-tertiary)' }}>
                      Nenhuma notificação no momento.
                    </p>
                  ) : (
                    notifications.map(n => (
                      <div
                        key={n.id}
                        onClick={() => handleMarkAsRead(n.id)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer relative group ${
                          !n.read ? 'border-brand-500/40' : 'opacity-75'
                        }`}
                        style={{
                          background: !n.read ? 'rgba(16, 185, 129, 0.05)' : 'var(--bg-tertiary)',
                          borderColor: !n.read ? 'var(--accent)' : 'var(--border-color)',
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              {!n.read && (
                                <span className="w-1.5 h-1.5 rounded-full bg-brand-500 flex-shrink-0" />
                              )}
                              <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                                {n.title}
                              </p>
                            </div>
                            <p className="text-[11px] mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                              {n.message}
                            </p>
                            <p className="text-[9px] mt-1.5" style={{ color: 'var(--text-tertiary)' }}>
                              {new Date(n.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={e => handleDeleteNotif(e, n.id)}
                            className="p-1 rounded-lg text-slate-400 hover:text-red-400 transition-colors opacity-60 hover:opacity-100 cursor-pointer"
                            title="Excluir notificação"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User avatar with dropdown */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white text-sm font-bold ml-1 cursor-pointer hover:scale-105 transition-transform active:scale-95 shadow-md shadow-brand-500/20 overflow-hidden"
              style={{
                background: currentAvatarPreset?.bgGradient || 'var(--accent)',
              }}
              title={user?.name}
              id="user-menu-btn"
            >
              {currentAvatarPreset ? (
                <span className="text-lg">{currentAvatarPreset.iconEmoji}</span>
              ) : user?.avatar?.startsWith('data:image') ? (
                <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover rounded-2xl" />
              ) : (
                user?.name?.charAt(0).toUpperCase()
              )}
            </button>

            {showUserMenu && (
              <div
                className="absolute right-0 top-12 w-64 rounded-3xl shadow-2xl border z-50 animate-scale-in overflow-hidden"
                style={{
                  background: 'var(--card-bg)',
                  borderColor: 'var(--border-color)',
                }}
              >
                {/* User info */}
                <div className="p-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-md"
                      style={{
                        background: currentAvatarPreset?.bgGradient || 'var(--accent)',
                      }}
                    >
                      {currentAvatarPreset ? (
                        <span className="text-lg">{currentAvatarPreset.iconEmoji}</span>
                      ) : user?.avatar?.startsWith('data:image') ? (
                        <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover rounded-2xl" />
                      ) : (
                        user?.name?.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                        {user?.name}
                      </p>
                      <p className="text-[10px] truncate" style={{ color: 'var(--text-tertiary)' }}>
                        {roleLabels[user?.role || '']} • {user?.email}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="p-2 space-y-1">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      setShowProfileModal(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-2xl text-xs font-semibold transition-all hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    <UserIcon className="w-4 h-4 text-emerald-500" />
                    Meu Perfil & Avatar
                  </button>

                  {user?.role === 'admin' && (
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        setShowBackupModal(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-2xl text-xs font-semibold transition-all hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      <Database className="w-4 h-4 text-indigo-500" />
                      Backup & Gestão de Dados
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-2xl text-xs font-semibold transition-all hover:bg-red-500/10 text-red-400 cursor-pointer"
                    id="user-menu-logout"
                  >
                    <LogOut className="w-4 h-4" />
                    Sair da conta
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />

      {/* Backup & Database Management Modal */}
      <BackupManagementModal
        isOpen={showBackupModal}
        onClose={() => setShowBackupModal(false)}
      />
    </>
  );
}
