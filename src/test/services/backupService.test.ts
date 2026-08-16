import { describe, it, expect, beforeEach } from 'vitest';
import { backupService } from '../../services/backupService';

describe('backupService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should export clean backup payload', () => {
    localStorage.setItem(
      'gymmanager-students',
      JSON.stringify([{ id: 'std-1', name: 'Aluno Teste' }])
    );

    const payload = backupService.getBackupPayload();
    expect(payload.appName).toBe('GymManager');
    expect(payload.version).toBe('2.0.0');
    expect(payload.data.students).toHaveLength(1);
  });

  it('should generate AES-256 encrypted vault and restore it successfully', async () => {
    localStorage.setItem(
      'gymmanager-students',
      JSON.stringify([{ id: 'std-secret', name: 'Aluno Confidencial', email: 'secreto@gym.com' }])
    );
    localStorage.setItem(
      'gymmanager-equipments',
      JSON.stringify([{ id: 'eq-1', name: 'Cadeira Extensora', location: 'Piso 1' }])
    );

    const encryptedEnvelope = await backupService.createEncryptedBackup();
    expect(encryptedEnvelope.format).toBe('GymManager-Encrypted-Vault');
    expect(encryptedEnvelope.encrypted).toBe(true);
    expect(encryptedEnvelope.algorithm).toBe('AES-256-GCM-PBKDF2');
    expect(encryptedEnvelope.ciphertext).toBeDefined();
    expect(encryptedEnvelope.salt).toBeDefined();
    expect(encryptedEnvelope.iv).toBeDefined();

    // Clear local storage and restore from encrypted envelope
    localStorage.clear();
    const vaultString = JSON.stringify(encryptedEnvelope);

    const result = await backupService.importBackup(vaultString);
    expect(result.success).toBe(true);
    expect(result.isEncrypted).toBe(true);

    const studentsRaw = localStorage.getItem('gymmanager-students');
    expect(studentsRaw).not.toBeNull();
    const students = JSON.parse(studentsRaw!);
    expect(students[0].name).toBe('Aluno Confidencial');

    const equipmentsRaw = localStorage.getItem('gymmanager-equipments');
    expect(equipmentsRaw).not.toBeNull();
    const equipments = JSON.parse(equipmentsRaw!);
    expect(equipments[0].name).toBe('Cadeira Extensora');
  });

  it('should import legacy backup JSON and populate localStorage', async () => {
    const backupJson = JSON.stringify({
      version: '1.0.0',
      appName: 'GymManager',
      exportedAt: new Date().toISOString(),
      data: {
        students: [{ id: 'std-import', name: 'Aluno Importado' }],
        workouts: [{ id: 'wkt-import', name: 'Treino Importado' }],
      },
    });

    const result = await backupService.importBackup(backupJson);
    expect(result.success).toBe(true);

    const studentsRaw = localStorage.getItem('gymmanager-students');
    expect(studentsRaw).not.toBeNull();
    const students = JSON.parse(studentsRaw!);
    expect(students[0].name).toBe('Aluno Importado');
  });

  it('should reject invalid or tampered encrypted backup safely', async () => {
    const tamperedVault = JSON.stringify({
      format: 'GymManager-Encrypted-Vault',
      version: '2.0.0',
      appName: 'GymManager',
      encrypted: true,
      algorithm: 'AES-256-GCM-PBKDF2',
      exportedAt: new Date().toISOString(),
      salt: 'AAAA',
      iv: 'BBBB',
      ciphertext: 'tampered-data-corrupted',
    });

    const result = await backupService.importBackup(tamperedVault);
    expect(result.success).toBe(false);
  });
});
