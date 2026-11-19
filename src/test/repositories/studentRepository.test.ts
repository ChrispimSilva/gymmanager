import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageStudentRepository } from '../../repositories/localStorage/LocalStorageStudentRepository';
import { LocalStorageWorkoutRepository } from '../../repositories/localStorage/LocalStorageWorkoutRepository';
import { LocalStorageProgressRepository } from '../../repositories/localStorage/LocalStorageProgressRepository';

describe('LocalStorageStudentRepository & Cascade Deletion', () => {
  let studentRepo: LocalStorageStudentRepository;
  let workoutRepo: LocalStorageWorkoutRepository;
  let progressRepo: LocalStorageProgressRepository;

  beforeEach(() => {
    localStorage.clear();
    workoutRepo = new LocalStorageWorkoutRepository();
    progressRepo = new LocalStorageProgressRepository();
    studentRepo = new LocalStorageStudentRepository(workoutRepo, progressRepo);
  });

  it('should create and retrieve a student', async () => {
    const student = await studentRepo.create({
      name: 'Carla Dias',
      email: 'carla@teste.com',
      phone: '1199999999',
      birthDate: '1995-05-10',
      weight: 60,
      height: 165,
      goal: 'Hipertrofia',
      active: true,
      photo: '',
    });

    expect(student.id).toBeDefined();
    expect(student.name).toBe('Carla Dias');

    const found = await studentRepo.getById(student.id);
    expect(found?.name).toBe('Carla Dias');
  });

  it('should toggle student active status', async () => {
    const student = await studentRepo.create({
      name: 'Roberto Carlos',
      email: 'roberto@teste.com',
      phone: '',
      birthDate: '',
      weight: 80,
      height: 175,
      goal: 'Emagrecimento',
      active: true,
    });

    expect(student.active).toBe(true);

    const toggled = await studentRepo.toggleActive(student.id);
    expect(toggled?.active).toBe(false);

    const activeCount = await studentRepo.getActiveCount();
    expect(activeCount).toBe(0);
  });

  it('should search students by name or email', async () => {
    await studentRepo.create({
      name: 'Fabiana Lima',
      email: 'fabiana@teste.com',
      phone: '11988887777',
      birthDate: '',
      weight: 65,
      height: 168,
      goal: 'Condicionamento',
      active: true,
    });

    const results = await studentRepo.search('fabiana');
    expect(results.length).toBe(1);
    expect(results[0].name).toBe('Fabiana Lima');
  });

  it('should cascade delete workouts and progress records when a student is deleted', async () => {
    // 1. Create student
    const student = await studentRepo.create({
      name: 'Aluno Cascade',
      email: 'cascade@teste.com',
      phone: '',
      birthDate: '',
      weight: 75,
      height: 175,
      goal: 'Hipertrofia',
      active: true,
    });

    // 2. Create workouts linked to this student
    await workoutRepo.create({
      studentId: student.id,
      instructorId: 'usr-inst-001',
      name: 'Treino A',
      description: 'Treino cascade',
      muscleGroup: 'Peito',
      exercises: [],
    });
    await workoutRepo.create({
      studentId: student.id,
      instructorId: 'usr-inst-001',
      name: 'Treino B',
      description: 'Treino cascade',
      muscleGroup: 'Costas',
      exercises: [],
    });

    // 3. Create progress records linked to this student
    await progressRepo.create({
      studentId: student.id,
      weight: 75,
      bodyFat: 15,
      recordedAt: new Date().toISOString(),
    }, student.height);

    // Verify before deletion
    expect((await workoutRepo.getByStudentId(student.id)).length).toBe(2);
    expect((await progressRepo.getByStudentId(student.id)).length).toBe(1);

    // 4. Delete the student
    const deleted = await studentRepo.delete(student.id);
    expect(deleted).toBe(true);

    // 5. Verify cascade deletion
    const studentCheck = await studentRepo.getById(student.id);
    expect(studentCheck).toBeNull();

    const remainingWorkouts = await workoutRepo.getByStudentId(student.id);
    expect(remainingWorkouts.length).toBe(0);

    const remainingProgress = await progressRepo.getByStudentId(student.id);
    expect(remainingProgress.length).toBe(0);
  });

  it('should isolate student lookups and mutations by active tenant', async () => {
    const studentA = await studentRepo.create({
      name: 'Aluno A',
      email: 'aluno-a@teste.com',
      phone: '',
      birthDate: '',
      weight: 70,
      height: 175,
      goal: 'Hipertrofia',
      active: true,
      userId: 'usr-a',
      tenantId: 'tenant-a',
    });

    const studentB = await studentRepo.create({
      name: 'Aluno B',
      email: 'aluno-b@teste.com',
      phone: '',
      birthDate: '',
      weight: 65,
      height: 168,
      goal: 'Condicionamento',
      active: true,
      userId: 'usr-b',
      tenantId: 'tenant-b',
    });

    localStorage.setItem(
      'gymmanager-auth',
      JSON.stringify({
        id: 'usr-personal-b',
        name: 'Personal B',
        email: 'pb@b.com',
        role: 'personal',
        tenantId: 'tenant-b',
      })
    );

    expect(await studentRepo.getById(studentA.id)).toBeNull();
    expect(await studentRepo.getByUserId('usr-a')).toBeNull();
    expect(await studentRepo.update(studentA.id, { name: 'Hack' })).toBeNull();
    expect(await studentRepo.toggleActive(studentA.id)).toBeNull();
    expect(await studentRepo.delete(studentA.id)).toBe(false);

    expect((await studentRepo.getById(studentB.id))?.id).toBe(studentB.id);

    localStorage.setItem(
      'gymmanager-auth',
      JSON.stringify({
        id: 'usr-personal-a',
        name: 'Personal A',
        email: 'pa@a.com',
        role: 'personal',
        tenantId: 'tenant-a',
      })
    );

    const intactA = await studentRepo.getById(studentA.id);
    expect(intactA?.name).toBe('Aluno A');
  });
});
