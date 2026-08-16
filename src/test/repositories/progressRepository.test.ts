import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageProgressRepository } from '../../repositories/localStorage/LocalStorageProgressRepository';

describe('LocalStorageProgressRepository', () => {
  let progressRepo: LocalStorageProgressRepository;

  beforeEach(() => {
    localStorage.clear();
    progressRepo = new LocalStorageProgressRepository();
  });

  it('should create physical progress with automatically computed BMI', async () => {
    // 80kg and 175cm -> BMI = 80 / (1.75^2) = 26.1
    const record = await progressRepo.create(
      {
        studentId: 'std-001',
        weight: 80,
        bodyFat: 18,
        muscleMass: 38,
        recordedAt: '2026-08-01T10:00:00Z',
      },
      175
    );

    expect(record.id).toBeDefined();
    expect(record.bmi).toBe(26.1);
  });

  it('should get latest progress for student', async () => {
    await progressRepo.create(
      { studentId: 'std-001', weight: 80, recordedAt: '2026-06-01T10:00:00Z' },
      175
    );
    await progressRepo.create(
      { studentId: 'std-001', weight: 78, recordedAt: '2026-07-01T10:00:00Z' },
      175
    );
    await progressRepo.create(
      { studentId: 'std-001', weight: 76, recordedAt: '2026-08-01T10:00:00Z' },
      175
    );

    const latest = await progressRepo.getLatestByStudentId('std-001');
    expect(latest?.weight).toBe(76);
  });
});
