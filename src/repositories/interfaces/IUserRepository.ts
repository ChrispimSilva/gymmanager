import type { User, UserRole } from '../../types';

export interface IUserRepository {
  getAll(tenantId?: string): Promise<User[]>;
  getByRole(role: UserRole, tenantId?: string): Promise<User[]>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  authenticate(email: string, password: string): Promise<User | null>;
  register(data: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    tenantId?: string;
    phone?: string;
    specialty?: string;
    cref?: string;
    active?: boolean;
  }): Promise<{ success: boolean; user?: User; error?: string }>;
  update(id: string, data: Partial<User>): Promise<User | null>;
  toggleActive(id: string): Promise<User | null>;
  delete(id: string): Promise<boolean>;
}
