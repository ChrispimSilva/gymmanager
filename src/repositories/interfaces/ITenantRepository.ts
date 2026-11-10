import type { Tenant } from '../../types';

export interface ITenantRepository {
  getAll(): Promise<Tenant[]>;
  getById(id: string): Promise<Tenant | null>;
  getBySlug(slug: string): Promise<Tenant | null>;
  create(data: Omit<Tenant, 'id' | 'createdAt'> & { id?: string }): Promise<Tenant>;
  update(id: string, data: Partial<Tenant>): Promise<Tenant | null>;
  toggleActive(id: string): Promise<Tenant | null>;
  delete(id: string): Promise<boolean>;
}
