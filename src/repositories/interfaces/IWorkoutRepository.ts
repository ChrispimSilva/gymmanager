import type { Workout, WorkoutExercise } from '../../types';

export interface IWorkoutRepository {
  getAll(): Promise<Workout[]>;
  getById(id: string): Promise<Workout | null>;
  getByStudentId(studentId: string): Promise<Workout[]>;
  getByInstructorId(instructorId: string): Promise<Workout[]>;
  getCommunityWorkouts(): Promise<Workout[]>;
  cloneWorkout(workoutId: string, targetStudentId?: string, newName?: string): Promise<Workout | null>;
  create(workout: Omit<Workout, 'id' | 'createdAt' | 'updatedAt'>): Promise<Workout>;
  update(id: string, data: Partial<Workout>): Promise<Workout | null>;
  updateExercises(id: string, exercises: WorkoutExercise[]): Promise<Workout | null>;
  delete(id: string): Promise<boolean>;
  deleteByStudentId(studentId: string): Promise<number>;
  getTotalCount(): Promise<number>;
}
