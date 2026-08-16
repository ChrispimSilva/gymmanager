import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageWorkoutRepository } from '../../repositories/localStorage/LocalStorageWorkoutRepository';

describe('LocalStorageWorkoutRepository', () => {
  let workoutRepo: LocalStorageWorkoutRepository;

  beforeEach(() => {
    localStorage.clear();
    workoutRepo = new LocalStorageWorkoutRepository();
  });

  it('should create, find, update and delete a workout', async () => {
    const workout = await workoutRepo.create({
      name: 'Treino A - Peito',
      description: 'Hipertrofia peitoral',
      studentId: 'std-001',
      instructorId: 'usr-inst-001',
      muscleGroup: 'Peito',
      exercises: [
        { exerciseId: 10, sets: 4, repetitions: 10, weight: 30, notes: 'Descanso 60s', order: 1 },
      ],
    });

    expect(workout.id).toBeDefined();
    expect(workout.name).toBe('Treino A - Peito');

    const byId = await workoutRepo.getById(workout.id);
    expect(byId?.name).toBe('Treino A - Peito');

    // Update
    const updated = await workoutRepo.update(workout.id, { name: 'Treino A - Peitoral Avançado' });
    expect(updated?.name).toBe('Treino A - Peitoral Avançado');

    // Filter by student
    const byStudent = await workoutRepo.getByStudentId('std-001');
    expect(byStudent.length).toBe(1);

    // Delete
    const deleted = await workoutRepo.delete(workout.id);
    expect(deleted).toBe(true);
    expect(await workoutRepo.getById(workout.id)).toBeNull();
  });
});
