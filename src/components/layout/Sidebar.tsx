import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Dumbbell,
  BookOpen,
  TrendingUp,
  History,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useState } from 'react';

const menuItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'instrutor', 'aluno'] },
  { path: '/alunos', label: 'Alunos', icon: Users, roles: ['admin', 'instrutor'] },
  { path: '/treinos', label: 'Treinos', icon: Dumbbell, roles: ['admin', 'instrutor'] },
  { path: '/meus-treinos', label: 'Meus Treinos', icon: Dumbbell, roles: ['aluno'] },
  { path: '/exercicios', label: 'Exercícios', icon: BookOpen, roles: ['admin', 'instrutor', 'aluno'] },
  { path: '/evolucao', label: 'Evolução', icon: TrendingUp, roles: ['admin', 'instrutor', 'aluno'] },
  { path: '/historico', label: 'Histórico', icon: History, roles: ['admin', 'instrutor'] },
];

export default function Sidebar() {
  const { logout, user } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const visibleItems = menuItems.filter(item => item.roles.includes(user?.role || ''));

  return (
    <aside
      className={`hidden md:flex flex-col transition-all duration-300 ease-in-out ${
        collapsed ? 'w-20' : 'w-64'
      }`}
      style={{ background: 'var(--sidebar-bg)', color: 'var(--sidebar-text)' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-6 border-b border-white/10">
        <div className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center flex-shrink-0">
          <Dumbbell className="w-6 h-6 text-white" />
        </div>
        {!collapsed && (
          <div className="animate-fade-in">
            <h1 className="text-lg font-bold text-white">GymManager</h1>
            <p className="text-xs text-slate-400">Gestão de Academia</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {visibleItems.map(item => {
          const isActive = location.pathname.startsWith(item.path);
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group ${
                isActive
                  ? 'bg-brand-500/20 text-brand-400'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <item.icon
                className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 ${
                  isActive ? 'text-brand-400' : 'group-hover:scale-110'
                }`}
              />
              {!collapsed && (
                <span className="text-sm font-medium">{item.label}</span>
              )}
              {isActive && !collapsed && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse-glow" />
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User info & Logout */}
      <div className="p-3 border-t border-white/10">
        {!collapsed && user && (
          <div className="px-3 py-2 mb-2">
            <p className="text-sm font-medium text-white truncate">{user.name}</p>
            <p className="text-xs text-slate-400 capitalize">{user.role}</p>
          </div>
        )}
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
          title="Sair"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Sair</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute top-1/2 -right-3 w-6 h-6 rounded-full bg-surface-700 border border-surface-600 text-slate-400 hover:text-white flex items-center justify-center transition-all duration-200 hover:scale-110 hidden md:flex"
        style={{ transform: 'translateY(-50%)' }}
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </aside>
  );
}
