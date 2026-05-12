import { Moon, Sun, Bell, Menu, X, LogOut } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useState, useRef, useEffect } from 'react';

export default function Header({ onToggleMobile }: { onToggleMobile?: () => void }) {
  const { isDark, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [showNotif, setShowNotif] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const roleLabels: Record<string, string> = {
    admin: 'Administrador',
    instrutor: 'Instrutor',
    aluno: 'Aluno',
  };

  // Close user menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    }
    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showUserMenu]);

  return (
    <header
      className="h-16 flex items-center justify-between px-4 md:px-6 border-b transition-colors duration-300"
      style={{
        background: 'var(--bg-secondary)',
        borderColor: 'var(--border-color)',
      }}
    >
      {/* Left - Mobile menu toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobile}
          className="md:hidden p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          style={{ color: 'var(--text-primary)' }}
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="hidden md:block">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            Olá, {user?.name?.split(' ')[0]} 👋
          </h2>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {roleLabels[user?.role || ''] || ''} • {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-xl transition-all duration-300 hover:scale-110"
          style={{
            background: isDark ? 'rgba(251, 191, 36, 0.1)' : 'rgba(99, 102, 241, 0.1)',
            color: isDark ? '#fbbf24' : '#6366f1',
          }}
          title={isDark ? 'Modo claro' : 'Modo escuro'}
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotif(!showNotif)}
            className="p-2.5 rounded-xl transition-all duration-200 hover:scale-110"
            style={{
              background: 'rgba(16, 185, 129, 0.1)',
              color: 'var(--accent)',
            }}
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          </button>

          {showNotif && (
            <div
              className="absolute right-0 top-12 w-72 rounded-2xl shadow-2xl border p-4 z-50 animate-scale-in"
              style={{
                background: 'var(--card-bg)',
                borderColor: 'var(--border-color)',
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Notificações
                </h3>
                <button onClick={() => setShowNotif(false)}>
                  <X className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                </button>
              </div>
              <div className="space-y-2">
                <div className="p-3 rounded-xl" style={{ background: 'var(--bg-tertiary)' }}>
                  <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                    Novo treino disponível
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                    há 2 horas
                  </p>
                </div>
                <div className="p-3 rounded-xl" style={{ background: 'var(--bg-tertiary)' }}>
                  <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                    Medidas atualizadas
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                    ontem
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User avatar with dropdown */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="w-9 h-9 rounded-xl gradient-brand flex items-center justify-center text-white text-sm font-bold ml-1 cursor-pointer hover:scale-105 transition-transform active:scale-95"
            title={user?.name}
            id="user-menu-btn"
          >
            {user?.name?.charAt(0).toUpperCase()}
          </button>

          {showUserMenu && (
            <div
              className="absolute right-0 top-12 w-56 rounded-2xl shadow-2xl border z-50 animate-scale-in overflow-hidden"
              style={{
                background: 'var(--card-bg)',
                borderColor: 'var(--border-color)',
              }}
            >
              {/* User info */}
              <div className="p-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {user?.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                      {user?.name}
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                      {roleLabels[user?.role || '']} • {user?.email}
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="p-2">
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:bg-red-500/10 text-red-400"
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
  );
}
