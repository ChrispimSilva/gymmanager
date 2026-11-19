import { v4 as uuidv4 } from 'uuid';
import type { ActivityLog } from '../../types';
import type { IActivityRepository } from '../interfaces/IActivityRepository';
import { matchesActiveTenant, resolveTenantId } from '../../utils/tenantContext';

const STORAGE_KEY = 'gymmanager-activity';

export class LocalStorageActivityRepository implements IActivityRepository {
  private getStorageData(): ActivityLog[] {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }

  private saveStorageData(logs: ActivityLog[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  }

  async getAll(): Promise<ActivityLog[]> {
    return this.getStorageData()
      .filter(a => matchesActiveTenant(a.tenantId))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  async getRecent(count: number = 10): Promise<ActivityLog[]> {
    const all = await this.getAll();
    return all.slice(0, count);
  }

  async getRecentForStudent(studentName: string, count: number = 10): Promise<ActivityLog[]> {
    const all = await this.getAll();
    const lower = studentName.toLowerCase();
    return all
      .filter(a => a.description.toLowerCase().includes(lower))
      .slice(0, count);
  }

  async log(entry: Omit<ActivityLog, 'id' | 'timestamp'>): Promise<ActivityLog> {
    const logs = this.getStorageData();
    const newLog: ActivityLog = {
      ...entry,
      tenantId: resolveTenantId(entry.tenantId),
      id: uuidv4(),
      timestamp: new Date().toISOString(),
    };
    logs.push(newLog);
    this.saveStorageData(logs);
    return newLog;
  }
}
