import { v4 as uuidv4 } from 'uuid';
import { DEFAULT_TENANT_ID, type User, type UserRole } from '../../types';
import type { IUserRepository } from '../interfaces/IUserRepository';
import type { IStudentRepository } from '../interfaces/IStudentRepository';
import { normalizeUserRole, resolveTenantId } from '../../utils/tenantContext';

const STORAGE_KEY = 'gymmanager-users';

const DEFAULT_USERS: User[] = [
  {
    id: 'usr-superadmin-001',
    name: 'Master SuperAdmin',
    email: 'superadmin@gym.com',
    password: 'super123',
    role: 'superadmin',
    active: true,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'usr-admin-001',
    name: 'Carlos Admin',
    email: 'admin@gym.com',
    password: 'admin123',
    role: 'admin',
    tenantId: DEFAULT_TENANT_ID,
    active: true,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'usr-inst-001',
    name: 'Prof. Rafael',
    email: 'personal@gym.com',
    password: 'personal123',
    role: 'personal',
    tenantId: DEFAULT_TENANT_ID,
    specialty: 'Hipertrofia & Força',
    cref: '012345-G/SP',
    phone: '(11) 98888-1111',
    active: true,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'usr-aluno-001',
    name: 'Ana Silva',
    email: 'aluno@gym.com',
    password: 'aluno123',
    role: 'aluno',
    tenantId: DEFAULT_TENANT_ID,
    active: true,
    createdAt: '2026-01-01T00:00:00Z',
  },
];

export class LocalStorageUserRepository implements IUserRepository {
  private studentRepo?: IStudentRepository;

  constructor(studentRepo?: IStudentRepository) {
    this.studentRepo = studentRepo;
  }

