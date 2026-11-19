import { DEFAULT_TENANT_ID, type Student } from '../types';
import { studentRepository } from '../repositories';
import { tenantService } from './tenantService';

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
    if (data.active === true) {
      const existing = await studentRepository.getById(id);
      if (existing && !existing.active) {
        const tenantId = existing.tenantId || DEFAULT_TENANT_ID;
        const seatCheck = await tenantService.canAddSeat(tenantId);
        if (!seatCheck.allowed) {
          throw new Error(seatCheck.reason || 'Limite de assentos da academia atingido.');
        }
      }
    }
    return studentRepository.update(id, data);
  },

  async delete(id: string): Promise<boolean> {
    return studentRepository.delete(id);
  },

  async toggleActive(id: string): Promise<Student | null> {
    const existing = await studentRepository.getById(id);
    if (!existing) return null;
    if (!existing.active) {
      const tenantId = existing.tenantId || DEFAULT_TENANT_ID;
      const seatCheck = await tenantService.canAddSeat(tenantId);
      if (!seatCheck.allowed) {
        throw new Error(seatCheck.reason || 'Limite de assentos da academia atingido.');
      }
    }
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
