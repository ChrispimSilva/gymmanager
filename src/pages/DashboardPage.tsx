import { useState, useEffect, useCallback } from 'react';
import { Users, Dumbbell, TrendingUp, Activity, Plus, UserPlus, ClipboardList, Flame, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { studentService } from '../services/studentService';
import { workoutService } from '../services/workoutService';
import { progressService } from '../services/progressService';
import { activityService } from '../services/activityService';
import { sessionService } from '../services/sessionService';
import type { ActivityLog, Workout } from '../types';

export default function DashboardPage() {
  const { user } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();

  const isAluno = user?.role === 'aluno';

  const [stats, setStats] = useState({
    totalStudents: 0,
    activeStudents: 0,
    totalWorkouts: 0,
    totalRecords: 0,
    latestWeight: 0,
    streakDays: 0,
    completedSessions: 0,
    totalVolumeKg: 0,
  });
  const [firstWorkout, setFirstWorkout] = useState<Workout | null>(null);
  const [recentActivity, setRecentActivity] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      if (isAluno && user) {
        const myStudent = await studentService.getByUserId(user.id);
        if (myStudent) {
          const [myWorkouts, myProgress, activities, sessions, streak] = await Promise.all([
            workoutService.getByStudentId(myStudent.id),
            progressService.getByStudentId(myStudent.id),
            activityService.getRecentForStudent(myStudent.name, 5),
            sessionService.getByStudentId(myStudent.id),
            sessionService.getStreakDays(myStudent.id),
          ]);
          const latestWeight = myProgress[myProgress.length - 1]?.weight || myStudent.weight;
          const totalVolumeKg = sessions.reduce((acc, s) => acc + (s.totalVolumeKg || 0), 0);

          setStats({
            totalStudents: 0,
            activeStudents: 0,
            totalWorkouts: myWorkouts.length,
            totalRecords: myProgress.length,
            latestWeight,
            streakDays: streak,
            completedSessions: sessions.length,
            totalVolumeKg,
          });
          setFirstWorkout(myWorkouts[0] || null);
          setRecentActivity(activities);
        } else {
          setStats({
            totalStudents: 0,
            activeStudents: 0,
            totalWorkouts: 0,
            totalRecords: 0,
            latestWeight: 0,
            streakDays: 0,
            completedSessions: 0,
            totalVolumeKg: 0,
          });
          setRecentActivity([]);
        }
      } else {
        const [students, workouts, totalRecords, activities, allSessions] = await Promise.all([
          studentService.getAll(),
          workoutService.getAll(),
          progressService.getTotalCount(),
          activityService.getRecent(5),
          sessionService.getAll(),
        ]);
        const activeStudents = students.filter(s => s.active).length;
        const totalVolumeKg = allSessions.reduce((acc, s) => acc + (s.totalVolumeKg || 0), 0);

        setStats({
          totalStudents: students.length,
          activeStudents,
          totalWorkouts: workouts.length,
          totalRecords,
          latestWeight: 0,
          streakDays: 0,
          completedSessions: allSessions.length,
          totalVolumeKg,
        });
        setRecentActivity(activities);
      }
    } finally {
      setLoading(false);
    }
  }, [isAluno, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  interface StatCard {
    label: string;
    value: string | number;
    suffix?: string;
    total?: number;
    icon: typeof Dumbbell;
    color: string;
    bgColor: string;
  }

  const statCards: StatCard[] = isAluno
    ? [
        { label: 'Treinos Concluídos', value: stats.completedSessions, icon: Dumbbell, color: '#6366f1', bgColor: 'rgba(99,102,241,0.1)' },
        { label: 'Dias Seguidos', value: stats.streakDays, icon: Flame, color: '#f97316', bgColor: 'rgba(249,115,22,0.1)' },
        { label: 'Volume Levantado', value: stats.totalVolumeKg.toLocaleString('pt-BR'), suffix: 'kg', icon: TrendingUp, color: '#10b981', bgColor: 'rgba(16,185,129,0.1)' },
        { label: 'Peso Atual', value: stats.latestWeight, suffix: 'kg', icon: Activity, color: '#3b82f6', bgColor: 'rgba(59,130,246,0.1)' },
      ]
    : [
        { label: 'Alunos Ativos', value: stats.activeStudents, total: stats.totalStudents, icon: Users, color: '#10b981', bgColor: 'rgba(16,185,129,0.1)' },
        { label: 'Treinos Criados', value: stats.totalWorkouts, icon: Dumbbell, color: '#6366f1', bgColor: 'rgba(99,102,241,0.1)' },
        { label: 'Sessões Concluídas', value: stats.completedSessions, icon: Activity, color: '#f59e0b', bgColor: 'rgba(245,158,11,0.1)' },
        { label: 'Taxa Retenção', value: stats.totalStudents > 0 ? Math.round((stats.activeStudents / stats.totalStudents) * 100) : 0, suffix: '%', icon: TrendingUp, color: '#ef4444', bgColor: 'rgba(239,68,68,0.1)' },
      ];

  const quickActions = isAluno
    ? [
        ...(firstWorkout
          ? [{ label: 'Treinar Agora', icon: Play, path: `/treino-ativo/${firstWorkout.id}`, color: '#6366f1' }]
          : []),
        { label: 'Meus Treinos', icon: Dumbbell, path: '/meus-treinos', color: '#6366f1' },
        { label: 'Exercícios', icon: Dumbbell, path: '/exercicios', color: '#f59e0b' },
        { label: 'Minha Evolução', icon: ClipboardList, path: '/evolucao', color: '#10b981' },
        { label: 'Meu Histórico', icon: Activity, path: '/historico', color: '#8b5cf6' },
      ]
    : [
        { label: 'Novo Aluno', icon: UserPlus, path: '/alunos', color: '#10b981' },
        { label: 'Novo Treino', icon: Plus, path: '/treinos', color: '#6366f1' },
        { label: 'Aparelhos', icon: Dumbbell, path: '/aparelhos', color: '#06b6d4' },
        { label: 'Exercícios', icon: Dumbbell, path: '/exercicios', color: '#f59e0b' },
        { label: 'Evolução', icon: ClipboardList, path: '/evolucao', color: '#ef4444' },
      ];

  const activityIcons: Record<string, string> = {
    student_added: '👤',
    workout_created: '🏋️',
    workout_completed: '✅',
    workout_shared: '📸',
    progress_recorded: '📊',
    workout_updated: '📝',
    exercise_created: '✨',
    equipment_added: '🏷️',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Banner */}
      <div
        className="rounded-3xl p-5 sm:p-6 md:p-8 text-white relative overflow-hidden shadow-2xl transition-all duration-300 w-full"
        style={{
          background: 'var(--brand-gradient, linear-gradient(135deg, var(--accent), #059669))',
          boxShadow: '0 20px 40px -15px var(--accent)',
        }}
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-32 h-32 bg-white/10 rounded-full translate-y-1/2 blur-lg pointer-events-none" />
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                {settings.logoUrl && (
                  <img
                    src={settings.logoUrl}
                    alt={settings.gymName}
                    className="w-10 h-10 rounded-xl object-contain bg-white/20 p-1 flex-shrink-0"
                    onError={e => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                )}
                <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight break-words">
                  Bem-vindo à {settings.gymName}
                </h1>
              </div>
              <p className="text-white/90 text-xs sm:text-sm md:text-base max-w-lg leading-relaxed">
                {user?.role === 'aluno'
                  ? 'Inicie seu treino, cronometre seus descansos e supere suas marcas dia a dia!'
                  : 'Gerencie seus alunos, aparelhos e treinos personalizados com máxima eficiência.'}
              </p>
            </div>

            {isAluno && firstWorkout && (
              <button
                type="button"
                onClick={() => navigate(`/treino-ativo/${firstWorkout.id}`)}
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-white font-extrabold text-sm shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2.5 cursor-pointer min-h-[52px] group flex-shrink-0"
                style={{ color: 'var(--accent)' }}
              >
                <div
                  className="w-7 h-7 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                  style={{ background: 'var(--accent)', color: '#ffffff' }}
                >
                  <Play className="w-4 h-4 fill-white" />
                </div>
                <span>Iniciar Treino de Hoje</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full">
        {statCards.map((card, i) => (
          <div
            key={card.label}
            className={`rounded-3xl p-4 sm:p-5 card-hover border animate-slide-up min-w-0 flex flex-col justify-between stagger-${i + 1}`}
            style={{
              background: 'var(--card-bg)',
              borderColor: 'var(--border-color)',
            }}
          >
            <div>
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center mb-3"
                style={{ background: card.bgColor }}
              >
                <card.icon className="w-5 h-5" style={{ color: card.color }} />
              </div>
              {loading ? (
                <div className="h-8 bg-slate-500/10 rounded-lg animate-pulse w-16 mb-1" />
              ) : (
                <p
                  className="text-xl sm:text-2xl md:text-3xl font-black truncate tracking-tight"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {card.value}
                  {card.suffix && <span className="text-sm sm:text-base font-bold ml-0.5">{card.suffix}</span>}
                </p>
              )}
            </div>
            <p className="text-xs mt-1 truncate" style={{ color: 'var(--text-tertiary)' }}>
              {card.label}
              {card.total !== undefined && (
                <span className="ml-1">/ {card.total} total</span>
              )}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 w-full max-w-full min-w-0">
        {/* Quick Actions */}
        <div
          className="rounded-3xl p-4 sm:p-5 md:p-6 border animate-slide-up stagger-5 min-w-0 max-w-full overflow-hidden box-border"
          style={{
            background: 'var(--card-bg)',
            borderColor: 'var(--border-color)',
          }}
        >
          <h3 className="text-base sm:text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
            Ações Rápidas
          </h3>
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
            {quickActions.map(action => (
              <button
                key={action.label}
                onClick={() => navigate(action.path)}
                className="flex flex-col items-center justify-center gap-2 p-3 sm:p-4 rounded-2xl border transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer min-h-[90px] min-w-0 text-center"
                style={{
                  borderColor: 'var(--border-color)',
                  background: 'var(--bg-tertiary)',
                }}
              >
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${action.color}15`, color: action.color }}
                >
                  <action.icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold truncate w-full" style={{ color: 'var(--text-primary)' }}>
                  {action.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div
          className="rounded-3xl p-4 sm:p-5 md:p-6 border animate-slide-up stagger-6 min-w-0 max-w-full overflow-hidden box-border"
          style={{
            background: 'var(--card-bg)',
            borderColor: 'var(--border-color)',
          }}
        >
          <h3 className="text-base sm:text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
            Atividade Recente
          </h3>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-12 rounded-2xl bg-slate-500/10 animate-pulse" />
              ))}
            </div>
          ) : recentActivity.length > 0 ? (
            <div className="space-y-3">
              {recentActivity.map(activity => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-3 rounded-2xl transition-colors"
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
