import type { WorkoutSession } from '../../types';

export interface IWorkoutSessionRepository {
  getAll(): Promise<WorkoutSession[]>;
  getById(id: string): Promise<WorkoutSession | null>;
  getByStudentId(studentId: string): Promise<WorkoutSession[]>;
  getByWorkoutId(workoutId: string): Promise<WorkoutSession[]>;
  create(session: Omit<WorkoutSession, 'id'>): Promise<WorkoutSession>;
  delete(id: string): Promise<boolean>;
  deleteByStudentId(studentId: string): Promise<number>;
  getRecent(count?: number): Promise<WorkoutSession[]>;
  getStreakDays(studentId: string): Promise<number>;
}
