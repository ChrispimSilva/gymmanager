import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Dumbbell,
  TrendingUp,
  BookOpen,
  History,
  Layers,
  Settings,
  Building2,
  Award,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function MobileNav() {
  const location = useLocation();
  const { user } = useAuth();

  const isSuperAdmin = user?.role === 'superadmin';
  const isAluno = user?.role === 'aluno';
  const isAdmin = user?.role === 'admin';

  const navItems = isSuperAdmin
    ? [
        { path: '/dashboard', label: 'SaaS', icon: LayoutDashboard },
        { path: '/academias', label: 'Academias', icon: Building2 },
      ]
    : isAluno
    ? [
        { path: '/dashboard', label: 'Home', icon: LayoutDashboard },
        { path: '/meus-treinos', label: 'Treinos', icon: Dumbbell },
        { path: '/exercicios', label: 'Exercícios', icon: BookOpen },
        { path: '/evolucao', label: 'Evolução', icon: TrendingUp },
        { path: '/historico', label: 'Histórico', icon: History },
      ]
    : isAdmin
    ? [
        { path: '/dashboard', label: 'Home', icon: LayoutDashboard },
        { path: '/personais', label: 'Equipe', icon: Award },
        { path: '/alunos', label: 'Alunos', icon: Users },
        { path: '/treinos', label: 'Treinos', icon: Dumbbell },
        { path: '/configuracoes', label: 'Config', icon: Settings },
      ]
    : [
        { path: '/dashboard', label: 'Home', icon: LayoutDashboard },
        { path: '/alunos', label: 'Alunos', icon: Users },
        { path: '/treinos', label: 'Treinos', icon: Dumbbell },
        { path: '/aparelhos', label: 'Aparelhos', icon: Layers },
        { path: '/historico', label: 'Histórico', icon: History },
      ];

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t backdrop-blur-lg"
      style={{
        background: 'var(--bg-secondary)',
        borderColor: 'var(--border-color)',
      }}
    >
      <div className="flex items-center justify-around py-1.5 px-1 max-w-md mx-auto">
        {navItems.map(item => {
          const isActive = location.pathname.startsWith(item.path);
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className="flex flex-col items-center justify-center gap-1 py-1.5 px-2 rounded-2xl transition-all duration-200 min-w-[56px] min-h-[48px] touch-manipulation cursor-pointer"
              style={{
                color: isActive ? 'var(--accent)' : 'var(--text-tertiary)',
              }}
            >
              <div
                className={`p-1.5 rounded-xl transition-all duration-300 ${
                  isActive ? 'bg-brand-500/15 scale-110' : ''
                }`}
                style={isActive ? { background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent)' } : {}}
              >
                <item.icon className="w-5 h-5" />
              </div>
              <span className={`text-[10px] tracking-tight ${isActive ? 'font-bold' : 'font-medium'}`}>
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
      {/* Safe area spacer for smartphone home bars / gesture pill */}
      <div className="h-[env(safe-area-inset-bottom,6px)] pb-1" style={{ background: 'var(--bg-secondary)' }} />
    </nav>
  );
}
