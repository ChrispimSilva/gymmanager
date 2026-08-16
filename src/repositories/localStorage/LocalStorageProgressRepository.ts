import { v4 as uuidv4 } from 'uuid';
import type { PhysicalProgress } from '../../types';
import type { IProgressRepository } from '../interfaces/IProgressRepository';

const STORAGE_KEY = 'gymmanager-progress';

function calculateBMI(weight: number, heightCm: number): number {
  if (heightCm <= 0) return 0;
  const heightM = heightCm / 100;
  return Math.round((weight / (heightM * heightM)) * 10) / 10;
}

export class LocalStorageProgressRepository implements IProgressRepository {
  private getStorageData(): PhysicalProgress[] {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }

  private saveStorageData(progress: PhysicalProgress[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }

  async getAll(): Promise<PhysicalProgress[]> {
    return this.getStorageData();
  }

  async getByStudentId(studentId: string): Promise<PhysicalProgress[]> {
    return this.getStorageData()
      .filter(p => p.studentId === studentId)
      .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());
  }

  async getLatestByStudentId(studentId: string): Promise<PhysicalProgress | null> {
    const records = await this.getByStudentId(studentId);
    return records.length > 0 ? records[records.length - 1] : null;
  }

  async create(data: Omit<PhysicalProgress, 'id' | 'bmi'>, heightCm: number): Promise<PhysicalProgress> {
    const records = this.getStorageData();
    const newRecord: PhysicalProgress = {
      ...data,
      id: uuidv4(),
      bmi: calculateBMI(data.weight, heightCm),
    };
    records.push(newRecord);
    this.saveStorageData(records);
    return newRecord;
  }

  async delete(id: string): Promise<boolean> {
    const records = this.getStorageData();
    const filtered = records.filter(r => r.id !== id);
    if (filtered.length === records.length) return false;
    this.saveStorageData(filtered);
    return true;
  }

  async deleteByStudentId(studentId: string): Promise<number> {
    const records = this.getStorageData();
    const remaining = records.filter(r => r.studentId !== studentId);
    const countDeleted = records.length - remaining.length;
    if (countDeleted > 0) {
      this.saveStorageData(remaining);
    }
    return countDeleted;
  }

  async getTotalCount(): Promise<number> {
    return this.getStorageData().length;
  }
}
