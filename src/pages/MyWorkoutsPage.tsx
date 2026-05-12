import { useState, useMemo } from 'react';
import { Dumbbell, X } from 'lucide-react';
import { workoutService } from '../services/workoutService';
import { studentService } from '../services/studentService';
import { useAuth } from '../contexts/AuthContext';
import { useExercises } from '../hooks/useExercises';
import type { Workout, NormalizedExercise } from '../types';

export default function MyWorkoutsPage() {
  const { user } = useAuth();
  const { exercises } = useExercises();
  const [viewWorkout, setViewWorkout] = useState<Workout | null>(null);

  // Find the student record linked to this user
  const myStudent = useMemo(() => {
    if (!user) return null;
    return studentService.getByUserId(user.id) || null;
  }, [user]);

  const myWorkouts = useMemo(() => {
    if (!myStudent) return [];
    return workoutService.getByStudentId(myStudent.id);
  }, [myStudent]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Meus Treinos</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
          {myWorkouts.length} treino{myWorkouts.length !== 1 ? 's' : ''} atribuído{myWorkouts.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {myWorkouts.map((w, i) => (
          <div
            key={w.id}
            className="rounded-2xl p-5 border card-hover cursor-pointer animate-slide-up"
            style={{
              background: 'var(--card-bg)',
              borderColor: 'var(--border-color)',
              animationDelay: `${i * 0.05}s`,
              animationFillMode: 'both',
            }}
            onClick={() => setViewWorkout(w)}
          >
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{w.name}</h3>
              <span className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-brand-500/10 text-brand-500">
                {w.muscleGroup || 'Geral'}
              </span>
            </div>
            {w.description && (
              <p className="text-xs mb-3 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                {w.description}
              </p>
            )}
            <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
              <Dumbbell className="w-3.5 h-3.5" /> {w.exercises.length} exercícios
            </div>
          </div>
        ))}
      </div>

      {myWorkouts.length === 0 && (
        <div className="text-center py-16">
          <Dumbbell className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-tertiary)' }} />
          <p className="text-lg font-medium" style={{ color: 'var(--text-secondary)' }}>
            Nenhum treino atribuído
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
            Peça ao seu instrutor para criar um treino para você
          </p>
        </div>
      )}

      {viewWorkout && (
        <WorkoutViewModal workout={viewWorkout} exercises={exercises} onClose={() => setViewWorkout(null)} />
      )}
    </div>
  );
}

function WorkoutViewModal({ workout, exercises, onClose }: { workout: Workout; exercises: NormalizedExercise[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl p-6 shadow-2xl border animate-scale-in max-h-[90vh] overflow-y-auto" style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{workout.name}</h2>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{workout.muscleGroup}</p>
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
