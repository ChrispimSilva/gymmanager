import { v4 as uuidv4 } from 'uuid';
import type { WorkoutSession } from '../../types';
import type { IWorkoutSessionRepository } from '../interfaces/IWorkoutSessionRepository';
import { matchesActiveTenant, resolveTenantId } from '../../utils/tenantContext';

const STORAGE_KEY = 'gymmanager-sessions';

export class LocalStorageWorkoutSessionRepository implements IWorkoutSessionRepository {
  private getStorageData(): WorkoutSession[] {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }

  private saveStorageData(sessions: WorkoutSession[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  }

  async getAll(): Promise<WorkoutSession[]> {
    return this.getStorageData()
      .filter(s => matchesActiveTenant(s.tenantId))
      .sort((a, b) => new Date(b.endedAt).getTime() - new Date(a.endedAt).getTime());
  }

  async getById(id: string): Promise<WorkoutSession | null> {
    const session = this.getStorageData().find(s => s.id === id);
    return session || null;
  }

  async getByStudentId(studentId: string): Promise<WorkoutSession[]> {
    return this.getStorageData()
      .filter(s => s.studentId === studentId)
      .sort((a, b) => new Date(b.endedAt).getTime() - new Date(a.endedAt).getTime());
  }

  async getByWorkoutId(workoutId: string): Promise<WorkoutSession[]> {
    return this.getStorageData()
      .filter(s => s.workoutId === workoutId)
      .sort((a, b) => new Date(b.endedAt).getTime() - new Date(a.endedAt).getTime());
  }

  async create(session: Omit<WorkoutSession, 'id'>): Promise<WorkoutSession> {
    const sessions = this.getStorageData();
    const newSession: WorkoutSession = {
      ...session,
      tenantId: resolveTenantId(session.tenantId),
      id: uuidv4(),
    };
    sessions.push(newSession);
    this.saveStorageData(sessions);
    return newSession;
  }

  async delete(id: string): Promise<boolean> {
    const sessions = this.getStorageData();
    const filtered = sessions.filter(s => s.id !== id);
    if (filtered.length === sessions.length) return false;
    this.saveStorageData(filtered);
    return true;
  }

  async deleteByStudentId(studentId: string): Promise<number> {
    const sessions = this.getStorageData();
    const remaining = sessions.filter(s => s.studentId !== studentId);
    const countDeleted = sessions.length - remaining.length;
    if (countDeleted > 0) {
      this.saveStorageData(remaining);
    }
    return countDeleted;
  }

  async getRecent(count: number = 10): Promise<WorkoutSession[]> {
    const all = await this.getAll();
    return all.slice(0, count);
  }

  async getStreakDays(studentId: string): Promise<number> {
    const sessions = await this.getByStudentId(studentId);
    if (sessions.length === 0) return 0;

    // Extract unique ISO date strings (YYYY-MM-DD)
    const dates = Array.from(
      new Set(sessions.map(s => s.endedAt.split('T')[0]))
    ).sort().reverse();

    if (dates.length === 0) return 0;

    const todayStr = new Date().toISOString().split('T')[0];
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

    // If the latest session is neither today nor yesterday, streak is broken
    if (dates[0] !== todayStr && dates[0] !== yesterdayStr) {
      return 0;
    }

    let streak = 1;
    let currentDate = new Date(dates[0]);

    for (let i = 1; i < dates.length; i++) {
      const prevDate = new Date(dates[i]);
      const diffTime = currentDate.getTime() - prevDate.getTime();
      const diffDays = Math.round(diffTime / (1000 * 3600 * 24));

      if (diffDays === 1) {
        streak++;
        currentDate = prevDate;
      } else {
        break;
      }
    }

    return streak;
  }
}
