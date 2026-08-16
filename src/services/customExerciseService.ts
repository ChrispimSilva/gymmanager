import { customExerciseRepository } from '../repositories';
import { activityService } from './activityService';
import type { CustomExercise } from '../types';

export const customExerciseService = {
  async getAll(): Promise<CustomExercise[]> {
    return customExerciseRepository.getAll();
  },

  async getById(id: string): Promise<CustomExercise | null> {
    return customExerciseRepository.getById(id);
  },

  async create(
    exerciseData: Omit<CustomExercise, 'id' | 'createdAt' | 'isCustom'>,
    userId?: string
  ): Promise<CustomExercise> {
    const exercise = await customExerciseRepository.create(exerciseData);

    await activityService.log({
      userId: userId || 'usr-system',
      type: 'exercise_created',
      description: `Novo exercício criado: ${exercise.nome}`,
      relatedId: exercise.id,
    });

    return exercise;
  },

  async update(id: string, data: Partial<CustomExercise>): Promise<CustomExercise | null> {
    return customExerciseRepository.update(id, data);
  },

  async delete(id: string): Promise<boolean> {
    return customExerciseRepository.delete(id);
  },
};
