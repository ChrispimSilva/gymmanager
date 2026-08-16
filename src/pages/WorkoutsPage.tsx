import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X, Search, Dumbbell, Trash2, Printer, Play, UserCheck } from 'lucide-react';
import { workoutService } from '../services/workoutService';
import { studentService } from '../services/studentService';
import { activityService } from '../services/activityService';
import { useExercises } from '../hooks/useExercises';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { PrescribeWorkoutModal } from '../components/workout/PrescribeWorkoutModal';
import { printWorkoutSheet } from '../utils/printWorkout';
import type { Workout, WorkoutExercise, NormalizedExercise, Student } from '../types';

export default function WorkoutsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null);
  const [viewWorkout, setViewWorkout] = useState<Workout | null>(null);
  const [prescribingWorkout, setPrescribingWorkout] = useState<Workout | null>(null);

  // Confirm delete dialog state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [workoutToDelete, setWorkoutToDelete] = useState<Workout | null>(null);

  const { exercises, getExerciseById } = useExercises();

  const fetchWorkouts = useCallback(async () => {
    try {
      const [wList, sList] = await Promise.all([
        workoutService.getAll(),
        studentService.getAll(),
      ]);
      setWorkouts(wList);
      setStudents(sList);
    } catch {
      toast.error('Erro ao carregar lista de treinos.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [wList, sList] = await Promise.all([
          workoutService.getAll(),
          studentService.getAll(),
        ]);
        if (active) {
          setWorkouts(wList);
          setStudents(sList);
        }
      } catch {
        if (active) toast.error('Erro ao carregar lista de treinos.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [toast]);

  const refresh = async () => {
    await fetchWorkouts();
  };

  const handleOpenDelete = (w: Workout) => {
    setWorkoutToDelete(w);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!workoutToDelete) return;
    try {
      await workoutService.delete(workoutToDelete.id);
      toast.success(`Treino "${workoutToDelete.name}" excluído com sucesso!`, 'Treino excluído');
      await refresh();
    } catch {
      toast.error('Erro ao excluir treino.');
    } finally {
      setDeleteConfirmOpen(false);
      setWorkoutToDelete(null);
    }
  };

  const getStudentName = useCallback(
    (id?: string) => {
      if (!id) return 'Biblioteca da Academia / Comunidade';
      return students.find(s => s.id === id)?.name || 'Aluno';
    },
    [students]
  );

  const filteredWorkouts = useMemo(() => {
    if (!searchQuery.trim()) return workouts;
    const q = searchQuery.toLowerCase();
    return workouts.filter(w => {
      const sName = getStudentName(w.studentId).toLowerCase();
      return (
        w.name.toLowerCase().includes(q) ||
        (w.muscleGroup && w.muscleGroup.toLowerCase().includes(q)) ||
        sName.includes(q)
      );
    });
  }, [workouts, searchQuery, getStudentName]);

  return (
    <div className="space-y-6 animate-fade-in pb-24 md:pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Treinos & Prescrições</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>{workouts.length} treinos criados no sistema</p>
        </div>
        <button
          onClick={() => { setEditingWorkout(null); setShowForm(true); }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-brand text-white text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-brand-500/25 cursor-pointer min-h-[44px]"
        >
          <Plus className="w-4 h-4" /> Novo Treino
        </button>
      </div>

      {/* Workouts Search Bar */}
      <div className="relative">
        <Search
          className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: 'var(--text-tertiary)' }}
        />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Buscar treino por nome, aluno ou músculo..."
          className="w-full pr-4 py-3 rounded-2xl border text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/50 min-h-[46px]"
          style={{
            paddingLeft: '2.75rem',
            background: 'var(--bg-secondary)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-primary)',
          }}
        />
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className="rounded-2xl p-5 border animate-pulse h-44"
              style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
            />
          ))}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWorkouts.map((w, i) => (
            <div
              key={w.id}
              className={`rounded-2xl p-5 border card-hover cursor-pointer animate-slide-up flex flex-col justify-between`}
              style={{
                background: 'var(--card-bg)',
                borderColor: 'var(--border-color)',
                animationDelay: `${i * 0.05}s`,
                animationFillMode: 'both',
              }}
              onClick={() => setViewWorkout(w)}
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-sm line-clamp-1" style={{ color: 'var(--text-primary)' }}>{w.name}</h3>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                      👤 {getStudentName(w.studentId)}
                    </p>
                  </div>
                  <span className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-brand-500/10 text-brand-500 flex-shrink-0">
                    {w.muscleGroup || 'Geral'}
                  </span>
                </div>
                {w.description && (
                  <p className="text-xs mb-3 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                    {w.description}
                  </p>
                )}
                <div className="flex items-center gap-2 text-xs mb-3" style={{ color: 'var(--text-tertiary)' }}>
                  <Dumbbell className="w-3.5 h-3.5 text-brand-500" /> {w.exercises.length} exercícios configurados
                </div>
              </div>

              {/* Card Bottom Actions */}
              <div className="flex items-center gap-2 pt-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    setPrescribingWorkout(w);
                  }}
                  className="flex-1 py-2 px-2.5 rounded-xl text-xs font-bold transition-all bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 flex items-center justify-center gap-1 cursor-pointer"
                  title="Prescrever para Aluno(s)"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Prescrever</span>
                </button>

                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); setEditingWorkout(w); setShowForm(true); }}
                  className="py-2 px-3 rounded-xl text-xs font-medium transition-all hover:bg-brand-500/10 cursor-pointer"
                  style={{ color: 'var(--accent)', background: 'var(--bg-tertiary)' }}
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); handleOpenDelete(w); }}
                  className="py-2 px-3 rounded-xl text-xs font-medium text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                  style={{ background: 'var(--bg-tertiary)' }}
                  title="Excluir Treino"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && workouts.length === 0 && (
        <div className="text-center py-16">
          <Dumbbell className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-tertiary)' }} />
          <p className="text-lg font-medium" style={{ color: 'var(--text-secondary)' }}>Nenhum treino criado</p>
        </div>
      )}

      {showForm && (
        <WorkoutFormModal
          workout={editingWorkout}
          students={students}
          exercises={exercises}
          onClose={() => { setShowForm(false); setEditingWorkout(null); }}
          onSave={async () => { await refresh(); setShowForm(false); setEditingWorkout(null); }}
        />
      )}

      {viewWorkout && (
        <WorkoutViewModal
          workout={viewWorkout}
          exercises={exercises}
          studentName={getStudentName(viewWorkout.studentId)}
          canExecute={user?.role !== 'admin'}
          onPrescribe={() => {
            const w = viewWorkout;
            setViewWorkout(null);
            setPrescribingWorkout(w);
          }}
          onPrint={() => {
            const studentObj = students.find(s => s.id === viewWorkout.studentId) || null;
            printWorkoutSheet(viewWorkout, studentObj, getExerciseById);
          }}
          onStart={() => {
            const id = viewWorkout.id;
            setViewWorkout(null);
            navigate(`/treino-ativo/${id}`);
          }}
          onClose={() => setViewWorkout(null)}
        />
      )}

      {/* Prescribe Workout Modal */}
      <PrescribeWorkoutModal
        workout={prescribingWorkout}
        isOpen={!!prescribingWorkout}
        onClose={() => setPrescribingWorkout(null)}
        onSuccess={() => void refresh()}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        title="Excluir Treino"
        message={`Tem certeza que deseja excluir o treino "${workoutToDelete?.name}"?`}
        confirmLabel="Sim, Excluir"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => { setDeleteConfirmOpen(false); setWorkoutToDelete(null); }}
      />
    </div>
  );
}

