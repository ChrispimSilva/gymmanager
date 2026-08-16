import type { ActivityLog } from '../../types';

export interface IActivityRepository {
  getAll(): Promise<ActivityLog[]>;
  getRecent(count?: number): Promise<ActivityLog[]>;
  getRecentForStudent(studentName: string, count?: number): Promise<ActivityLog[]>;
  log(entry: Omit<ActivityLog, 'id' | 'timestamp'>): Promise<ActivityLog>;
}