  private ensureDefaults(): void {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_USERS));
      return;
    }

    try {
      const parsed = JSON.parse(data) as User[];
      let mutated = false;

      // Migrate legacy 'instrutor' role and missing tenantId
      const normalized = parsed.map(u => {
        const normRole = normalizeUserRole(u.role);
        const needsTenant = normRole !== 'superadmin' && !u.tenantId;
        const needsActive = u.active === undefined;
        if (normRole !== u.role || needsTenant || needsActive) {
          mutated = true;
          return {
            ...u,
            role: normRole,
            tenantId: normRole === 'superadmin' ? undefined : (u.tenantId || DEFAULT_TENANT_ID),
            active: u.active ?? true,
          };
        }
        return u;
      });

      // Ensure superadmin exists even on migrated localStorage
      if (!normalized.some(u => u.role === 'superadmin')) {
        normalized.unshift(DEFAULT_USERS[0]);
        mutated = true;
      }

      if (mutated) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
      }
    } catch {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_USERS));
    }
  }

  private getStorageData(): User[] {
    this.ensureDefaults();
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }

  private saveStorageData(users: User[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
  }

  async getAll(tenantId?: string): Promise<User[]> {
    const all = this.getStorageData();
    if (!tenantId) return all;
    return all.filter(u => u.role !== 'superadmin' && (u.tenantId || DEFAULT_TENANT_ID) === tenantId);
  }

  async getByRole(role: UserRole, tenantId?: string): Promise<User[]> {
    const normRole = normalizeUserRole(role);
    const all = await this.getAll(tenantId);
    return all.filter(u => u.role === normRole);
  }

  async findById(id: string): Promise<User | null> {
    const user = this.getStorageData().find(u => u.id === id);
    return user || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const lower = email.toLowerCase().trim();
    const users = this.getStorageData();
    const direct = users.find(u => u.email.toLowerCase() === lower);
    if (direct) return direct;

    // Backward-compatible alias for legacy instrutor@gym.com demo account when still unchanged
    if (lower === 'instrutor@gym.com') {
      return (
        users.find(
          u => u.id === 'usr-inst-001' && u.email.toLowerCase() === 'personal@gym.com'
        ) || null
      );
    }
    return null;
  }

  async authenticate(email: string, password: string): Promise<User | null> {
    const user = await this.findByEmail(email);
    if (!user) return null;

    const hasUnchangedLegacyDemoPassword =
      user.id === 'usr-inst-001' &&
      (user.password === 'personal123' || user.password === 'instrutor123');
    const isLegacyPersonalMatch =
      hasUnchangedLegacyDemoPassword &&
      (password === 'personal123' || password === 'instrutor123');

    if (user.password === password || isLegacyPersonalMatch) {
      return user;
    }
    return null;
  }

  async register(data: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    tenantId?: string;
    phone?: string;
    specialty?: string;
    cref?: string;
    active?: boolean;
  }): Promise<{ success: boolean; user?: User; error?: string }> {
    const existing = await this.findByEmail(data.email);
    if (existing) {
      return { success: false, error: 'Este email já está cadastrado' };
    }

    if (data.password.length < 6) {
      return { success: false, error: 'A senha deve ter pelo menos 6 caracteres' };
    }

    const normRole = normalizeUserRole(data.role);
    const assignedTenantId =
      normRole === 'superadmin' ? undefined : resolveTenantId(data.tenantId);

    const users = this.getStorageData();
    const newUser: User = {
      id: uuidv4(),
      name: data.name,
      email: data.email,
      password: data.password,
      role: normRole,
      tenantId: assignedTenantId,
      phone: data.phone,
      specialty: data.specialty,
      cref: data.cref,
      active: data.active ?? true,
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    this.saveStorageData(users);

    // Auto-create/link Student record when registering as an 'aluno'
    if (normRole === 'aluno' && this.studentRepo) {
      const existingStudent = await this.studentRepo.getByUserId(newUser.id);
      if (!existingStudent) {
        const allStudents = await this.studentRepo.getAll(assignedTenantId);
        const studentByEmail = allStudents.find(
          s =>
            s.email.toLowerCase() === newUser.email.toLowerCase() &&
            (!assignedTenantId || (s.tenantId || DEFAULT_TENANT_ID) === assignedTenantId)
        );

        if (studentByEmail) {
          await this.studentRepo.update(studentByEmail.id, {
            userId: newUser.id,
            tenantId: assignedTenantId,
          });
        } else {
          await this.studentRepo.create({
            name: newUser.name,
            email: newUser.email,
            phone: data.phone || '',
            birthDate: '',
            weight: 70,
            height: 170,
            goal: 'Condicionamento',
            active: newUser.active ?? true,
            photo: '',
            userId: newUser.id,
            tenantId: assignedTenantId,
          });
        }
      }
    }

    return { success: true, user: newUser };
  }

  async update(id: string, data: Partial<User>): Promise<User | null> {
    const users = this.getStorageData();
    const index = users.findIndex(u => u.id === id);
    if (index === -1) return null;

    users[index] = {
      ...users[index],
      ...data,
    };
    this.saveStorageData(users);

    // If user is aluno, sync student profile if studentRepo is attached
    if (users[index].role === 'aluno' && this.studentRepo) {
      const student = await this.studentRepo.getByUserId(id);
      if (student) {
        await this.studentRepo.update(student.id, {
          ...(data.name ? { name: data.name } : {}),
          ...(data.email ? { email: data.email } : {}),
          ...(data.avatar ? { photo: data.avatar } : {}),
          ...(data.active !== undefined ? { active: data.active } : {}),
        });
      }
    }

    return users[index];
  }

  async toggleActive(id: string): Promise<User | null> {
    const user = await this.findById(id);
    if (!user) return null;
    return this.update(id, { active: !(user.active ?? true) });
  }

  async delete(id: string): Promise<boolean> {
    const users = this.getStorageData();
    const filtered = users.filter(u => u.id !== id);
    if (filtered.length === users.length) return false;
    this.saveStorageData(filtered);
    return true;
  }
}
