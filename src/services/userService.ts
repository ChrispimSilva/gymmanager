import { v4 as uuidv4 } from 'uuid';
import type { User, UserRole } from '../types';

const STORAGE_KEY = 'gymmanager-users';

// Default system users seeded on first run
const DEFAULT_USERS: User[] = [
  {
    id: 'usr-admin-001',
    name: 'Carlos Admin',
    email: 'admin@gym.com',
    password: 'admin123',
    role: 'admin' as UserRole,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'usr-inst-001',
    name: 'Prof. Rafael',
    email: 'instrutor@gym.com',
    password: 'instrutor123',
    role: 'instrutor' as UserRole,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'usr-aluno-001',
    name: 'Ana Silva',
    email: 'aluno@gym.com',
    password: 'aluno123',
    role: 'aluno' as UserRole,
    createdAt: '2026-01-01T00:00:00Z',
  },
];

function ensureDefaults(): void {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_USERS));
  }
}

function getAll(): User[] {
  ensureDefaults();
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

function save(users: User[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}

export const userService = {
  getAll(): User[] {
    return getAll();
  },

  findByEmail(email: string): User | undefined {
    return getAll().find(u => u.email.toLowerCase() === email.toLowerCase());
  },

  authenticate(email: string, password: string): User | null {
    const user = this.findByEmail(email);
    if (user && user.password === password) {
      return user;
    }
    return null;
  },

  register(data: { name: string; email: string; password: string; role: UserRole }): { success: boolean; user?: User; error?: string } {
    const existing = this.findByEmail(data.email);
    if (existing) {
      return { success: false, error: 'Este email já está cadastrado' };
    }

    if (data.password.length < 6) {
      return { success: false, error: 'A senha deve ter pelo menos 6 caracteres' };
    }

    const users = getAll();
    const newUser: User = {
      id: uuidv4(),
      name: data.name,
      email: data.email,
      password: data.password,
      role: data.role,
      createdAt: new Date().toISOString(),
    };
    users.push(newUser);
    save(users);
    return { success: true, user: newUser };
  },
};
