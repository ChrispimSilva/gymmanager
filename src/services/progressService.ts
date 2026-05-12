import { v4 as uuidv4 } from 'uuid';
import type { PhysicalProgress } from '../types';

const STORAGE_KEY = 'gymmanager-progress';

function getAll(): PhysicalProgress[] {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

function save(progress: PhysicalProgress[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

function calculateBMI(weight: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return Math.round((weight / (heightM * heightM)) * 10) / 10;
}

export const progressService = {
  getAll(): PhysicalProgress[] {
    return getAll();
  },

  getByStudentId(studentId: string): PhysicalProgress[] {
    return getAll()
      .filter(p => p.studentId === studentId)
      .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());
  },

  create(data: Omit<PhysicalProgress, 'id' | 'bmi'>, heightCm: number): PhysicalProgress {
    const records = getAll();
    const newRecord: PhysicalProgress = {
      ...data,
      id: uuidv4(),
      bmi: calculateBMI(data.weight, heightCm),
    };
    records.push(newRecord);
    save(records);
    return newRecord;
  },

  delete(id: string): boolean {
    const records = getAll();
    const filtered = records.filter(r => r.id !== id);
    if (filtered.length === records.length) return false;
    save(filtered);
    return true;
  },

  getLatestByStudentId(studentId: string): PhysicalProgress | undefined {
    const records = this.getByStudentId(studentId);
    return records.length > 0 ? records[records.length - 1] : undefined;
  },

  getTotalCount(): number {
    return getAll().length;
  },
};
