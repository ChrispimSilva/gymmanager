import { v4 as uuidv4 } from 'uuid';
import type { Student } from '../../types';
import type { IStudentRepository } from '../interfaces/IStudentRepository';
import type { IWorkoutRepository } from '../interfaces/IWorkoutRepository';
import type { IProgressRepository } from '../interfaces/IProgressRepository';
import type { IWorkoutSessionRepository } from '../interfaces/IWorkoutSessionRepository';

const STORAGE_KEY = 'gymmanager-students';

export class LocalStorageStudentRepository implements IStudentRepository {
  private workoutRepo?: IWorkoutRepository;
  private progressRepo?: IProgressRepository;
  private sessionRepo?: IWorkoutSessionRepository;

  constructor(
    workoutRepo?: IWorkoutRepository,
    progressRepo?: IProgressRepository,
    sessionRepo?: IWorkoutSessionRepository
  ) {
    this.workoutRepo = workoutRepo;
    this.progressRepo = progressRepo;
    this.sessionRepo = sessionRepo;
  }

  private getStorageData(): Student[] {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }

  private saveStorageData(students: Student[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(students));
  }

  async getAll(): Promise<Student[]> {
    return this.getStorageData();
  }

  async getById(id: string): Promise<Student | null> {
    const student = this.getStorageData().find(s => s.id === id);
    return student || null;
  }

  async getByUserId(userId: string): Promise<Student | null> {
    const student = this.getStorageData().find(s => s.userId === userId);
    return student || null;
  }

  async create(student: Omit<Student, 'id' | 'createdAt'>): Promise<Student> {
    const students = this.getStorageData();
    const newStudent: Student = {
      ...student,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
    };
    students.push(newStudent);
    this.saveStorageData(students);
    return newStudent;
  }

  async update(id: string, data: Partial<Student>): Promise<Student | null> {
    const students = this.getStorageData();
    const index = students.findIndex(s => s.id === id);
    if (index === -1) return null;

    students[index] = { ...students[index], ...data };
    this.saveStorageData(students);
    return students[index];
  }

  async delete(id: string): Promise<boolean> {
    const students = this.getStorageData();
    const filtered = students.filter(s => s.id !== id);
    if (filtered.length === students.length) return false;

    this.saveStorageData(filtered);

    // Cascade delete related entities
    if (this.workoutRepo) {
      await this.workoutRepo.deleteByStudentId(id);
    }
    if (this.progressRepo) {
      await this.progressRepo.deleteByStudentId(id);
    }
    if (this.sessionRepo) {
      await this.sessionRepo.deleteByStudentId(id);
    }

    return true;
  }

  async toggleActive(id: string): Promise<Student | null> {
    const students = this.getStorageData();
    const index = students.findIndex(s => s.id === id);
    if (index === -1) return null;

    students[index].active = !students[index].active;
    this.saveStorageData(students);
    return students[index];
  }

  async search(query: string): Promise<Student[]> {
    const lower = query.toLowerCase();
    return this.getStorageData().filter(s =>
      s.name.toLowerCase().includes(lower) ||
      s.email.toLowerCase().includes(lower) ||
      s.phone.includes(query)
    );
  }

  async getActiveCount(): Promise<number> {
    return this.getStorageData().filter(s => s.active).length;
  }

  async getTotalCount(): Promise<number> {
    return this.getStorageData().length;
  }
}
