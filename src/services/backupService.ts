import { seedData } from '../utils/seedData';
import { activityService } from './activityService';

export interface BackupDataPayload {
  version: string;
  appName: 'GymManager';
  exportedAt: string;
  data: {
    users?: unknown[];
    students?: unknown[];
    workouts?: unknown[];
    progress?: unknown[];
    sessions?: unknown[];
    customExercises?: unknown[];
    equipments?: unknown[];
    activities?: unknown[];
    settings?: unknown;
  };
}

export interface EncryptedBackupEnvelope {
  format: 'GymManager-Encrypted-Vault';
  version: string;
  appName: 'GymManager';
  encrypted: true;
  algorithm: 'AES-256-GCM-PBKDF2';
  exportedAt: string;
  salt: string;
  iv: string;
  ciphertext: string;
}

const STORAGE_KEYS = {
  users: 'gymmanager-users',
  students: 'gymmanager-students',
  workouts: 'gymmanager-workouts',
  progress: 'gymmanager-progress',
  sessions: 'gymmanager-sessions',
  customExercises: 'gymmanager-custom-exercises',
  equipments: 'gymmanager-equipments',
  activities: 'gymmanager-activities',
  settings: 'gymmanager-settings',
};

const MASTER_VAULT_PASSPHRASE = 'GYMMANAGER_SECURE_VAULT_KEY_@2026_AES256_PRIVATE_ORCA';

