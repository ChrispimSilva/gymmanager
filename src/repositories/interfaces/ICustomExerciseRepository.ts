import type { CustomExercise } from '../../types';

export interface ICustomExerciseRepository {
  getAll(): Promise<CustomExercise[]>;
  getById(id: string): Promise<CustomExercise | null>;
  create(exercise: Omit<CustomExercise, 'id' | 'createdAt' | 'isCustom'>): Promise<CustomExercise>;
  update(id: string, data: Partial<CustomExercise>): Promise<CustomExercise | null>;
  delete(id: string): Promise<boolean>;
}
