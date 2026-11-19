import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Dumbbell,
  TrendingUp,
  Activity,
  Plus,
  UserPlus,
  ClipboardList,
  Flame,
  Play,
  Building2,
  Award,
  CreditCard,
  ShieldCheck,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { studentService } from '../services/studentService';
import { workoutService } from '../services/workoutService';
import { progressService } from '../services/progressService';
import { activityService } from '../services/activityService';
import { sessionService } from '../services/sessionService';
import { tenantService } from '../services/tenantService';
import { DEFAULT_TENANT_ID, type ActivityLog, type Tenant, type TenantSeatUsage, type Workout } from '../types';

export default function DashboardPage() {
  const { user } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();

  const isAluno = user?.role === 'aluno';
  const isSuperAdmin = user?.role === 'superadmin';
  const isAdmin = user?.role === 'admin';

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
  const [seatUsage, setSeatUsage] = useState<TenantSeatUsage | null>(null);
  const [platformTenants, setPlatformTenants] = useState<
    { tenant: Tenant; usage: TenantSeatUsage }[]
  >([]);
  const [firstWorkout, setFirstWorkout] = useState<Workout | null>(null);
  const [recentActivity, setRecentActivity] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      if (isSuperAdmin) {
        const [tenants, activities] = await Promise.all([
          tenantService.getAll(),
          activityService.getRecent(6),
        ]);
        const withUsage = await Promise.all(
          tenants.map(async t => ({
            tenant: t,
            usage: await tenantService.getSeatUsage(t.id),
          }))
        );
        setPlatformTenants(withUsage);
        setRecentActivity(activities);
        return;
      }

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
        const tenantId = user?.tenantId || DEFAULT_TENANT_ID;
        const [students, workouts, totalRecords, activities, allSessions, usage] = await Promise.all([
          studentService.getAll(),
          workoutService.getAll(),
          progressService.getTotalCount(),
          activityService.getRecent(5),
          sessionService.getAll(),
          tenantService.getSeatUsage(tenantId),
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
        setSeatUsage(usage);
        setRecentActivity(activities);
      }
    } finally {
      setLoading(false);
    }
  }, [isAluno, isSuperAdmin, user]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const activityIcons: Record<string, string> = {
    student_added: '👤',
    workout_created: '🏋️',
    workout_completed: '✅',
    workout_shared: '📸',
    progress_recorded: '📊',
    workout_updated: '📝',
    exercise_created: '✨',
    equipment_added: '🏷️',
    personal_added: '🏅',
    tenant_created: '🏢',
  };

  // ============================================================
  // SUPERADMIN DASHBOARD VIEW
  // ============================================================
  if (isSuperAdmin) {
    const totalTenants = platformTenants.length;
    const activeTenants = platformTenants.filter(t => t.tenant.active).length;
    const totalSeats = platformTenants.reduce((acc, t) => acc + t.usage.usedSeats, 0);
    const totalPersonals = platformTenants.reduce((acc, t) => acc + t.usage.activePersonals, 0);
    const totalStudents = platformTenants.reduce((acc, t) => acc + t.usage.activeStudents, 0);
    const projectedCents = platformTenants.reduce(
      (acc, t) => acc + t.usage.estimatedMonthlyCents,
      0
    );

    return (
      <div className="space-y-6 animate-fade-in">
        {/* SuperAdmin Banner */}
        <div
          className="rounded-3xl p-6 md:p-8 text-white relative overflow-hidden shadow-2xl"
          style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 55%, #312e81 100%)',
          }}
        >
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 mb-3">
                <ShieldCheck className="w-3.5 h-3.5" />
                SuperAdmin • Dono da Plataforma
              </span>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight">
                Central SaaS Multi-Tenant
              </h1>
              <p className="text-slate-300 text-sm mt-1 max-w-xl">
                Administre as academias credenciadas (Tenants), contas Admin e monitore a ocupação de assentos em tempo real.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/academias')}
              className="px-6 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-sm shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer flex-shrink-0"
            >
              <Building2 className="w-4 h-4" />
              Gerenciar Academias
            </button>
          </div>
        </div>

        {/* SaaS KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            className="rounded-3xl p-5 border"
            style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
          >
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mb-3">
              <Building2 className="w-5 h-5" />
            </div>
            <p className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>
              {activeTenants}{' '}
              <span className="text-xs font-normal" style={{ color: 'var(--text-tertiary)' }}>
                / {totalTenants}
              </span>
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
              Academias Ativas (Tenants)
            </p>
          </div>

          <div
            className="rounded-3xl p-5 border"
            style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
          >
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-3">
              <CreditCard className="w-5 h-5" />
            </div>
            <p className="text-2xl font-black text-emerald-500">{totalSeats}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
              Assentos Ocupados (Total)
            </p>
          </div>

          <div
            className="rounded-3xl p-5 border"
            style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
          >
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-3">
              <Users className="w-5 h-5" />
            </div>
            <p className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>
              {totalPersonals} Personais • {totalStudents} Alunos
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
              Composição de Assentos Ativos
            </p>
          </div>

          <div
            className="rounded-3xl p-5 border"
            style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400">
                Gratuito Agora
              </span>
            </div>
            <p className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>
              {(projectedCents / 100).toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })}
              <span className="text-xs font-normal" style={{ color: 'var(--text-tertiary)' }}>
                /mês
              </span>
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
              Receita Simulada por Assento
            </p>
          </div>
        </div>

        {/* Tenants List & Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div
            className="rounded-3xl p-5 sm:p-6 border space-y-4"
            style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                Academias e Uso de Assentos
              </h3>
              <button
                type="button"
                onClick={() => navigate('/academias')}
                className="text-xs font-bold text-brand-500 hover:underline cursor-pointer"
              >
                Ver todas →
              </button>
            </div>

            <div className="space-y-3">
              {platformTenants.map(({ tenant, usage }) => (
                <div
                  key={tenant.id}
                  className="p-3.5 rounded-2xl flex items-center justify-between gap-3"
                  style={{ background: 'var(--bg-tertiary)' }}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ background: tenant.active ? '#10b981' : '#ef4444' }}
                      />
                      <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                        {tenant.name}
                      </p>
                      <span className="text-[10px] font-mono text-slate-400">({tenant.slug})</span>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                      {usage.activePersonals} Personais + {usage.activeStudents} Alunos ativos
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-extrabold" style={{ color: 'var(--text-primary)' }}>
                      {usage.usedSeats} / {usage.maxSeats ?? '∞'}
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                      assentos
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            className="rounded-3xl p-5 sm:p-6 border"
            style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
          >
            <h3 className="text-base font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
              Log Recente da Plataforma
            </h3>
            {recentActivity.length > 0 ? (
              <div className="space-y-3">
                {recentActivity.map(activity => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 p-3 rounded-2xl"
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
              <p className="text-sm text-center py-8" style={{ color: 'var(--text-tertiary)' }}>
                Nenhuma atividade recente.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // TENANT DASHBOARD VIEW (Admin, Personal, Aluno)
  // ============================================================
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
        ...(isAdmin
          ? [{ label: 'Equipe (Personais)', icon: Award, path: '/personais', color: '#8b5cf6' }]
          : []),
        { label: 'Novo Treino', icon: Plus, path: '/treinos', color: '#6366f1' },
        { label: 'Aparelhos', icon: Dumbbell, path: '/aparelhos', color: '#06b6d4' },
        { label: 'Exercícios', icon: Dumbbell, path: '/exercicios', color: '#f59e0b' },
        { label: 'Evolução', icon: ClipboardList, path: '/evolucao', color: '#ef4444' },
      ];

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

      {/* Admin Seat Usage Widget */}
      {isAdmin && seatUsage && (
        <div
          className="rounded-3xl p-4 sm:p-5 border flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-brand-500/10 text-brand-500 flex items-center justify-center flex-shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  Assentos da Academia (Tenant): {seatUsage.usedSeats} /{' '}
                  {seatUsage.maxSeats ?? 'Ilimitado'}
                </h2>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-500">
                  Plano Gratuito Ativo
                </span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                Detalhamento: <strong>{seatUsage.activePersonals} Personais ativos</strong> +{' '}
                <strong>{seatUsage.activeStudents} Alunos ativos</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/personais')}
            className="px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer self-start sm:self-center"
            style={{
              background: 'var(--bg-tertiary)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)',
            }}
          >
            Gerenciar Personais →
          </button>
        </div>
      )}

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
