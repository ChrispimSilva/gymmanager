import type { PhysicalProgress } from '../../types';

export interface IProgressRepository {
  getAll(): Promise<PhysicalProgress[]>;
  getByStudentId(studentId: string): Promise<PhysicalProgress[]>;
  getLatestByStudentId(studentId: string): Promise<PhysicalProgress | null>;
  create(data: Omit<PhysicalProgress, 'id' | 'bmi'>, heightCm: number): Promise<PhysicalProgress>;
  delete(id: string): Promise<boolean>;
  deleteByStudentId(studentId: string): Promise<number>;
  getTotalCount(): Promise<number>;
}
