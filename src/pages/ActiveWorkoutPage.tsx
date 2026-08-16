import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Play,
  Pause,
  CheckCircle2,
  Circle,
  Timer,
  ChevronLeft,
  Flame,
  Award,
  Sparkles,
  Dumbbell,
  ArrowRight,
  Info,
  X,
  Square,
  Share2,
} from 'lucide-react';
import { useCallback } from 'react';
import { workoutService } from '../services/workoutService';
import { studentService } from '../services/studentService';
import { sessionService } from '../services/sessionService';
import { useExercises } from '../hooks/useExercises';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { RestTimerOverlay } from '../components/workout/RestTimerOverlay';
import { WorkoutShareModal } from '../components/workout/WorkoutShareModal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import type { Workout, Student, CompletedExercise, CompletedSet, NormalizedExercise } from '../types';

interface TrackedSet {
  setNumber: number;
  repetitions: number;
  weight: number;
  completed: boolean;
}

interface TrackedExercise {
  exerciseId: number | string;
  exerciseName: string;
  notes: string;
  sets: TrackedSet[];
}

export default function ActiveWorkoutPage() {
  const { workoutId } = useParams<{ workoutId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { getExerciseById } = useExercises();

  const [workout, setWorkout] = useState<Workout | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  // Workout Tracker State
  const [trackedExercises, setTrackedExercises] = useState<TrackedExercise[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(true);

  // Rest Timer State
  const [restTimerSeconds, setRestTimerSeconds] = useState<number | null>(null);
  const [restTimerKey, setRestTimerKey] = useState<number>(0);
  const [defaultRestDuration, setDefaultRestDuration] = useState(60);

  const handleCloseRestTimer = useCallback(() => {
    setRestTimerSeconds(null);
  }, []);

  // Exercise Preview Modal
  const [previewExercise, setPreviewExercise] = useState<NormalizedExercise | null>(null);

  // Modals & Confirmations
  const [finishModalOpen, setFinishModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [sessionNotes, setSessionNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // 1. Load Workout and Student
  useEffect(() => {
    let active = true;
    async function load() {
      if (!workoutId) return;
      try {
        const w = await workoutService.getById(workoutId);
        if (!w) {
          toast.error('Treino não encontrado.');
          navigate('/treinos');
          return;
        }

        let s: Student | null = null;
        if (w.studentId) {
          s = await studentService.getById(w.studentId);
        } else if (user) {
          s = await studentService.getByUserId(user.id);
        }

        if (active) {
          setWorkout(w);
          setStudent(s);

          // Initialize tracked exercises
          const initial: TrackedExercise[] = w.exercises.map(we => {
            const exInfo = getExerciseById(we.exerciseId);
            const sets: TrackedSet[] = Array.from({ length: we.sets }, (_, i) => ({
              setNumber: i + 1,
              repetitions: we.repetitions,
              weight: we.weight,
              completed: false,
            }));

            return {
              exerciseId: we.exerciseId,
              exerciseName: exInfo?.nome || `Exercício #${we.exerciseId}`,
              notes: we.notes,
              sets,
            };
          });

          setTrackedExercises(initial);
        }
      } catch {
        if (active) toast.error('Erro ao inicializar sessão de treino.');
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => { active = false; };
  }, [workoutId, getExerciseById, navigate, toast, user]);

  // 2. Elapsed Timer
  useEffect(() => {
    if (!isTimerRunning) return;
    const interval = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  // Format Elapsed Time
  const formattedElapsedTime = useMemo(() => {
    const hrs = Math.floor(elapsedSeconds / 3600);
    const mins = Math.floor((elapsedSeconds % 3600) / 60);
    const secs = elapsedSeconds % 60;
    if (hrs > 0) {
      return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, [elapsedSeconds]);

  // 3. Stats Calculations
  const stats = useMemo(() => {
    let totalSets = 0;
    let completedSets = 0;
    let totalVolumeKg = 0;

    trackedExercises.forEach(ex => {
      ex.sets.forEach(s => {
        totalSets++;
        if (s.completed) {
          completedSets++;
          totalVolumeKg += s.repetitions * s.weight;
        }
      });
    });

    const progressPercent = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;

    return {
      totalSets,
      completedSets,
      totalVolumeKg,
      progressPercent,
    };
  }, [trackedExercises]);

  // 4. Set interactions
  const handleToggleSet = (exIndex: number, setIndex: number) => {
    setTrackedExercises(prev => {
      const next = structuredClone(prev);
      const targetSet = next[exIndex].sets[setIndex];
      const nextCompleted = !targetSet.completed;
      targetSet.completed = nextCompleted;

      // Auto trigger rest timer if marked as completed
      if (nextCompleted) {
        setRestTimerKey(Date.now());
        setRestTimerSeconds(defaultRestDuration);
      }

      return next;
    });
  };

  const handleUpdateSetField = (
    exIndex: number,
    setIndex: number,
    field: 'repetitions' | 'weight',
    value: number
  ) => {
    setTrackedExercises(prev => {
      const next = structuredClone(prev);
      next[exIndex].sets[setIndex][field] = Math.max(0, value);
      return next;
    });
  };

  // 5. Complete Workout Submission
  const handleFinishWorkout = async () => {
    if (!workout || isSaving) return;
    setIsSaving(true);

    try {
      const completedExercisesData: CompletedExercise[] = trackedExercises.map(te => ({
        exerciseId: te.exerciseId,
        exerciseName: te.exerciseName,
        sets: te.sets.map((s): CompletedSet => ({
          setNumber: s.setNumber,
          repetitions: s.repetitions,
          weight: s.weight,
          completed: s.completed,
        })),
      }));

      const targetStudentId = workout.studentId || student?.id || user?.id || 'usr-aluno-001';

      await sessionService.create(
        {
          workoutId: workout.id,
          workoutName: workout.name,
          studentId: targetStudentId,
          startedAt: new Date(Date.now() - elapsedSeconds * 1000).toISOString(),
          endedAt: new Date().toISOString(),
          durationSeconds: elapsedSeconds,
          totalVolumeKg: stats.totalVolumeKg,
          completedSetsCount: stats.completedSets,
          totalSetsCount: stats.totalSets,
          exercises: completedExercisesData,
          notes: sessionNotes.trim() || undefined,
        },
        user?.id
      );

      toast.success('Parabéns! Treino finalizado e registrado com sucesso!', 'Treino Concluído');
      navigate('/meus-treinos');
    } catch {
      toast.error('Erro ao salvar sessão de treino.');
      setIsSaving(false);
    }
  };

  if (loading || !workout) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            Carregando seu treino...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-24">
      {/* Sticky Workout Tracker Header */}
      <div
        className="sticky top-0 z-30 w-full max-w-full box-border p-2 sm:p-3 rounded-2xl sm:rounded-3xl border shadow-md backdrop-blur-md flex items-center justify-between gap-2 transition-all"
        style={{
          background: 'var(--header-glass)',
          borderColor: 'var(--border-color)',
        }}
      >
        <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 flex-1">
          <button
            onClick={() => setCancelConfirmOpen(true)}
            className="p-1.5 sm:p-2 rounded-xl border hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer flex-shrink-0"
            style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
            title="Voltar"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-xs sm:text-base font-bold flex items-center gap-1.5 truncate" style={{ color: 'var(--text-primary)' }}>
              <span className="truncate">{workout.name}</span>
              {workout.muscleGroup && (
                <span className="hidden xs:inline-block text-[9px] sm:text-xs px-2 py-0.5 rounded-full font-semibold bg-brand-500/15 text-brand-500 flex-shrink-0">
                  {workout.muscleGroup}
                </span>
              )}
            </h1>
            {student && (
              <p className="text-[10px] sm:text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>
                Aluno: <span className="font-semibold">{student.name}</span>
              </p>
            )}
          </div>
        </div>

        {/* Live Timer and Finish Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {/* Timer Display */}
          <div
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl sm:rounded-2xl border font-mono font-bold text-xs sm:text-sm shadow-inner"
            style={{
              background: 'var(--bg-tertiary)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)',
            }}
          >
            <Timer className="w-3.5 h-3.5 text-brand-500 animate-pulse" />
            <span>{formattedElapsedTime}</span>
            <button
              onClick={() => setIsTimerRunning(!isTimerRunning)}
              className="p-0.5 sm:p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-xs transition-colors cursor-pointer"
              title={isTimerRunning ? 'Pausar Cronômetro' : 'Continuar Cronômetro'}
            >
              {isTimerRunning ? <Pause className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : <Play className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-500" />}
            </button>
          </div>

          {/* Finish Button */}
          <button
            type="button"
            onClick={() => setFinishModalOpen(true)}
            className="px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold text-white shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer min-h-[38px] sm:min-h-[42px] flex-shrink-0"
            style={{ background: 'var(--accent)' }}
            title="Finalizar e registrar treino"
          >
            <Square className="w-3.5 h-3.5 fill-white flex-shrink-0" />
            <span className="hidden sm:inline">Finalizar Treino</span>
            <span className="sm:hidden">Finalizar</span>
          </button>
        </div>
      </div>

      {/* Progress & Live Stats Bar */}
      <div
        className="rounded-3xl p-5 md:p-6 border shadow-sm space-y-4"
        style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
      >
        <div className="flex items-center justify-between text-xs md:text-sm font-semibold">
          <span className="flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Sparkles className="w-4 h-4 text-amber-400" />
            Progresso Geral: {stats.completedSets} de {stats.totalSets} séries concluídas
          </span>
          <span className="font-bold font-mono text-brand-500">
            {stats.progressPercent}%
          </span>
        </div>

        {/* Progress Bar Track */}
        <div className="w-full h-3 rounded-full overflow-hidden bg-slate-500/15">
          <div
            className="h-full gradient-brand rounded-full transition-all duration-500 ease-out"
            style={{ width: `${stats.progressPercent}%` }}
          />
        </div>

        {/* Stats Summary pills */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-3 rounded-2xl border" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)' }}>
            <p className="text-[11px] font-medium" style={{ color: 'var(--text-tertiary)' }}>Volume Total</p>
            <p className="text-base md:text-lg font-black mt-0.5 flex items-center gap-1" style={{ color: 'var(--text-primary)' }}>
              <Flame className="w-4 h-4 text-orange-500" />
              {stats.totalVolumeKg.toLocaleString('pt-BR')} <span className="text-xs font-normal">kg</span>
            </p>
          </div>

          <div className="p-3 rounded-2xl border" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)' }}>
            <p className="text-[11px] font-medium" style={{ color: 'var(--text-tertiary)' }}>Descanso Padrão</p>
            <div className="flex items-center gap-2 mt-1">
              {[45, 60, 90].map(s => (
                <button
                  key={s}
                  onClick={() => setDefaultRestDuration(s)}
                  className={`px-2 py-0.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    defaultRestDuration === s
                      ? 'bg-brand-500 text-white shadow-sm'
                      : 'border hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                  style={defaultRestDuration !== s ? { borderColor: 'var(--border-color)', color: 'var(--text-secondary)' } : {}}
                >
                  {s}s
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 rounded-2xl border col-span-2 sm:col-span-1" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)' }}>
            <p className="text-[11px] font-medium" style={{ color: 'var(--text-tertiary)' }}>Total Exercícios</p>
            <p className="text-base md:text-lg font-black mt-0.5 flex items-center gap-1" style={{ color: 'var(--text-primary)' }}>
              <Dumbbell className="w-4 h-4 text-indigo-500" />
              {trackedExercises.length}
            </p>
          </div>
        </div>
      </div>

      {/* Exercises Set Trackers List */}
      <div className="space-y-4">
        {trackedExercises.map((te, exIdx) => {
          const exInfo = getExerciseById(te.exerciseId);
          const allCompleted = te.sets.every(s => s.completed);

          return (
            <div
              key={te.exerciseId}
              className={`rounded-3xl border p-5 transition-all ${
                allCompleted ? 'border-emerald-500/30 bg-emerald-500/[0.02]' : ''
              }`}
              style={{
                background: 'var(--card-bg)',
                borderColor: allCompleted ? 'rgba(16, 185, 129, 0.35)' : 'var(--border-color)',
              }}
            >
              {/* Exercise Header */}
              <div className="flex items-start justify-between gap-4 pb-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
                <div className="flex items-start gap-3.5">
                  <div
                    className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                      allCompleted ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' : 'text-white'
                    }`}
                    style={{ background: allCompleted ? undefined : 'var(--accent)' }}
                  >
                    {allCompleted ? '✓' : exIdx + 1}
                  </div>

                  <div>
                    <h3 className="font-bold text-base md:text-lg" style={{ color: 'var(--text-primary)' }}>
                      {te.exerciseName}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      {exInfo && (
                        <span className="text-xs px-2.5 py-0.5 rounded-lg font-medium" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                          {exInfo.equipamento}
                        </span>
                      )}
                      {te.notes && (
                        <span className="text-xs italic" style={{ color: 'var(--text-tertiary)' }}>
                          📝 {te.notes}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {exInfo && (
                  <button
                    onClick={() => setPreviewExercise(exInfo)}
                    className="p-2 rounded-xl border hover:bg-black/5 dark:hover:bg-white/5 transition-all text-xs font-semibold flex items-center gap-1.5 cursor-pointer flex-shrink-0"
                    style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
                    title="Ver execução em GIF"
                  >
                    <Info className="w-4 h-4 text-brand-500" />
                    <span className="hidden sm:inline">Ver GIF</span>
                  </button>
                )}
              </div>

              {/* Sets Table */}
              <div className="mt-4 space-y-2">
                <div className="grid grid-cols-12 gap-2 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-center" style={{ color: 'var(--text-tertiary)' }}>
                  <div className="col-span-2 text-left">Série</div>
                  <div className="col-span-4">Reps</div>
                  <div className="col-span-4">Carga (kg)</div>
                  <div className="col-span-2 text-right">Feito</div>
                </div>

                {te.sets.map((set, setIdx) => (
                  <div
                    key={set.setNumber}
                    className={`grid grid-cols-12 gap-2 items-center p-2.5 rounded-2xl border transition-all ${
                      set.completed
                        ? 'bg-emerald-500/10 border-emerald-500/30'
                        : 'hover:border-slate-500/30'
                    }`}
                    style={
                      !set.completed
                        ? { background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)' }
                        : {}
                    }
                  >
                    {/* Set Number */}
                    <div className="col-span-2 text-sm font-bold pl-2" style={{ color: 'var(--text-primary)' }}>
                      #{set.setNumber}
                    </div>

                    {/* Repetitions Input */}
                    <div className="col-span-4 flex justify-center">
                      <input
                        type="number"
                        min="1"
                        value={set.repetitions}
                        onChange={e =>
                          handleUpdateSetField(exIdx, setIdx, 'repetitions', parseInt(e.target.value) || 0)
                        }
                        className="w-20 px-2 py-1.5 rounded-xl border text-center text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                        style={{
                          background: 'var(--card-bg)',
                          borderColor: 'var(--border-color)',
                          color: 'var(--text-primary)',
                        }}
                      />
                    </div>

                    {/* Weight (kg) Input */}
                    <div className="col-span-4 flex justify-center">
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={set.weight}
                        onChange={e =>
                          handleUpdateSetField(exIdx, setIdx, 'weight', parseFloat(e.target.value) || 0)
                        }
                        className="w-20 px-2 py-1.5 rounded-xl border text-center text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                        style={{
                          background: 'var(--card-bg)',
                          borderColor: 'var(--border-color)',
                          color: 'var(--text-primary)',
                        }}
                      />
                    </div>

                    {/* Completion Toggle */}
                    <div className="col-span-2 flex justify-end pr-1">
                      <button
                        onClick={() => handleToggleSet(exIdx, setIdx)}
                        className="p-1.5 rounded-xl transition-transform active:scale-90 cursor-pointer"
                        title={set.completed ? 'Desmarcar' : 'Concluir série'}
                      >
                        {set.completed ? (
                          <CheckCircle2 className="w-6 h-6 text-emerald-500 fill-emerald-500/20" />
                        ) : (
                          <Circle className="w-6 h-6 hover:text-brand-500" style={{ color: 'var(--text-tertiary)' }} />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Rest Timer Overlay when active */}
      {restTimerSeconds !== null && (
        <RestTimerOverlay
          key={restTimerKey}
          initialSeconds={restTimerSeconds}
          onFinish={handleCloseRestTimer}
          onClose={handleCloseRestTimer}
        />
      )}

      {/* Exercise Preview GIF Modal */}
      {previewExercise && (
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in"
          onClick={() => setPreviewExercise(null)}
        >
          <div
            className="w-full max-w-lg rounded-3xl p-5 sm:p-6 shadow-2xl border animate-scale-in max-h-[90vh] overflow-y-auto"
            style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {/* Modal Header */}
            <div
              className="flex items-center justify-between mb-4 pb-3 border-b"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <h3 className="font-bold text-base sm:text-lg" style={{ color: 'var(--text-primary)' }}>
                {previewExercise.nome}
              </h3>
              <button
                type="button"
                onClick={() => setPreviewExercise(null)}
                className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                title="Fechar"
              >
                <X className="w-5 h-5" style={{ color: 'var(--text-tertiary)' }} />
              </button>
            </div>

            {/* GIF Preview Box */}
            <div
              className="rounded-2xl overflow-hidden mb-4 h-64 bg-white dark:bg-slate-900 border p-3 flex items-center justify-center shadow-inner"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <img
                src={previewExercise.gif}
                alt={previewExercise.nome}
                className="max-h-full max-w-full object-contain rounded-xl"
                onError={e => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>

            {/* Muscle & Equipment Pills */}
            <div className="flex flex-wrap gap-2 mb-3">
              <div
                className="px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5"
                style={{
                  background: 'var(--bg-tertiary)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                }}
              >
                <span>🎯 Músculos:</span>
                <span className="font-bold">{previewExercise.musculos}</span>
              </div>

              <div
                className="px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5"
                style={{
                  background: 'var(--bg-tertiary)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                }}
              >
                <span>🔧 Equipamento:</span>
                <span className="font-bold">{previewExercise.equipamento}</span>
              </div>
            </div>

            {/* Description */}
            {previewExercise.descricao && (
              <p
                className="text-xs mt-3 p-3.5 rounded-2xl border leading-relaxed"
                style={{
                  background: 'var(--bg-tertiary)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-secondary)',
                }}
              >
                {previewExercise.descricao}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Finish Workout Summary Modal */}
      {finishModalOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => !isSaving && setFinishModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl p-6 shadow-2xl border animate-scale-in space-y-5"
            style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
            onClick={e => e.stopPropagation()}
            role="dialog"
          >
            {/* Header / Celebration Banner */}
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-3xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/10 animate-bounce">
                <Award className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>
                Finalizar Treino
              </h2>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                Confira o resumo da sua sessão e registre sua conquista!
              </p>
            </div>

            {/* Summary Metrics */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="p-3 rounded-2xl border text-center" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)' }}>
                <p className="text-[10px] uppercase font-bold" style={{ color: 'var(--text-tertiary)' }}>Duração</p>
                <p className="text-sm font-black mt-0.5" style={{ color: 'var(--text-primary)' }}>{formattedElapsedTime}</p>
              </div>

              <div className="p-3 rounded-2xl border text-center" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)' }}>
                <p className="text-[10px] uppercase font-bold" style={{ color: 'var(--text-tertiary)' }}>Séries</p>
                <p className="text-sm font-black mt-0.5" style={{ color: 'var(--text-primary)' }}>
                  {stats.completedSets}/{stats.totalSets}
                </p>
              </div>

              <div className="p-3 rounded-2xl border text-center" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)' }}>
                <p className="text-[10px] uppercase font-bold" style={{ color: 'var(--text-tertiary)' }}>Volume</p>
                <p className="text-sm font-black mt-0.5" style={{ color: 'var(--text-primary)' }}>
                  {stats.totalVolumeKg}kg
                </p>
              </div>
            </div>

            {/* Optional Notes */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>
                Observações da Sessão (Opcional)
              </label>
              <textarea
                value={sessionNotes}
                onChange={e => setSessionNotes(e.target.value)}
                placeholder="Como foi o treino? Registre suas cargas ou observações..."
                rows={3}
                className="w-full px-4 py-3 rounded-2xl border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/50 resize-none min-h-[80px]"
                style={{
                  background: 'var(--bg-tertiary)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            {/* Social Share Post Button */}
            <button
              type="button"
              onClick={() => setShareModalOpen(true)}
              className="w-full py-3 px-4 rounded-2xl text-xs font-bold text-white shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
              style={{ background: 'linear-gradient(135deg, #e1306c, #fd1d1d, #f56040)' }}
            >
              <Share2 className="w-4 h-4" />
              <span>Gerar Post / Compartilhar no Instagram</span>
            </button>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => setFinishModalOpen(false)}
                className="flex-1 py-3 rounded-2xl border text-xs font-bold hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer disabled:opacity-50 min-h-[46px]"
                style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
              >
                Voltar ao Treino
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleFinishWorkout}
                className="flex-1 py-3 rounded-2xl text-xs font-bold text-white shadow-xl shadow-brand-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 min-h-[46px]"
                style={{ background: 'var(--accent)' }}
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <span>Confirmar & Salvar</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Workout Share / Social Story Modal */}
      {workout && (
        <WorkoutShareModal
          data={{
            workoutName: workout.name,
            muscleGroup: workout.muscleGroup,
            studentName: student?.name || user?.name || 'Atleta',
            userAvatar: user?.avatar,
            durationFormatted: formattedElapsedTime,
            totalVolumeKg: stats.totalVolumeKg,
            completedSets: stats.completedSets,
            totalSets: stats.totalSets,
            exercisesCount: trackedExercises.length,
            notes: sessionNotes.trim() || undefined,
          }}
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
        />
      )}

      {/* Cancel Workout Confirmation */}
      <ConfirmDialog
        isOpen={cancelConfirmOpen}
        title="Cancelar Treino em Andamento?"
        message="Se você sair agora, os dados e repetições desta sessão não serão salvos no seu histórico."
        confirmLabel="Sim, Sair do Treino"
        cancelLabel="Continuar Treinando"
        variant="danger"
        onConfirm={() => navigate('/meus-treinos')}
        onCancel={() => setCancelConfirmOpen(false)}
      />
    </div>
  );
}
