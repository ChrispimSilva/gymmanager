import type { Student } from '../../types';

export interface IStudentRepository {
  getAll(): Promise<Student[]>;
  getById(id: string): Promise<Student | null>;
  getByUserId(userId: string): Promise<Student | null>;
  create(student: Omit<Student, 'id' | 'createdAt'>): Promise<Student>;
  update(id: string, data: Partial<Student>): Promise<Student | null>;
  delete(id: string): Promise<boolean>;
  toggleActive(id: string): Promise<Student | null>;
  search(query: string): Promise<Student[]>;
  getActiveCount(): Promise<number>;
  getTotalCount(): Promise<number>;
}
