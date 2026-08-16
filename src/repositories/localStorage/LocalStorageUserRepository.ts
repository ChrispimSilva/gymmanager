import { v4 as uuidv4 } from 'uuid';
import type { User, UserRole } from '../../types';
import type { IUserRepository } from '../interfaces/IUserRepository';
import type { IStudentRepository } from '../interfaces/IStudentRepository';

const STORAGE_KEY = 'gymmanager-users';

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

export class LocalStorageUserRepository implements IUserRepository {
  private studentRepo?: IStudentRepository;

  constructor(studentRepo?: IStudentRepository) {
    this.studentRepo = studentRepo;
  }

  private ensureDefaults(): void {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
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

  async getAll(): Promise<User[]> {
    return this.getStorageData();
  }

  async findById(id: string): Promise<User | null> {
    const user = this.getStorageData().find(u => u.id === id);
    return user || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = this.getStorageData().find(u => u.email.toLowerCase() === email.toLowerCase());
    return user || null;
  }

  async authenticate(email: string, password: string): Promise<User | null> {
    const user = await this.findByEmail(email);
    if (user && user.password === password) {
      return user;
    }
    return null;
  }

  async register(data: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
  }): Promise<{ success: boolean; user?: User; error?: string }> {
    const existing = await this.findByEmail(data.email);
    if (existing) {
      return { success: false, error: 'Este email já está cadastrado' };
    }

    if (data.password.length < 6) {
      return { success: false, error: 'A senha deve ter pelo menos 6 caracteres' };
    }

    const users = this.getStorageData();
    const newUser: User = {
      id: uuidv4(),
      name: data.name,
      email: data.email,
      password: data.password,
      role: data.role,
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    this.saveStorageData(users);

    // Auto-create/link Student record when registering as an 'aluno'
    if (data.role === 'aluno' && this.studentRepo) {
      const existingStudent = await this.studentRepo.getByUserId(newUser.id);
      if (!existingStudent) {
        // Check if a student with matching email already exists
        const allStudents = await this.studentRepo.getAll();
        const studentByEmail = allStudents.find(
          s => s.email.toLowerCase() === newUser.email.toLowerCase()
        );

        if (studentByEmail) {
          await this.studentRepo.update(studentByEmail.id, { userId: newUser.id });
        } else {
          await this.studentRepo.create({
            name: newUser.name,
            email: newUser.email,
            phone: '',
            birthDate: '',
            weight: 70,
            height: 170,
            goal: 'Condicionamento',
            active: true,
            photo: '',
            userId: newUser.id,
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
        });
      }
    }

    return users[index];
  }
}
