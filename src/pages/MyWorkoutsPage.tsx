import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dumbbell,
  X,
  Play,
  Printer,
  Flame,
  Sparkles,
  Plus,
  Copy,
  Users,
  Search,
} from 'lucide-react';
import { workoutService } from '../services/workoutService';
import { studentService } from '../services/studentService';
import { sessionService } from '../services/sessionService';
import { useAuth } from '../contexts/AuthContext';
import { useExercises } from '../hooks/useExercises';
import { useToast } from '../contexts/ToastContext';
import { printWorkoutSheet } from '../utils/printWorkout';
import { StudentWorkoutModal } from '../components/workout/StudentWorkoutModal';
import type { Workout, Student, NormalizedExercise } from '../types';

export default function MyWorkoutsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { exercises, getExerciseById } = useExercises();

  const [activeTab, setActiveTab] = useState<'my' | 'community'>('my');
  const [myWorkouts, setMyWorkouts] = useState<Workout[]>([]);
  const [communityWorkouts, setCommunityWorkouts] = useState<Workout[]>([]);
  const [student, setStudent] = useState<Student | null>(null);
  const [streakDays, setStreakDays] = useState(0);
  const [loading, setLoading] = useState(true);
  const [viewWorkout, setViewWorkout] = useState<Workout | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const myStudent = await studentService.getByUserId(user.id);
      const commWorkouts = await workoutService.getCommunityWorkouts();
      setCommunityWorkouts(commWorkouts);

      if (myStudent) {
        const [workouts, streak] = await Promise.all([
          workoutService.getByStudentId(myStudent.id),
          sessionService.getStreakDays(myStudent.id),
        ]);
        setStudent(myStudent);
        setMyWorkouts(workouts);
        setStreakDays(streak);
      } else {
        setStudent(null);
        setMyWorkouts([]);
        setStreakDays(0);
      }
    } catch {
      toast.error('Erro ao carregar treinos.');
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    let active = true;
    async function fetchData() {
      if (!user) {
        if (active) setLoading(false);
        return;
      }
      try {
        const myStudent = await studentService.getByUserId(user.id);
        const commWorkouts = await workoutService.getCommunityWorkouts();
        if (active) setCommunityWorkouts(commWorkouts);

        if (myStudent) {
          const [workouts, streak] = await Promise.all([
            workoutService.getByStudentId(myStudent.id),
            sessionService.getStreakDays(myStudent.id),
          ]);
          if (active) {
            setStudent(myStudent);
            setMyWorkouts(workouts);
            setStreakDays(streak);
          }
        } else {
          if (active) {
            setStudent(null);
            setMyWorkouts([]);
            setStreakDays(0);
          }
        }
      } catch {
        if (active) toast.error('Erro ao carregar treinos.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void fetchData();
    return () => {
      active = false;
    };
  }, [user, toast]);

  const handleCopyCommunityWorkout = async (w: Workout) => {
    if (!student) {
      toast.error('Perfil de aluno não encontrado para copiar treino.');
      return;
    }
    try {
      const cloned = await workoutService.cloneWorkout(
        w.id,
        student.id,
        `${w.name} (Meu)`
      );
      if (cloned) {
        toast.success(`Treino "${w.name}" copiado para seus treinos pessoais!`, 'Treino Adotado');
        await loadData();
        setActiveTab('my');
      }
    } catch {
      toast.error('Erro ao copiar treino da comunidade.');
    }
  };

  const displayedList = (activeTab === 'my' ? myWorkouts : communityWorkouts).filter(w => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      w.name.toLowerCase().includes(q) ||
      (w.muscleGroup && w.muscleGroup.toLowerCase().includes(q)) ||
      (w.description && w.description.toLowerCase().includes(q))
    );
  });

  const firstWorkout = myWorkouts[0];

  return (
    <div className="space-y-6 animate-fade-in pb-24 md:pb-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Treinos & Rotinas
          </h1>
          <p className="text-xs sm:text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
            {activeTab === 'my'
              ? `${myWorkouts.length} treino(s) na sua ficha pessoal`
              : `${communityWorkouts.length} treino(s) disponíveis na comunidade da academia`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {streakDays > 0 && (
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-2xl border animate-bounce"
              style={{
                background: 'rgba(249, 115, 22, 0.1)',
                borderColor: 'rgba(249, 115, 22, 0.3)',
                color: '#f97316',
              }}
            >
              <Flame className="w-5 h-5 fill-orange-500" />
              <span className="text-xs font-black">
                {streakDays} {streakDays === 1 ? 'dia de foco!' : 'dias seguidos!'}
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl text-white text-xs font-bold shadow-lg transition-all hover:scale-105 active:scale-95 cursor-pointer min-h-[46px]"
            style={{ background: 'var(--accent)' }}
          >
            <Plus className="w-4 h-4" />
            Criar Meu Treino
          </button>
        </div>
      </div>

      {/* Featured Today's Workout Quick CTA Banner */}
      {!loading && firstWorkout && activeTab === 'my' && (
        <div
          className="rounded-3xl p-5 sm:p-6 text-white relative overflow-hidden shadow-2xl transition-all"
          style={{
            background: 'var(--brand-gradient, linear-gradient(135deg, var(--accent), #059669))',
            boxShadow: '0 20px 40px -15px var(--accent)',
          }}
        >
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1 text-xs font-bold uppercase tracking-wider text-white/90">
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Pronto para o treino de hoje?</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black">{firstWorkout.name}</h2>
              <p className="text-xs sm:text-sm text-white/80 mt-0.5">
                {firstWorkout.muscleGroup} • {firstWorkout.exercises.length} exercícios
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate(`/treino-ativo/${firstWorkout.id}`)}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-white font-black text-sm shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2.5 cursor-pointer min-h-[50px] group"
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
          </div>
        </div>
      )}

      {/* Tab Switcher & Search Bar */}
      <div className="space-y-3">
        <div
          className="grid grid-cols-2 p-1.5 rounded-2xl border max-w-md"
          style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)' }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('my')}
            className={`py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'my'
                ? 'bg-white dark:bg-slate-800 shadow-sm text-brand-500'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Dumbbell className="w-4 h-4" />
            Meus Treinos ({myWorkouts.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('community')}
            className={`py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'community'
                ? 'bg-white dark:bg-slate-800 shadow-sm text-brand-500'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            Comunidade ({communityWorkouts.length})
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search
            className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--text-tertiary)' }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={
              activeTab === 'my'
                ? 'Buscar em meus treinos por nome ou músculo...'
                : 'Explorar treinos da comunidade da academia...'
            }
            className="w-full pr-4 py-3 rounded-2xl border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/50 min-h-[46px]"
            style={{
              paddingLeft: '2.75rem',
              background: 'var(--bg-secondary)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)',
            }}
          />
        </div>
      </div>

      {/* Workouts Grid */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className="rounded-3xl p-5 border animate-pulse h-48"
              style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
            />
          ))}
        </div>
      ) : displayedList.length === 0 ? (
        <div className="text-center py-16">
          <Dumbbell className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-tertiary)' }} />
          <p className="text-lg font-medium" style={{ color: 'var(--text-secondary)' }}>
            {activeTab === 'my'
              ? 'Você ainda não possui treinos cadastrados.'
              : 'Nenhum treino encontrado na comunidade.'}
          </p>
          <p className="text-sm mt-1 mb-4" style={{ color: 'var(--text-tertiary)' }}>
            {activeTab === 'my'
              ? 'Crie seu treino personalizado ou adote um da aba Comunidade!'
              : 'Novos treinos criados pelos instrutores aparecerão aqui.'}
          </p>
          {activeTab === 'my' && (
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold text-white shadow-lg cursor-pointer"
              style={{ background: 'var(--accent)' }}
            >
              <Plus className="w-4 h-4" /> Criar Meu Primeiro Treino
            </button>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedList.map((w, i) => {
            const isMyWorkout = w.studentId === student?.id;
            return (
              <div
                key={w.id}
                className="rounded-3xl p-5 border card-hover flex flex-col justify-between animate-slide-up"
                style={{
                  background: 'var(--card-bg)',
                  borderColor: 'var(--border-color)',
                  animationDelay: `${i * 0.05}s`,
                  animationFillMode: 'both',
                }}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="font-bold text-base line-clamp-1" style={{ color: 'var(--text-primary)' }}>
                      {w.name}
                    </h3>
                    <span
                      className="px-2.5 py-1 rounded-xl text-[10px] font-bold flex-shrink-0"
                      style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent)' }}
                    >
                      {w.muscleGroup || 'Geral'}
                    </span>
                  </div>

                  {w.description && (
                    <p
                      className="text-xs mb-4 line-clamp-2 leading-relaxed"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {w.description}
                    </p>
                  )}

                  <div
                    className="flex items-center gap-2 text-xs mb-4"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    <Dumbbell className="w-4 h-4" style={{ color: 'var(--accent)' }} />{' '}
                    {w.exercises.length} exercícios configurados
                  </div>
                </div>

                {/* Action Buttons */}
                <div
                  className="flex flex-wrap items-center gap-2 pt-3 border-t"
                  style={{ borderColor: 'var(--border-color)' }}
                >
                  <button
                    type="button"
                    onClick={() => setViewWorkout(w)}
                    className="flex-1 py-3 rounded-2xl border text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition-all text-center cursor-pointer min-h-[46px]"
                    style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                  >
                    Ver Ficha
                  </button>

                  {!isMyWorkout && (
                    <button
                      type="button"
                      onClick={() => handleCopyCommunityWorkout(w)}
                      className="py-3 px-3.5 rounded-2xl border text-xs font-bold text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/10 transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[46px]"
                      title="Copiar para Meus Treinos"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Copiar</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => navigate(`/treino-ativo/${w.id}`)}
                    className="flex-1 py-3 rounded-2xl text-xs font-bold text-white shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer min-h-[46px]"
                    style={{ background: 'var(--accent)' }}
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    Iniciar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* View Workout Details Modal */}
      {viewWorkout && (
        <WorkoutViewModal
          workout={viewWorkout}
          student={student}
          exercises={exercises}
          onStartWorkout={() => {
            const id = viewWorkout.id;
            setViewWorkout(null);
            navigate(`/treino-ativo/${id}`);
          }}
          onPrint={() => printWorkoutSheet(viewWorkout, student, getExerciseById)}
          onClose={() => setViewWorkout(null)}
        />
      )}

      {/* Student Workout Creator Modal */}
      <StudentWorkoutModal
        student={student}
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          void loadData();
          setActiveTab('my');
        }}
      />
    </div>
  );
}

