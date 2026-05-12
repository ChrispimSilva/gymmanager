import { v4 as uuidv4 } from 'uuid';
import type { Workout, WorkoutExercise } from '../types';

const STORAGE_KEY = 'gymmanager-workouts';

function getAll(): Workout[] {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

function save(workouts: Workout[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(workouts));
}

export const workoutService = {
  getAll(): Workout[] {
    return getAll();
  },

  getById(id: string): Workout | undefined {
    return getAll().find(w => w.id === id);
  },

  getByStudentId(studentId: string): Workout[] {
    return getAll().filter(w => w.studentId === studentId);
  },

  create(workout: Omit<Workout, 'id' | 'createdAt' | 'updatedAt'>): Workout {
    const workouts = getAll();
    const newWorkout: Workout = {
      ...workout,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    workouts.push(newWorkout);
    save(workouts);
    return newWorkout;
  },

  update(id: string, data: Partial<Workout>): Workout | null {
    const workouts = getAll();
    const index = workouts.findIndex(w => w.id === id);
    if (index === -1) return null;
    workouts[index] = {
      ...workouts[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    save(workouts);
    return workouts[index];
  },

  updateExercises(id: string, exercises: WorkoutExercise[]): Workout | null {
    return this.update(id, { exercises });
  },

  delete(id: string): boolean {
    const workouts = getAll();
    const filtered = workouts.filter(w => w.id !== id);
    if (filtered.length === workouts.length) return false;
    save(filtered);
    return true;
  },

  getTotalCount(): number {
    return getAll().length;
  },

  getByInstructorId(instructorId: string): Workout[] {
    return getAll().filter(w => w.instructorId === instructorId);
  },
};
