import { useState, useMemo } from 'react';
import { Plus, X, Search, Dumbbell, Trash2 } from 'lucide-react';
import { workoutService } from '../services/workoutService';
import { studentService } from '../services/studentService';
import { activityService } from '../services/activityService';
import { useExercises } from '../hooks/useExercises';
import type { Workout, WorkoutExercise, NormalizedExercise, Student } from '../types';

export default function WorkoutsPage() {
  const [workouts, setWorkouts] = useState<Workout[]>(() => workoutService.getAll());
  const [showForm, setShowForm] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null);
  const [viewWorkout, setViewWorkout] = useState<Workout | null>(null);
  const students = useMemo(() => studentService.getAll(), []);
  const { exercises } = useExercises();

  const refresh = () => setWorkouts(workoutService.getAll());

  const handleDelete = (id: string) => {
    if (window.confirm('Excluir treino?')) { workoutService.delete(id); refresh(); }
  };

  const getStudentName = (id: string) => students.find(s => s.id === id)?.name || 'Desconhecido';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Treinos</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>{workouts.length} treinos criados</p>
        </div>
        <button onClick={() => { setEditingWorkout(null); setShowForm(true); }} className="flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-brand text-white text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-brand-500/25">
          <Plus className="w-4 h-4" /> Novo Treino
        </button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {workouts.map((w, i) => (
          <div key={w.id} className={`rounded-2xl p-5 border card-hover cursor-pointer animate-slide-up`} style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)', animationDelay: `${i * 0.05}s`, animationFillMode: 'both' }} onClick={() => setViewWorkout(w)}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{w.name}</h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>👤 {getStudentName(w.studentId)}</p>
              </div>
              <span className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-brand-500/10 text-brand-500">{w.muscleGroup || 'Geral'}</span>
            </div>
            {w.description && <p className="text-xs mb-3 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{w.description}</p>}
            <div className="flex items-center gap-2 text-xs mb-3" style={{ color: 'var(--text-tertiary)' }}>
              <Dumbbell className="w-3.5 h-3.5" /> {w.exercises.length} exercícios
            </div>
            <div className="flex gap-2 pt-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
              <button onClick={e => { e.stopPropagation(); setEditingWorkout(w); setShowForm(true); }} className="flex-1 py-2 rounded-lg text-xs font-medium transition-all" style={{ color: 'var(--accent)', background: 'var(--bg-tertiary)' }}>Editar</button>
              <button onClick={e => { e.stopPropagation(); handleDelete(w.id); }} className="py-2 px-3 rounded-lg text-xs font-medium text-red-400 hover:bg-red-500/10 transition-all" style={{ background: 'var(--bg-tertiary)' }}>✕</button>
            </div>
          </div>
        ))}
      </div>

      {workouts.length === 0 && (
        <div className="text-center py-16">
          <Dumbbell className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-tertiary)' }} />
          <p className="text-lg font-medium" style={{ color: 'var(--text-secondary)' }}>Nenhum treino criado</p>
        </div>
      )}

      {showForm && <WorkoutFormModal workout={editingWorkout} students={students} exercises={exercises} onClose={() => { setShowForm(false); setEditingWorkout(null); }} onSave={() => { refresh(); setShowForm(false); setEditingWorkout(null); }} />}

      {viewWorkout && <WorkoutViewModal workout={viewWorkout} exercises={exercises} studentName={getStudentName(viewWorkout.studentId)} onClose={() => setViewWorkout(null)} />}
    </div>
  );
}

