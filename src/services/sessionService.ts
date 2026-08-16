import { sessionRepository } from '../repositories';
import { activityService } from './activityService';
import type { WorkoutSession } from '../types';

export const sessionService = {
  async getAll(): Promise<WorkoutSession[]> {
    return sessionRepository.getAll();
  },

  async getById(id: string): Promise<WorkoutSession | null> {
    return sessionRepository.getById(id);
  },

  async getByStudentId(studentId: string): Promise<WorkoutSession[]> {
    return sessionRepository.getByStudentId(studentId);
  },

  async getByWorkoutId(workoutId: string): Promise<WorkoutSession[]> {
    return sessionRepository.getByWorkoutId(workoutId);
  },

  async create(sessionData: Omit<WorkoutSession, 'id'>, userId?: string): Promise<WorkoutSession> {
    const session = await sessionRepository.create(sessionData);

    // Log activity
    await activityService.log({
      userId: userId || 'usr-system',
      type: 'workout_completed',
      description: `Treino concluído: ${session.workoutName} (${Math.round(session.durationSeconds / 60)} min)`,
      relatedId: session.id,
    });

    return session;
  },

  async delete(id: string): Promise<boolean> {
    return sessionRepository.delete(id);
  },

  async getStreakDays(studentId: string): Promise<number> {
    return sessionRepository.getStreakDays(studentId);
  },

  async getRecent(count: number = 10): Promise<WorkoutSession[]> {
    return sessionRepository.getRecent(count);
  },
};