function WorkoutViewModal({
  workout,
  student,
  exercises,
  onStartWorkout,
  onPrint,
  onClose,
}: {
  workout: Workout;
  student: Student | null;
  exercises: NormalizedExercise[];
  onStartWorkout: () => void;
  onPrint: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl p-5 sm:p-6 shadow-2xl border animate-scale-in max-h-[90vh] overflow-y-auto"
        style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
        onClick={e => e.stopPropagation()}
        role="dialog"
      >
        <div className="flex items-start justify-between mb-4 pb-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <div>
            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {workout.name}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
              {workout.muscleGroup} • {student?.name || 'Comunidade'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
          >
            <X className="w-5 h-5" style={{ color: 'var(--text-tertiary)' }} />
          </button>
        </div>

        {workout.description && (
          <p
            className="text-xs mb-4 p-3 rounded-2xl border leading-relaxed"
            style={{
              background: 'var(--bg-tertiary)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-secondary)',
            }}
          >
            {workout.description}
          </p>
        )}

        {/* Exercises list */}
        <div className="space-y-2 mb-6">
          <p
            className="text-xs font-bold uppercase tracking-wider"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Exercícios ({workout.exercises.length})
          </p>
          {workout.exercises.map((we, idx) => {
            const ex = exercises.find(e => e.id === we.exerciseId);
            return (
              <div
                key={idx}
                className="flex items-center gap-3 p-3 rounded-2xl border"
                style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)' }}
              >
                <img
                  src={ex?.gif}
                  alt=""
                  className="w-14 h-14 rounded-2xl object-contain flex-shrink-0 bg-slate-900 border p-1"
                  style={{ borderColor: 'var(--border-color)' }}
                  onError={e => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-bold truncate"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {ex?.nome || `Exercício #${we.exerciseId}`}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                    {we.sets} séries × {we.repetitions} reps
                    {we.weight > 0 ? ` • ${we.weight}kg` : ''}
                  </p>
                  {we.notes && (
                    <p className="text-[10px] mt-0.5 italic" style={{ color: 'var(--text-tertiary)' }}>
                      {we.notes}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Bottom Actions */}
        <div
          className="flex flex-wrap items-center gap-3 pt-3 border-t"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <button
            type="button"
            onClick={onPrint}
            className="flex-1 py-3 rounded-2xl border text-xs font-bold hover:bg-black/5 dark:hover:bg-white/5 transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[46px]"
            style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
          >
            <Printer className="w-4 h-4" />
            Imprimir Ficha (PDF)
          </button>
          <button
            type="button"
            onClick={onStartWorkout}
            className="flex-1 py-3 rounded-2xl text-xs font-bold text-white shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer min-h-[46px]"
            style={{ background: 'var(--accent)' }}
          >
            <Play className="w-4 h-4 fill-white" />
            Iniciar Treino
          </button>
        </div>
      </div>
    </div>
  );
}
