import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageWorkoutSessionRepository } from '../../repositories/localStorage/LocalStorageWorkoutSessionRepository';
import { LocalStorageStudentRepository } from '../../repositories/localStorage/LocalStorageStudentRepository';
import { LocalStorageWorkoutRepository } from '../../repositories/localStorage/LocalStorageWorkoutRepository';
import { LocalStorageProgressRepository } from '../../repositories/localStorage/LocalStorageProgressRepository';

describe('LocalStorageWorkoutSessionRepository', () => {
  let sessionRepo: LocalStorageWorkoutSessionRepository;
  let studentRepo: LocalStorageStudentRepository;
  let workoutRepo: LocalStorageWorkoutRepository;
  let progressRepo: LocalStorageProgressRepository;

  beforeEach(() => {
    localStorage.clear();
    sessionRepo = new LocalStorageWorkoutSessionRepository();
    workoutRepo = new LocalStorageWorkoutRepository();
    progressRepo = new LocalStorageProgressRepository();
    studentRepo = new LocalStorageStudentRepository(workoutRepo, progressRepo, sessionRepo);
  });

  it('should create and retrieve a completed workout session', async () => {
    const session = await sessionRepo.create({
      workoutId: 'wkt-001',
      workoutName: 'Treino A - Peito',
      studentId: 'std-001',
      startedAt: '2026-08-15T10:00:00Z',
      endedAt: '2026-08-15T10:45:00Z',
      durationSeconds: 2700,
      totalVolumeKg: 4500,
      completedSetsCount: 12,
      totalSetsCount: 12,
      exercises: [
        {
          exerciseId: 1,
          exerciseName: 'Supino Reto',
          sets: [
            { setNumber: 1, repetitions: 10, weight: 60, completed: true },
            { setNumber: 2, repetitions: 10, weight: 60, completed: true },
          ],
        },
      ],
      notes: 'Ótima intensidade',
    });

    expect(session.id).toBeDefined();
    expect(session.totalVolumeKg).toBe(4500);

    const studentSessions = await sessionRepo.getByStudentId('std-001');
    expect(studentSessions.length).toBe(1);
    expect(studentSessions[0].workoutName).toBe('Treino A - Peito');
  });

  it('should calculate consecutive streak days correctly', async () => {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    await sessionRepo.create({
      workoutId: 'wkt-001',
      workoutName: 'Treino A',
      studentId: 'std-streak',
      startedAt: twoDaysAgo.toISOString(),
      endedAt: twoDaysAgo.toISOString(),
      durationSeconds: 2000,
      totalVolumeKg: 3000,
      completedSetsCount: 8,
      totalSetsCount: 8,
      exercises: [],
    });

    await sessionRepo.create({
      workoutId: 'wkt-002',
      workoutName: 'Treino B',
      studentId: 'std-streak',
      startedAt: yesterday.toISOString(),
      endedAt: yesterday.toISOString(),
      durationSeconds: 2000,
      totalVolumeKg: 3000,
      completedSetsCount: 8,
      totalSetsCount: 8,
      exercises: [],
    });

    await sessionRepo.create({
      workoutId: 'wkt-003',
      workoutName: 'Treino C',
      studentId: 'std-streak',
      startedAt: today.toISOString(),
      endedAt: today.toISOString(),
      durationSeconds: 2000,
      totalVolumeKg: 3000,
      completedSetsCount: 8,
      totalSetsCount: 8,
      exercises: [],
    });

    const streak = await sessionRepo.getStreakDays('std-streak');
    expect(streak).toBe(3);
  });

  it('should cascade delete workout sessions when student is deleted', async () => {
    const student = await studentRepo.create({
      name: 'Aluno Sessão Cascade',
      email: 'sessao@cascade.com',
      phone: '',
      birthDate: '',
      weight: 70,
      height: 170,
      goal: 'Hipertrofia',
      active: true,
    });

    await sessionRepo.create({
      workoutId: 'wkt-001',
      workoutName: 'Treino A',
      studentId: student.id,
      startedAt: new Date().toISOString(),
      endedAt: new Date().toISOString(),
      durationSeconds: 1800,
      totalVolumeKg: 2000,
      completedSetsCount: 6,
      totalSetsCount: 6,
      exercises: [],
    });

    expect((await sessionRepo.getByStudentId(student.id)).length).toBe(1);

    await studentRepo.delete(student.id);

    expect((await sessionRepo.getByStudentId(student.id)).length).toBe(0);
  });
});
