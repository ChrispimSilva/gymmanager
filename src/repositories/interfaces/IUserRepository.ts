import type { User, UserRole } from '../../types';

export interface IUserRepository {
  getAll(): Promise<User[]>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  authenticate(email: string, password: string): Promise<User | null>;
  register(data: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
  }): Promise<{ success: boolean; user?: User; error?: string }>;
  update(id: string, data: Partial<User>): Promise<User | null>;
}
