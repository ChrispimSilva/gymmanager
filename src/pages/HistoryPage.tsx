import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  History as HistoryIcon,
  Dumbbell,
  UserPlus,
  TrendingUp,
  FileEdit,
  Sparkles,
  Clock,
  Flame,
  X,
  ChevronRight,
  Layers,
  Search,
  Users,
  Share2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { activityService } from '../services/activityService';
import { sessionService } from '../services/sessionService';
import { studentService } from '../services/studentService';
import { useAuth } from '../contexts/AuthContext';
import { WorkoutShareModal } from '../components/workout/WorkoutShareModal';
import type { ActivityLog, WorkoutSession, Student } from '../types';

const typeConfig: Record<string, { icon: LucideIcon; color: string; bg: string }> = {
  workout_created: { icon: Dumbbell, color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
  workout_completed: { icon: Dumbbell, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  workout_shared: { icon: Share2, color: '#e1306c', bg: 'rgba(225,48,108,0.12)' },
  workout_updated: { icon: FileEdit, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  student_added: { icon: UserPlus, color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  progress_recorded: { icon: TrendingUp, color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  exercise_created: { icon: Sparkles, color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
  equipment_added: { icon: Layers, color: '#06b6d4', bg: 'rgba(6,182,212,0.1)' },
};

export default function HistoryPage() {
  const { user } = useAuth();
  const isAluno = user?.role === 'aluno';

  const [activeTab, setActiveTab] = useState<'sessions' | 'activities'>('sessions');
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<WorkoutSession | null>(null);
  const [sharingSession, setSharingSession] = useState<WorkoutSession | null>(null);
  
  // Student filter for instructors/admin
  const [selectedStudentId, setSelectedStudentId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [acts, sess, studs] = await Promise.all([
          activityService.getAll(),
          sessionService.getAll(),
          studentService.getAll(),
        ]);
        if (active) {
          if (isAluno && user) {
            // Filter to current student's sessions and activities
            const currentStudent = studs.find(s => s.userId === user.id || s.email === user.email);
            if (currentStudent) {
              setSessions(sess.filter(s => s.studentId === currentStudent.id));
              setActivities(acts.filter(a => a.relatedId === currentStudent.id || a.userId === user.id));
            } else {
              setSessions([]);
              setActivities([]);
            }
          } else {
            setSessions(sess);
            setActivities(acts);
          }
          setStudents(studs);
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [isAluno, user]);

  const getStudentName = useCallback(
    (studentId: string) => {
      const s = students.find(item => item.id === studentId);
      return s ? s.name : 'Aluno';
    },
    [students]
  );

  // Filtered sessions
  const filteredSessions = useMemo(() => {
    return sessions.filter(session => {
      const matchesStudent =
        selectedStudentId === 'all' || session.studentId === selectedStudentId;
      const matchesSearch =
        !searchTerm.trim() ||
        session.workoutName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getStudentName(session.studentId).toLowerCase().includes(searchTerm.toLowerCase());
      return matchesStudent && matchesSearch;
    });
  }, [sessions, selectedStudentId, searchTerm, getStudentName]);

  // Filtered activities
  const filteredActivities = useMemo(() => {
    return activities.filter(act => {
      const targetStudent = students.find(s => s.id === selectedStudentId);
      const matchesStudent =
        selectedStudentId === 'all' ||
        act.relatedId === selectedStudentId ||
        (targetStudent && act.description.toLowerCase().includes(targetStudent.name.toLowerCase()));
      const matchesSearch =
        !searchTerm.trim() ||
        act.description.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesStudent && matchesSearch;
    });
  }, [activities, selectedStudentId, searchTerm, students]);

  return (
    <div className="space-y-6 animate-fade-in pb-24 md:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {isAluno ? 'Meu Histórico de Treinos' : 'Histórico & Auditoria'}
          </h1>
          <p className="text-xs sm:text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
            {isAluno
              ? 'Acompanhe todas as sessões e séries concluídas por você'
              : 'Registro de sessões de treino e atividades de todos os alunos'}
          </p>
        </div>

        {/* Tab switcher */}
        <div
          className="w-full sm:w-auto grid grid-cols-2 sm:flex gap-1.5 p-1.5 rounded-2xl border"
          style={{
            background: 'var(--bg-tertiary)',
            borderColor: 'var(--border-color)',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('sessions')}
            className={`w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[44px] flex items-center justify-center text-center shadow-sm ${
              activeTab === 'sessions' ? 'text-white' : 'hover:bg-black/5 dark:hover:bg-white/5'
            }`}
            style={
              activeTab === 'sessions'
                ? { background: 'var(--accent)', color: '#ffffff' }
                : { color: 'var(--text-secondary)' }
            }
          >
            Treinos Realizados ({filteredSessions.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('activities')}
            className={`w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[44px] flex items-center justify-center text-center shadow-sm ${
              activeTab === 'activities' ? 'text-white' : 'hover:bg-black/5 dark:hover:bg-white/5'
            }`}
            style={
              activeTab === 'activities'
                ? { background: 'var(--accent)', color: '#ffffff' }
                : { color: 'var(--text-secondary)' }
            }
          >
            Log de Atividades ({filteredActivities.length})
          </button>
        </div>
      </div>

      {/* Filters Bar for Instructor/Admin */}
      <div
        className="p-4 rounded-3xl border space-y-3"
        style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
      >
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search
              className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: 'var(--text-tertiary)' }}
            />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Filtrar por nome do treino, descrição ou atividade..."
              className="w-full pr-4 py-3 rounded-2xl border text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/50 min-h-[46px]"
              style={{
                paddingLeft: '2.75rem',
                background: 'var(--bg-tertiary)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          {/* Student Selector Filter */}
          {!isAluno && (
            <div className="sm:w-72">
              <div className="relative">
                <Users
                  className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: 'var(--text-tertiary)' }}
                />
                <select
                  value={selectedStudentId}
                  onChange={e => setSelectedStudentId(e.target.value)}
                  className="w-full pr-4 py-3 rounded-2xl border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/50 min-h-[46px] cursor-pointer"
                  style={{
                    paddingLeft: '2.75rem',
                    background: 'var(--bg-tertiary)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <option value="all">Todos os Alunos ({students.length})</option>
                  {students.map(std => (
                    <option key={std.id} value={std.id}>
                      Aluno: {std.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div
              key={i}
              className="h-20 rounded-3xl bg-slate-500/10 animate-pulse border border-white/5"
            />
          ))}
        </div>
      ) : activeTab === 'sessions' ? (
        filteredSessions.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSessions.map((session, i) => {
              const minutes = Math.round(session.durationSeconds / 60);
              return (
                <div
                  key={session.id}
                  onClick={() => setSelectedSession(session)}
                  className="rounded-3xl p-5 border card-hover cursor-pointer animate-slide-up flex flex-col justify-between"
                  style={{
                    background: 'var(--card-bg)',
                    borderColor: 'var(--border-color)',
                    animationDelay: `${i * 0.03}s`,
                    animationFillMode: 'both',
                  }}
                >
                  <div>
                    <div className="flex items-start justify-between mb-2">
                      <h3
                        className="font-bold text-base line-clamp-1"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {session.workoutName}
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500">
                        Concluído
                      </span>
                    </div>

                    {!isAluno && (
                      <p
                        className="text-xs mb-3 font-semibold text-brand-500 flex items-center gap-1.5"
                      >
                        <span>👤</span> {getStudentName(session.studentId)}
                      </p>
                    )}

                    <div
                      className="grid grid-cols-3 gap-2 py-3 border-y text-center mt-2"
                      style={{ borderColor: 'var(--border-color)' }}
                    >
                      <div>
                        <p
                          className="text-[10px] font-semibold"
                          style={{ color: 'var(--text-tertiary)' }}
                        >
                          Duração
                        </p>
                        <p
                          className="text-xs font-bold mt-0.5 flex items-center justify-center gap-1"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          <Clock className="w-3 h-3 text-brand-500" />
                          {minutes} min
                        </p>
                      </div>
                      <div>
                        <p
                          className="text-[10px] font-semibold"
                          style={{ color: 'var(--text-tertiary)' }}
                        >
                          Volume
                        </p>
                        <p
                          className="text-xs font-bold mt-0.5"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {session.totalVolumeKg.toLocaleString()} kg
                        </p>
                      </div>
                      <div>
                        <p
                          className="text-[10px] font-semibold"
                          style={{ color: 'var(--text-tertiary)' }}
                        >
                          Séries
                        </p>
                        <p
                          className="text-xs font-bold mt-0.5 text-emerald-500"
                        >
                          {session.completedSetsCount}/{session.totalSetsCount}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-2">
                    <span
                      className="text-[11px]"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      {new Date(session.endedAt).toLocaleDateString('pt-BR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <span
                      className="text-xs font-bold flex items-center gap-1 transition-transform group-hover:translate-x-1"
                      style={{ color: 'var(--accent)' }}
                    >
                      Detalhes <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <HistoryIcon
              className="w-16 h-16 mx-auto mb-4"
              style={{ color: 'var(--text-tertiary)' }}
            />
            <p
              className="text-lg font-medium"
              style={{ color: 'var(--text-secondary)' }}
            >
              Nenhum treino realizado encontrado
            </p>
            <p
              className="text-sm mt-1"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {selectedStudentId !== 'all'
                ? 'Este aluno ainda não finalizou sessões de treino.'
                : 'Os treinos concluídos com carga e séries salvas aparecerão aqui.'}
            </p>
          </div>
        )
      ) : filteredActivities.length > 0 ? (
        <div
          className="rounded-3xl border overflow-hidden"
          style={{
            background: 'var(--card-bg)',
            borderColor: 'var(--border-color)',
          }}
        >
          <div
            className="divide-y"
            style={{ borderColor: 'var(--border-color)' }}
          >
            {filteredActivities.map((act, i) => {
              const cfg = typeConfig[act.type] || {
                icon: HistoryIcon,
                color: '#64748b',
                bg: 'rgba(100,116,139,0.1)',
              };
              const Icon = cfg.icon;

              return (
                <div
                  key={act.id}
                  className="flex items-center gap-4 p-4 hover:bg-black/5 dark:hover:bg-white/5 transition-colors animate-slide-up"
                  style={{
                    animationDelay: `${i * 0.02}s`,
                    animationFillMode: 'both',
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ background: cfg.bg, color: cfg.color }}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-bold"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {act.description}
                    </p>
                    <p
                      className="text-xs mt-0.5"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      {new Date(act.timestamp).toLocaleDateString('pt-BR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-16">
          <HistoryIcon
            className="w-16 h-16 mx-auto mb-4"
            style={{ color: 'var(--text-tertiary)' }}
          />
          <p
            className="text-lg font-medium"
            style={{ color: 'var(--text-secondary)' }}
          >
            Nenhuma atividade registrada
          </p>
        </div>
      )}

      {/* Session Details Modal */}
      {selectedSession && (
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in"
          onClick={() => setSelectedSession(null)}
        >
          <div
            className="w-full max-w-lg rounded-3xl p-5 sm:p-6 shadow-2xl border animate-scale-in max-h-[90vh] overflow-y-auto"
            style={{
              background: 'var(--card-bg)',
              borderColor: 'var(--border-color)',
            }}
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="flex items-start justify-between pb-3 mb-4 border-b"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <div>
                <h2
                  className="text-xl font-bold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {selectedSession.workoutName}
                </h2>
                <p
                  className="text-xs mt-0.5"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  Aluno: <span className="font-semibold text-brand-500">{getStudentName(selectedSession.studentId)}</span> •{' '}
                  {new Date(selectedSession.endedAt).toLocaleDateString(
                    'pt-BR',
                    {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    }
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSession(null)}
                className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                title="Fechar"
              >
                <X
                  className="w-5 h-5"
                  style={{ color: 'var(--text-tertiary)' }}
                />
              </button>
            </div>

            {/* Metrics cards */}
            <div className="grid grid-cols-3 gap-2.5 mb-5">
              <div
                className="p-3 rounded-2xl border text-center"
                style={{
                  background: 'var(--bg-tertiary)',
                  borderColor: 'var(--border-color)',
                }}
              >
                <Clock className="w-4 h-4 mx-auto mb-1 text-brand-500" />
                <p
                  className="text-[10px] font-bold"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  Duração
                </p>
                <p
                  className="text-xs font-black"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {Math.round(selectedSession.durationSeconds / 60)} min
                </p>
              </div>
              <div
                className="p-3 rounded-2xl border text-center"
                style={{
                  background: 'var(--bg-tertiary)',
                  borderColor: 'var(--border-color)',
                }}
              >
                <Flame className="w-4 h-4 mx-auto mb-1 text-amber-500" />
                <p
                  className="text-[10px] font-bold"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  Volume Total
                </p>
                <p
                  className="text-xs font-black"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {selectedSession.totalVolumeKg.toLocaleString()} kg
                </p>
              </div>
              <div
                className="p-3 rounded-2xl border text-center"
                style={{
                  background: 'var(--bg-tertiary)',
                  borderColor: 'var(--border-color)',
                }}
              >
                <Dumbbell className="w-4 h-4 mx-auto mb-1 text-indigo-500" />
                <p
                  className="text-[10px] font-bold"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  Séries
                </p>
                <p
                  className="text-xs font-black text-emerald-500"
                >
                  {selectedSession.completedSetsCount}/
                  {selectedSession.totalSetsCount}
                </p>
              </div>
            </div>

            {/* Exercises breakdown */}
            <div className="space-y-3 mb-4">
              <h3
                className="text-xs font-bold uppercase tracking-wider"
                style={{ color: 'var(--text-tertiary)' }}
              >
                Exercícios Realizados ({selectedSession.exercises.length})
              </h3>
              {selectedSession.exercises.map((ex, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl border space-y-2"
                  style={{
                    background: 'var(--bg-tertiary)',
                    borderColor: 'var(--border-color)',
                  }}
                >
                  <p
                    className="text-xs font-bold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {ex.exerciseName}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {ex.sets.map((set, sIdx) => (
                      <span
                        key={sIdx}
                        className={`text-[10px] px-2.5 py-1 rounded-xl font-bold border ${
                          set.completed
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            : 'bg-slate-500/10 border-slate-500/20 text-slate-400'
                        }`}
                      >
                        S{set.setNumber}: {set.repetitions} reps × {set.weight}
                        kg {set.completed ? '✓' : '✗'}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {selectedSession.notes && (
              <div
                className="p-3.5 rounded-2xl border text-xs leading-relaxed mb-4"
                style={{
                  background: 'var(--bg-tertiary)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-secondary)',
                }}
              >
                <strong className="block text-slate-300 mb-1">
                  Notas da Sessão:
                </strong>
                {selectedSession.notes}
              </div>
            )}

            {/* Share Post Button */}
            <div className="pt-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
              <button
                type="button"
                onClick={() => {
                  setSharingSession(selectedSession);
                }}
                className="w-full py-3 px-4 rounded-2xl text-xs font-bold text-white shadow-xl transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer min-h-[46px]"
                style={{ background: 'linear-gradient(135deg, #e1306c, #fd1d1d, #f56040)' }}
              >
                <Share2 className="w-4 h-4" />
                <span>Gerar Post / Compartilhar no Instagram</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Social Share Post Modal */}
      {sharingSession && (
        <WorkoutShareModal
          data={{
            workoutName: sharingSession.workoutName,
            studentName: getStudentName(sharingSession.studentId),
            durationFormatted: `${Math.round(sharingSession.durationSeconds / 60)} min`,
            totalVolumeKg: sharingSession.totalVolumeKg,
            completedSets: sharingSession.completedSetsCount,
            totalSets: sharingSession.totalSetsCount,
            exercisesCount: sharingSession.exercises.length,
            notes: sharingSession.notes,
          }}
          isOpen={!!sharingSession}
          onClose={() => setSharingSession(null)}
        />
      )}
    </div>
  );
}