function WorkoutFormModal({ workout, students, exercises, onClose, onSave }: { workout: Workout | null; students: Student[]; exercises: NormalizedExercise[]; onClose: () => void; onSave: () => void }) {
  const [name, setName] = useState(workout?.name || '');
  const [description, setDescription] = useState(workout?.description || '');
  const [studentId, setStudentId] = useState(workout?.studentId || students[0]?.id || '');
  const [muscleGroup, setMuscleGroup] = useState(workout?.muscleGroup || '');
  const [selectedExercises, setSelectedExercises] = useState<WorkoutExercise[]>(workout?.exercises || []);
  const [showExSelector, setShowExSelector] = useState(false);
  const [exSearch, setExSearch] = useState('');

  const filteredEx = useMemo(() => {
    if (!exSearch) return exercises.slice(0, 30);
    return exercises.filter(e => e.nome.toLowerCase().includes(exSearch.toLowerCase()) || e.musculos.toLowerCase().includes(exSearch.toLowerCase())).slice(0, 30);
  }, [exercises, exSearch]);

  const addExercise = (ex: NormalizedExercise) => {
    if (selectedExercises.find(se => se.exerciseId === ex.id)) return;
    setSelectedExercises([...selectedExercises, { exerciseId: ex.id, sets: 3, repetitions: 12, weight: 0, notes: '', order: selectedExercises.length + 1 }]);
    setShowExSelector(false);
    setExSearch('');
  };

  const removeExercise = (id: number) => setSelectedExercises(selectedExercises.filter(e => e.exerciseId !== id));

  const updateExercise = (id: number, field: keyof WorkoutExercise, value: string | number) => {
    setSelectedExercises(selectedExercises.map(e => e.exerciseId === id ? { ...e, [field]: value } : e));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = { name, description, studentId, muscleGroup, exercises: selectedExercises, instructorId: 'usr-inst-001' };
    if (workout) { workoutService.update(workout.id, data); }
    else { workoutService.create(data); activityService.log({ userId: 'usr-inst-001', type: 'workout_created', description: `Treino criado: ${name}` }); }
    onSave();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl p-6 shadow-2xl border animate-scale-in max-h-[90vh] overflow-y-auto" style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{workout ? 'Editar Treino' : 'Novo Treino'}</h2>
          <button onClick={onClose}><X className="w-5 h-5" style={{ color: 'var(--text-tertiary)' }} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Nome do treino</label>
              <input value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} required placeholder="Ex: Treino A - Superior" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Aluno</label>
              <select value={studentId} onChange={e => setStudentId(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
                {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Grupo Muscular</label>
              <input value={muscleGroup} onChange={e => setMuscleGroup(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} placeholder="Ex: Peito / Tríceps" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Descrição</label>
              <input value={description} onChange={e => setDescription(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} placeholder="Breve descrição" />
            </div>
          </div>

          {/* Exercises */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Exercícios ({selectedExercises.length})</label>
              <button type="button" onClick={() => setShowExSelector(!showExSelector)} className="text-xs font-medium px-3 py-1.5 rounded-lg transition-all" style={{ color: 'var(--accent)', background: 'rgba(16,185,129,0.1)' }}>
                + Adicionar exercício
              </button>
            </div>

            {showExSelector && (
              <div className="p-3 rounded-xl border mb-3 animate-scale-in" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)' }}>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
                  <input value={exSearch} onChange={e => setExSearch(e.target.value)} placeholder="Buscar exercício..." className="w-full pl-9 pr-3 py-2 rounded-lg border text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/50" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} autoFocus />
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {filteredEx.map(ex => (
                    <button key={ex.id} type="button" onClick={() => addExercise(ex)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left hover:bg-white/5 transition-colors" disabled={!!selectedExercises.find(se => se.exerciseId === ex.id)}>
                      <img src={ex.gif} className="w-8 h-8 rounded object-contain flex-shrink-0" style={{ background: 'var(--bg-secondary)' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
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
                const ex = exercises[se.exerciseId];
                return (
                  <div key={se.exerciseId} className="flex items-center gap-3 p-3 rounded-xl border" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)' }}>
                    <span className="text-xs font-bold w-5 text-center" style={{ color: 'var(--text-tertiary)' }}>{idx + 1}</span>
                    <img src={ex?.gif} className="w-10 h-10 rounded-lg object-contain flex-shrink-0" style={{ background: 'var(--bg-secondary)' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{ex?.nome || `#${se.exerciseId}`}</p>
                      <div className="flex gap-2 mt-1">
                        <input type="number" value={se.sets} onChange={e => updateExercise(se.exerciseId, 'sets', +e.target.value)} className="w-14 px-2 py-1 rounded-md border text-[10px] text-center focus:outline-none" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} placeholder="Séries" min={1} />
                        <span className="text-[10px] self-center" style={{ color: 'var(--text-tertiary)' }}>×</span>
                        <input type="number" value={se.repetitions} onChange={e => updateExercise(se.exerciseId, 'repetitions', +e.target.value)} className="w-14 px-2 py-1 rounded-md border text-[10px] text-center focus:outline-none" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} placeholder="Reps" min={1} />
                        <input type="number" value={se.weight} onChange={e => updateExercise(se.exerciseId, 'weight', +e.target.value)} className="w-16 px-2 py-1 rounded-md border text-[10px] text-center focus:outline-none" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} placeholder="Kg" step="0.5" />
                      </div>
                    </div>
                    <button type="button" onClick={() => removeExercise(se.exerciseId)}><Trash2 className="w-4 h-4 text-red-400" /></button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border text-sm font-medium" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>Cancelar</button>
            <button type="submit" className="flex-1 py-2.5 rounded-xl gradient-brand text-white text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-brand-500/25">{workout ? 'Salvar' : 'Criar Treino'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function WorkoutViewModal({ workout, exercises, studentName, onClose }: { workout: Workout; exercises: NormalizedExercise[]; studentName: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl p-6 shadow-2xl border animate-scale-in max-h-[90vh] overflow-y-auto" style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{workout.name}</h2>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>👤 {studentName} • {workout.muscleGroup}</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5" style={{ color: 'var(--text-tertiary)' }} /></button>
        </div>
        {workout.description && <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>{workout.description}</p>}
        <div className="space-y-3">
          {workout.exercises.map((we, idx) => {
            const ex = exercises[we.exerciseId];
            return (
              <div key={we.exerciseId} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--bg-tertiary)' }}>
                <span className="text-sm font-bold w-6 text-center" style={{ color: 'var(--accent)' }}>{idx + 1}</span>
                <img src={ex?.gif} className="w-14 h-14 rounded-xl object-contain flex-shrink-0" style={{ background: 'var(--bg-secondary)' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{ex?.nome}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{we.sets} séries × {we.repetitions} reps{we.weight > 0 ? ` • ${we.weight}kg` : ''}</p>
                  {we.notes && <p className="text-[10px] mt-0.5 italic" style={{ color: 'var(--text-tertiary)' }}>{we.notes}</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