function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function deriveKey(salt: Uint8Array, customPassphrase?: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const passphrase = customPassphrase || MASTER_VAULT_PASSPHRASE;
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export const backupService = {
  getBackupPayload(): BackupDataPayload {
    const data: BackupDataPayload['data'] = {};

    Object.entries(STORAGE_KEYS).forEach(([key, storageKey]) => {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        try {
          data[key as keyof BackupDataPayload['data']] = JSON.parse(raw);
        } catch {
          // ignore corrupted slice
        }
      }
    });

    return {
      version: '2.0.0',
      appName: 'GymManager',
      exportedAt: new Date().toISOString(),
      data,
    };
  },

  async createEncryptedBackup(customPassphrase?: string): Promise<EncryptedBackupEnvelope> {
    const payload = this.getBackupPayload();
    const jsonString = JSON.stringify(payload);
    const enc = new TextEncoder();
    const plainData = enc.encode(jsonString);

    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const cryptoKey = await deriveKey(salt, customPassphrase);

    const ciphertextBuffer = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv as BufferSource,
      },
      cryptoKey,
      plainData
    );

    return {
      format: 'GymManager-Encrypted-Vault',
      version: '2.0.0',
      appName: 'GymManager',
      encrypted: true,
      algorithm: 'AES-256-GCM-PBKDF2',
      exportedAt: payload.exportedAt,
      salt: bufferToBase64(salt),
      iv: bufferToBase64(iv),
      ciphertext: bufferToBase64(ciphertextBuffer),
    };
  },

  async downloadEncryptedBackupFile(customPassphrase?: string): Promise<void> {
    const envelope = await this.createEncryptedBackup(customPassphrase);
    const jsonString = JSON.stringify(envelope, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    const dateStr = new Date().toISOString().split('T')[0];
    link.href = url;
    link.download = `gymmanager-backup-seguro-${dateStr}.gymvault`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  // Legacy export fallback
  downloadBackupFile(): void {
    const payload = this.getBackupPayload();
    const jsonString = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    const dateStr = new Date().toISOString().split('T')[0];
    link.href = url;
    link.download = `gymmanager-backup-${dateStr}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  async decryptBackupEnvelope(
    envelope: EncryptedBackupEnvelope,
    customPassphrase?: string
  ): Promise<BackupDataPayload> {
    const salt = base64ToBuffer(envelope.salt);
    const iv = base64ToBuffer(envelope.iv);
    const ciphertext = base64ToBuffer(envelope.ciphertext);

    const cryptoKey = await deriveKey(salt, customPassphrase);

    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv as BufferSource,
      },
      cryptoKey,
      ciphertext as BufferSource
    );

    const dec = new TextDecoder();
    const decryptedJson = dec.decode(decryptedBuffer);
    return JSON.parse(decryptedJson) as BackupDataPayload;
  },

  async importBackup(
    fileContent: string,
    userId?: string,
    customPassphrase?: string
  ): Promise<{ success: boolean; message: string; counts?: Record<string, number>; isEncrypted?: boolean }> {
    try {
      const rawParsed = JSON.parse(fileContent) as unknown;

      if (!rawParsed || typeof rawParsed !== 'object') {
        return { success: false, message: 'Arquivo de backup inválido ou vazio.' };
      }

      let payload: BackupDataPayload;
      let wasEncrypted = false;

      // Check if it's an encrypted vault envelope
      if (
        (rawParsed as EncryptedBackupEnvelope).encrypted === true &&
        (rawParsed as EncryptedBackupEnvelope).format === 'GymManager-Encrypted-Vault'
      ) {
        try {
          payload = await this.decryptBackupEnvelope(
            rawParsed as EncryptedBackupEnvelope,
            customPassphrase
          );
          wasEncrypted = true;
        } catch {
          return {
            success: false,
            message: 'Falha ao descriptografar backup. O arquivo pode ter sido corrompido ou a chave é incompatível.',
          };
        }
      } else if ((rawParsed as Partial<BackupDataPayload>).data) {
        // Legacy plain backup format
        payload = rawParsed as BackupDataPayload;
      } else {
        return {
          success: false,
          message: 'Formato de arquivo não reconhecido pelo GymManager.',
        };
      }

      const { data } = payload;
      if (!data || typeof data !== 'object') {
        return { success: false, message: 'Conteúdo de dados não encontrado no arquivo.' };
      }

      const counts: Record<string, number> = {};

      if (Array.isArray(data.users)) {
        localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(data.users));
        counts.users = data.users.length;
      }
      if (Array.isArray(data.students)) {
        localStorage.setItem(STORAGE_KEYS.students, JSON.stringify(data.students));
        counts.students = data.students.length;
      }
      if (Array.isArray(data.workouts)) {
        localStorage.setItem(STORAGE_KEYS.workouts, JSON.stringify(data.workouts));
        counts.workouts = data.workouts.length;
      }
      if (Array.isArray(data.progress)) {
        localStorage.setItem(STORAGE_KEYS.progress, JSON.stringify(data.progress));
        counts.progress = data.progress.length;
      }
      if (Array.isArray(data.sessions)) {
        localStorage.setItem(STORAGE_KEYS.sessions, JSON.stringify(data.sessions));
        counts.sessions = data.sessions.length;
      }
      if (Array.isArray(data.customExercises)) {
        localStorage.setItem(STORAGE_KEYS.customExercises, JSON.stringify(data.customExercises));
        counts.customExercises = data.customExercises.length;
      }
      if (Array.isArray(data.equipments)) {
        localStorage.setItem(STORAGE_KEYS.equipments, JSON.stringify(data.equipments));
        counts.equipments = data.equipments.length;
      }
      if (Array.isArray(data.activities)) {
        localStorage.setItem(STORAGE_KEYS.activities, JSON.stringify(data.activities));
        counts.activities = data.activities.length;
      }
      if (data.settings && typeof data.settings === 'object') {
        localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(data.settings));
      }

      await activityService.log({
        userId: userId || 'usr-admin-001',
        type: 'workout_updated',
        description: `Backup ${wasEncrypted ? 'criptografado ' : ''}restaurado com sucesso.`,
      });

      return {
        success: true,
        message: wasEncrypted
          ? 'Backup criptografado AES-256 verificado e restaurado com sucesso!'
          : 'Backup restaurado com sucesso!',
        counts,
        isEncrypted: wasEncrypted,
      };
    } catch {
      return {
        success: false,
        message: 'Erro ao processar o arquivo de backup.',
      };
    }
  },

  async resetAllData(): Promise<void> {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    await seedData();
  },
};
