import type { Student } from '../types';
import { studentRepository } from '../repositories';

export const studentService = {
  async getAll(tenantId?: string): Promise<Student[]> {
    return studentRepository.getAll(tenantId);
  },

  async getById(id: string): Promise<Student | null> {
    return studentRepository.getById(id);
  },

  async getByUserId(userId: string): Promise<Student | null> {
    return studentRepository.getByUserId(userId);
  },

  async create(student: Omit<Student, 'id' | 'createdAt'>): Promise<Student> {
    return studentRepository.create(student);
  },

  async update(id: string, data: Partial<Student>): Promise<Student | null> {
    return studentRepository.update(id, data);
  },

  async delete(id: string): Promise<boolean> {
    return studentRepository.delete(id);
  },

  async toggleActive(id: string): Promise<Student | null> {
    return studentRepository.toggleActive(id);
  },

  async search(query: string, tenantId?: string): Promise<Student[]> {
    return studentRepository.search(query, tenantId);
  },

  async getActiveCount(tenantId?: string): Promise<number> {
    return studentRepository.getActiveCount(tenantId);
  },

  async getTotalCount(tenantId?: string): Promise<number> {
    return studentRepository.getTotalCount(tenantId);
  },
};
