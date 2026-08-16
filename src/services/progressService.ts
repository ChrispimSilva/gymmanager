import type { PhysicalProgress } from '../types';
import { progressRepository } from '../repositories';

export const progressService = {
  async getAll(): Promise<PhysicalProgress[]> {
    return progressRepository.getAll();
  },

  async getByStudentId(studentId: string): Promise<PhysicalProgress[]> {
    return progressRepository.getByStudentId(studentId);
  },

  async getLatestByStudentId(studentId: string): Promise<PhysicalProgress | null> {
    return progressRepository.getLatestByStudentId(studentId);
  },

  async create(data: Omit<PhysicalProgress, 'id' | 'bmi'>, heightCm: number): Promise<PhysicalProgress> {
    return progressRepository.create(data, heightCm);
  },

  async delete(id: string): Promise<boolean> {
    return progressRepository.delete(id);
  },

  async getTotalCount(): Promise<number> {
    return progressRepository.getTotalCount();
  },
};