function WorkoutFormModal({
  workout,
  students,
  exercises,
  onClose,
  onSave,
}: {
  workout: Workout | null;
  students: Student[];
  exercises: NormalizedExercise[];
  onClose: () => void;
  onSave: () => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState(workout?.name || '');
  const [description, setDescription] = useState(workout?.description || '');
  const [studentId, setStudentId] = useState(workout?.studentId || '');
  const [muscleGroup, setMuscleGroup] = useState(workout?.muscleGroup || '');
  const [selectedExercises, setSelectedExercises] = useState<WorkoutExercise[]>(workout?.exercises || []);
  const [showExSelector, setShowExSelector] = useState(false);
  const [exSearch, setExSearch] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const filteredEx = useMemo(() => {
    if (!exSearch) return exercises.slice(0, 30);
    return exercises
      .filter(e => e.nome.toLowerCase().includes(exSearch.toLowerCase()) || e.musculos.toLowerCase().includes(exSearch.toLowerCase()))
      .slice(0, 30);
  }, [exercises, exSearch]);

  const addExercise = (ex: NormalizedExercise) => {
    if (selectedExercises.find(se => se.exerciseId === ex.id)) return;
    setSelectedExercises([
      ...selectedExercises,
      { exerciseId: ex.id, sets: 3, repetitions: 12, weight: 0, notes: '', order: selectedExercises.length + 1 },
    ]);
    setShowExSelector(false);
    setExSearch('');
  };

  const removeExercise = (id: number | string) => setSelectedExercises(selectedExercises.filter(e => e.exerciseId !== id));

  const updateExercise = (id: number | string, field: keyof WorkoutExercise, value: string | number) => {
    setSelectedExercises(selectedExercises.map(e => e.exerciseId === id ? { ...e, [field]: value } : e));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Informe o nome do treino.');
      return;
    }

    setSaving(true);
    try {
      const data = {
        name,
        description,
        studentId: studentId || undefined,
        muscleGroup,
        isCommunity: !studentId,
        exercises: selectedExercises,
        instructorId: 'usr-inst-001',
      };

      if (workout) {
        await workoutService.update(workout.id, data);
        toast.success(`Treino "${name}" atualizado com sucesso!`, 'Treino atualizado');
      } else {
        await workoutService.create(data);
        await activityService.log({
          userId: 'usr-inst-001',
          type: 'workout_created',
          description: `Treino criado: ${name}`,
        });
        toast.success(`Treino "${name}" cadastrado com sucesso!`, 'Treino criado');
      }
      onSave();
    } catch {
      toast.error('Erro ao salvar o treino.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-3xl p-5 sm:p-6 shadow-2xl border animate-scale-in max-h-[90vh] overflow-y-auto"
        style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between pb-3 mb-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <h2 className="text-lg sm:text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {workout ? 'Editar Treino' : 'Novo Treino'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer">
            <X className="w-5 h-5" style={{ color: 'var(--text-tertiary)' }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>Nome do treino *</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/50 min-h-[46px]"
                style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                required
                placeholder="Ex: Treino A - Superior"
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                Vincular a Aluno <span className="text-[10px] font-normal text-slate-400">(opcional)</span>
              </label>
              <select
                value={studentId}
                onChange={e => setStudentId(e.target.value)}
                className="w-full px-3 py-3 rounded-2xl border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/50 min-h-[46px] cursor-pointer"
                style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
              >
                <option value="">Biblioteca da Academia / Comunidade (Geral)</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>
                    Aluno: {s.name} ({s.goal})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>Grupo Muscular</label>
              <input
                value={muscleGroup}
                onChange={e => setMuscleGroup(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/50 min-h-[46px]"
                style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                placeholder="Ex: Peito / Tríceps"
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>Descrição / Observações</label>
              <input
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border text-sm font-medium focus:outline-none min-h-[46px]"
                style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                placeholder="Ex: Foco em hipertrofia e tempo sob tensão"
              />
            </div>
          </div>

          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                Exercícios ({selectedExercises.length})
              </label>
              <button
                type="button"
                onClick={() => setShowExSelector(!showExSelector)}
                className="text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                style={{ color: 'var(--accent)', background: 'rgba(16,185,129,0.1)' }}
              >
                + Adicionar exercício
              </button>
            </div>

            {showExSelector && (
              <div
                className="p-3 rounded-2xl border mb-3 animate-scale-in"
                style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)' }}
              >
                <div className="relative mb-2">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                    style={{ color: 'var(--text-tertiary)' }}
                  />
                  <input
                    value={exSearch}
                    onChange={e => setExSearch(e.target.value)}
                    placeholder="Buscar exercício por nome ou músculo..."
                    className="w-full pr-3 py-2.5 rounded-xl border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/50 min-h-[40px]"
                    style={{
                      paddingLeft: '2.5rem',
                      background: 'var(--bg-secondary)',
                      borderColor: 'var(--border-color)',
                      color: 'var(--text-primary)',
                    }}
                    autoFocus
                  />
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {filteredEx.map(ex => (
                    <button
                      key={ex.id}
                      type="button"
                      onClick={() => addExercise(ex)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                      disabled={!!selectedExercises.find(se => se.exerciseId === ex.id)}
                    >
                      <img
                        src={ex.gif}
                        alt=""
                        className="w-8 h-8 rounded-lg object-contain flex-shrink-0 bg-slate-900 border"
                        style={{ borderColor: 'var(--border-color)' }}
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{ex.nome}</p>
                        <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{ex.musculos}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              {selectedExercises.map((se, idx) => {
                const ex = exercises.find(e => e.id === se.exerciseId);
                return (
                  <div
                    key={se.exerciseId}
                    className="flex items-center gap-3 p-3 rounded-2xl border"
                    style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)' }}
                  >
                    <span className="text-xs font-bold w-5 text-center" style={{ color: 'var(--text-tertiary)' }}>{idx + 1}</span>
                    <img
                      src={ex?.gif}
                      alt=""
                      className="w-10 h-10 rounded-xl object-contain flex-shrink-0 bg-slate-900 border p-0.5"
                      style={{ borderColor: 'var(--border-color)' }}
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{ex?.nome || `#${se.exerciseId}`}</p>
                      <div className="flex gap-2 mt-1">
                        <input
                          type="number"
                          value={se.sets}
                          onChange={e => updateExercise(se.exerciseId, 'sets', +e.target.value)}
                          className="w-14 px-2 py-1 rounded-lg border text-[10px] text-center focus:outline-none"
                          style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                          placeholder="Séries"
                          min={1}
                        />
                        <span className="text-[10px] self-center" style={{ color: 'var(--text-tertiary)' }}>×</span>
                        <input
                          type="number"
                          value={se.repetitions}
                          onChange={e => updateExercise(se.exerciseId, 'repetitions', +e.target.value)}
                          className="w-14 px-2 py-1 rounded-lg border text-[10px] text-center focus:outline-none"
                          style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                          placeholder="Reps"
                          min={1}
                        />
                        <input
                          type="number"
                          value={se.weight}
                          onChange={e => updateExercise(se.exerciseId, 'weight', +e.target.value)}
                          className="w-16 px-2 py-1 rounded-lg border text-[10px] text-center focus:outline-none"
                          style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                          placeholder="Kg"
                          step="0.5"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeExercise(se.exerciseId)}
                      className="p-1 text-red-400 hover:text-red-300 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl border text-sm font-bold cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 min-h-[46px]"
              style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 rounded-2xl gradient-brand text-white text-sm font-bold hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-brand-500/25 cursor-pointer disabled:opacity-50 min-h-[46px]"
            >
              {saving ? 'Salvando...' : workout ? 'Salvar' : 'Criar Treino'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function WorkoutViewModal({
  workout,
  exercises,
  studentName,
  canExecute = true,
  onPrescribe,
  onPrint,
  onStart,
  onClose,
}: {
  workout: Workout;
  exercises: NormalizedExercise[];
  studentName: string;
  canExecute?: boolean;
  onPrescribe: () => void;
  onPrint: () => void;
  onStart: () => void;
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
            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{workout.name}</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
              Vínculo: <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>{studentName}</span>
              {workout.muscleGroup && ` • ${workout.muscleGroup}`}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer">
            <X className="w-5 h-5" style={{ color: 'var(--text-tertiary)' }} />
          </button>
        </div>

        {workout.description && (
          <p className="text-xs mb-4 p-3.5 rounded-2xl border leading-relaxed" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
            {workout.description}
          </p>
        )}

        <div className="space-y-2 mb-6">
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
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
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>{ex?.nome || `Exercício #${we.exerciseId}`}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                    {we.sets} séries × {we.repetitions} reps{we.weight > 0 ? ` • ${we.weight}kg` : ''}
                  </p>
                  {we.notes && <p className="text-[10px] mt-0.5 italic" style={{ color: 'var(--text-tertiary)' }}>{we.notes}</p>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Bottom Actions */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
          <button
            type="button"
            onClick={onPrescribe}
            className="flex-1 py-3 rounded-2xl border text-xs font-bold text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/10 transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[46px]"
          >
            <UserCheck className="w-4 h-4" />
            Prescrever
          </button>
          <button
            type="button"
            onClick={onPrint}
            className="flex-1 py-3 rounded-2xl border text-xs font-bold hover:bg-black/5 dark:hover:bg-white/5 transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[46px]"
            style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
          >
            <Printer className="w-4 h-4" />
            PDF
          </button>
          {canExecute && (
            <button
              type="button"
              onClick={onStart}
              className="flex-1 py-3 rounded-2xl text-xs font-bold text-white shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer min-h-[46px]"
              style={{ background: 'var(--accent)' }}
            >
              <Play className="w-4 h-4 fill-white" />
              Iniciar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
