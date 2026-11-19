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

  it('should isolate direct lookups, clones, updates and deletes by active tenant', async () => {
    const workoutA = await workoutRepo.create({
      tenantId: 'tenant-a',
      name: 'Treino Academia A',
      description: 'Restrito A',
      studentId: 'std-a',
      instructorId: 'inst-a',
      muscleGroup: 'Costas',
      exercises: [],
    });

    const workoutB = await workoutRepo.create({
      tenantId: 'tenant-b',
      name: 'Treino Academia B',
      description: 'Restrito B',
      studentId: 'std-b',
      instructorId: 'inst-b',
      muscleGroup: 'Pernas',
      exercises: [],
    });

    // Simulate active personal session on tenant-b
    localStorage.setItem(
      'gymmanager-auth',
      JSON.stringify({
        id: 'usr-b',
        name: 'Personal B',
        email: 'pb@b.com',
        role: 'personal',
        tenantId: 'tenant-b',
      })
    );

    expect(await workoutRepo.getById(workoutA.id)).toBeNull();
    expect(await workoutRepo.getByStudentId('std-a')).toEqual([]);
    expect(await workoutRepo.getByInstructorId('inst-a')).toEqual([]);
    expect(await workoutRepo.update(workoutA.id, { name: 'Hack' })).toBeNull();
    expect(await workoutRepo.cloneWorkout(workoutA.id, 'std-b')).toBeNull();
    expect(await workoutRepo.delete(workoutA.id)).toBe(false);

    const fetchedB = await workoutRepo.getById(workoutB.id);
    expect(fetchedB?.id).toBe(workoutB.id);

    // Switch session to tenant-a and confirm workoutA remained intact
    localStorage.setItem(
      'gymmanager-auth',
      JSON.stringify({
        id: 'usr-a',
        name: 'Personal A',
        email: 'pa@a.com',
        role: 'personal',
        tenantId: 'tenant-a',
      })
    );

    const fetchedA = await workoutRepo.getById(workoutA.id);
    expect(fetchedA?.name).toBe('Treino Academia A');
  });
});
