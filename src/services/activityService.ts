import type { ActivityLog } from '../types';
import { activityRepository } from '../repositories';

export const activityService = {
  async getAll(): Promise<ActivityLog[]> {
    return activityRepository.getAll();
  },

  async getRecent(count: number = 10): Promise<ActivityLog[]> {
    return activityRepository.getRecent(count);
  },

  async getRecentForStudent(studentName: string, count: number = 10): Promise<ActivityLog[]> {
    return activityRepository.getRecentForStudent(studentName, count);
  },

  async log(entry: Omit<ActivityLog, 'id' | 'timestamp'>): Promise<ActivityLog> {
    return activityRepository.log(entry);
  },
};
