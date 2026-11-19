import { v4 as uuidv4 } from 'uuid';
import type { CustomExercise } from '../../types';
import type { ICustomExerciseRepository } from '../interfaces/ICustomExerciseRepository';
import { matchesActiveTenant, resolveTenantId } from '../../utils/tenantContext';

const STORAGE_KEY = 'gymmanager-custom-exercises';

export class LocalStorageCustomExerciseRepository implements ICustomExerciseRepository {
  private getStorageData(): CustomExercise[] {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }

  private saveStorageData(exercises: CustomExercise[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(exercises));
  }

  async getAll(): Promise<CustomExercise[]> {
    return this.getStorageData().filter(e => matchesActiveTenant(e.tenantId));
  }

  async getById(id: string): Promise<CustomExercise | null> {
    const exercise = this.getStorageData().find(
      e => e.id === id && matchesActiveTenant(e.tenantId)
    );
    return exercise || null;
  }

  async create(
    exercise: Omit<CustomExercise, 'id' | 'createdAt' | 'isCustom'>
  ): Promise<CustomExercise> {
    const exercises = this.getStorageData();
    const newExercise: CustomExercise = {
      ...exercise,
      tenantId: resolveTenantId(exercise.tenantId),
      id: `custom-${uuidv4()}`,
      isCustom: true,
      createdAt: new Date().toISOString(),
    };
    exercises.push(newExercise);
    this.saveStorageData(exercises);
    return newExercise;
  }

  async update(id: string, data: Partial<CustomExercise>): Promise<CustomExercise | null> {
    const exercises = this.getStorageData();
    const index = exercises.findIndex(e => e.id === id && matchesActiveTenant(e.tenantId));
    if (index === -1) return null;

    exercises[index] = { ...exercises[index], ...data };
    this.saveStorageData(exercises);
    return exercises[index];
  }

  async delete(id: string): Promise<boolean> {
    const exercises = this.getStorageData();
    const filtered = exercises.filter(e => !(e.id === id && matchesActiveTenant(e.tenantId)));
    if (filtered.length === exercises.length) return false;
    this.saveStorageData(filtered);
    return true;
  }
}
