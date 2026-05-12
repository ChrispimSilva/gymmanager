import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Dumbbell, TrendingUp, BookOpen } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const navItems = [
  { path: '/dashboard', label: 'Home', icon: LayoutDashboard, roles: ['admin', 'instrutor', 'aluno'] },
  { path: '/alunos', label: 'Alunos', icon: Users, roles: ['admin', 'instrutor'] },
  { path: '/treinos', label: 'Treinos', icon: Dumbbell, roles: ['admin', 'instrutor'] },
  { path: '/meus-treinos', label: 'Treinos', icon: Dumbbell, roles: ['aluno'] },
  { path: '/exercicios', label: 'Exercícios', icon: BookOpen, roles: ['admin', 'instrutor', 'aluno'] },
  { path: '/evolucao', label: 'Evolução', icon: TrendingUp, roles: ['admin', 'instrutor', 'aluno'] },
];

export default function MobileNav() {
  const location = useLocation();
  const { user } = useAuth();
  const visibleItems = navItems.filter(item => item.roles.includes(user?.role || ''));

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t"
      style={{
        background: 'var(--bg-secondary)',
        borderColor: 'var(--border-color)',
      }}
    >
      <div className="flex items-center justify-around py-2 px-1">
        {visibleItems.map(item => {
          const isActive = location.pathname.startsWith(item.path);
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className="flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all duration-200"
              style={{
                color: isActive ? 'var(--accent)' : 'var(--text-tertiary)',
              }}
            >
              <div
                className={`p-1.5 rounded-xl transition-all duration-300 ${
                  isActive ? 'bg-brand-500/15 scale-110' : ''
                }`}
              >
                <item.icon className="w-5 h-5" />
              </div>
              <span className={`text-[10px] font-medium ${isActive ? 'font-semibold' : ''}`}>
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
      {/* Safe area for iOS */}
      <div className="h-[env(safe-area-inset-bottom)]" style={{ background: 'var(--bg-secondary)' }} />
    </nav>
  );
}
