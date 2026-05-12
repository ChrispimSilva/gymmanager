import { Users, Dumbbell, TrendingUp, Activity, Plus, UserPlus, ClipboardList } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { studentService } from '../services/studentService';
import { workoutService } from '../services/workoutService';
import { progressService } from '../services/progressService';
import { activityService } from '../services/activityService';
import { useMemo } from 'react';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const isAluno = user?.role === 'aluno';

  const stats = useMemo(() => {
    if (isAluno && user) {
      const myStudent = studentService.getByUserId(user.id);
      if (myStudent) {
        const myWorkouts = workoutService.getByStudentId(myStudent.id);
        const myProgress = progressService.getByStudentId(myStudent.id);
        const latestWeight = myProgress[myProgress.length - 1]?.weight || myStudent.weight;
        return {
          totalStudents: 0, activeStudents: 0,
          totalWorkouts: myWorkouts.length,
          totalRecords: myProgress.length,
          latestWeight,
        };
      }
    }
    const students = studentService.getAll();
    const workouts = workoutService.getAll();
    const activeStudents = students.filter(s => s.active).length;
    return {
      totalStudents: students.length,
      activeStudents,
      totalWorkouts: workouts.length,
      totalRecords: progressService.getTotalCount(),
      latestWeight: 0,
    };
  }, [isAluno, user]);

  const recentActivity = useMemo(() => {
    if (isAluno && user) {
      const myStudent = studentService.getByUserId(user.id);
      if (myStudent) {
        return activityService.getRecentForStudent(myStudent.name, 5);
      }
      return [];
    }
    return activityService.getRecent(5);
  }, [isAluno, user]);

  const statCards = isAluno
    ? [
        { label: 'Meus Treinos', value: stats.totalWorkouts, icon: Dumbbell, color: '#6366f1', bgColor: 'rgba(99,102,241,0.1)' },
        { label: 'Meus Registros', value: stats.totalRecords, icon: TrendingUp, color: '#f59e0b', bgColor: 'rgba(245,158,11,0.1)' },
        { label: 'Peso Atual', value: stats.latestWeight, suffix: 'kg', icon: Activity, color: '#10b981', bgColor: 'rgba(16,185,129,0.1)' },
      ]
    : [
        { label: 'Alunos Ativos', value: stats.activeStudents, total: stats.totalStudents, icon: Users, color: '#10b981', bgColor: 'rgba(16,185,129,0.1)' },
        { label: 'Treinos Criados', value: stats.totalWorkouts, icon: Dumbbell, color: '#6366f1', bgColor: 'rgba(99,102,241,0.1)' },
        { label: 'Registros Evolução', value: stats.totalRecords, icon: TrendingUp, color: '#f59e0b', bgColor: 'rgba(245,158,11,0.1)' },
        { label: 'Taxa Retenção', value: stats.totalStudents > 0 ? Math.round((stats.activeStudents / stats.totalStudents) * 100) : 0, suffix: '%', icon: Activity, color: '#ef4444', bgColor: 'rgba(239,68,68,0.1)' },
      ];

  const quickActions = isAluno
    ? [
        { label: 'Meus Treinos', icon: Dumbbell, path: '/meus-treinos', color: '#6366f1' },
        { label: 'Exercícios', icon: Dumbbell, path: '/exercicios', color: '#f59e0b' },
        { label: 'Minha Evolução', icon: ClipboardList, path: '/evolucao', color: '#10b981' },
      ]
    : [
        { label: 'Novo Aluno', icon: UserPlus, path: '/alunos', color: '#10b981' },
        { label: 'Novo Treino', icon: Plus, path: '/treinos', color: '#6366f1' },
        { label: 'Exercícios', icon: Dumbbell, path: '/exercicios', color: '#f59e0b' },
        { label: 'Evolução', icon: ClipboardList, path: '/evolucao', color: '#ef4444' },
      ];

  const activityIcons: Record<string, string> = {
    student_added: '👤',
    workout_created: '🏋️',
    workout_completed: '✅',
    progress_recorded: '📊',
    workout_updated: '📝',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Banner */}
      <div className="rounded-2xl gradient-brand p-6 md:p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-1/3 w-32 h-32 bg-white/5 rounded-full translate-y-1/2" />
        <div className="relative z-10">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">
            Bem-vindo ao GymManager
          </h1>
          <p className="text-white/80 text-sm md:text-base max-w-lg">
            {user?.role === 'aluno'
              ? 'Confira seus treinos, acompanhe sua evolução e alcance seus objetivos!'
              : 'Gerencie seus alunos, crie treinos personalizados e acompanhe a evolução de cada um.'}
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {statCards.map((card, i) => (
          <div
            key={card.label}
            className={`rounded-2xl p-4 md:p-5 card-hover border animate-slide-up stagger-${i + 1}`}
            style={{
              background: 'var(--card-bg)',
              borderColor: 'var(--border-color)',
            }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
              style={{ background: card.bgColor }}
            >
              <card.icon className="w-5 h-5" style={{ color: card.color }} />
            </div>
            <p className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {card.value}
              {card.suffix && <span className="text-lg">{card.suffix}</span>}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
              {card.label}
              {card.total !== undefined && (
                <span className="ml-1">/ {card.total} total</span>
              )}
            </p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4 md:gap-6">
        {/* Quick Actions */}
        <div
          className="rounded-2xl p-5 md:p-6 border animate-slide-up stagger-5"
          style={{
            background: 'var(--card-bg)',
            borderColor: 'var(--border-color)',
          }}
        >
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            Ações Rápidas
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map(action => (
              <button
                key={action.label}
                onClick={() => navigate(action.path)}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  borderColor: 'var(--border-color)',
                  background: 'var(--bg-tertiary)',
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: `${action.color}15`, color: action.color }}
                >
                  <action.icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                  {action.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div
          className="rounded-2xl p-5 md:p-6 border animate-slide-up stagger-6"
          style={{
            background: 'var(--card-bg)',
            borderColor: 'var(--border-color)',
          }}
        >
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            Atividade Recente
          </h3>
          {recentActivity.length > 0 ? (
            <div className="space-y-3">
              {recentActivity.map(activity => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-3 rounded-xl transition-colors"
                  style={{ background: 'var(--bg-tertiary)' }}
                >
                  <span className="text-lg flex-shrink-0 mt-0.5">
                    {activityIcons[activity.type] || '📋'}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                      {activity.description}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                      {new Date(activity.timestamp).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Activity className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-tertiary)' }} />
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                Nenhuma atividade recente
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
