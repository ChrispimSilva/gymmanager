import { v4 as uuidv4 } from 'uuid';
import { DEFAULT_TENANT_ID, type Tenant } from '../../types';
import type { ITenantRepository } from '../interfaces/ITenantRepository';

const STORAGE_KEY = 'gymmanager-tenants';

const DEFAULT_TENANTS: Tenant[] = [
  {
    id: DEFAULT_TENANT_ID,
    slug: 'iron-force',
    name: 'GymManager Academia',
    ownerUserId: 'usr-admin-001',
    document: '12.345.678/0001-90',
    email: 'admin@gym.com',
    phone: '(11) 99999-0001',
    active: true,
    settings: {
      gymName: 'GymManager',
      logoUrl: '',
      primaryColor: '#10b981',
      themePreset: 'emerald',
    },
    licensing: {
      billingModel: 'per_seat',
      isPaid: false,
      pricePerSeatCents: 990,
      maxSeats: 50,
      billingStatus: 'free',
    },
    createdAt: '2026-01-01T00:00:00Z',
  },
];

export class LocalStorageTenantRepository implements ITenantRepository {
  private ensureDefaults(): void {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_TENANTS));
    }
  }

  private getStorageData(): Tenant[] {
    this.ensureDefaults();
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }

  private saveStorageData(tenants: Tenant[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tenants));
  }

  async getAll(): Promise<Tenant[]> {
    return this.getStorageData();
  }

  async getById(id: string): Promise<Tenant | null> {
    const tenant = this.getStorageData().find(t => t.id === id);
    return tenant || null;
  }

  async getBySlug(slug: string): Promise<Tenant | null> {
    const lower = slug.toLowerCase().trim();
    const tenant = this.getStorageData().find(t => t.slug.toLowerCase() === lower);
    return tenant || null;
  }

  async create(data: Omit<Tenant, 'id' | 'createdAt'> & { id?: string }): Promise<Tenant> {
    const tenants = this.getStorageData();
    const newTenant: Tenant = {
      ...data,
      id: data.id || `tenant-${uuidv4().slice(0, 8)}`,
      createdAt: new Date().toISOString(),
    };
    tenants.push(newTenant);
    this.saveStorageData(tenants);
    return newTenant;
  }

  async update(id: string, data: Partial<Tenant>): Promise<Tenant | null> {
    const tenants = this.getStorageData();
    const index = tenants.findIndex(t => t.id === id);
    if (index === -1) return null;

    tenants[index] = {
      ...tenants[index],
      ...data,
      settings: data.settings
        ? { ...tenants[index].settings, ...data.settings }
        : tenants[index].settings,
      licensing: data.licensing
        ? { ...tenants[index].licensing, ...data.licensing }
        : tenants[index].licensing,
    };
    this.saveStorageData(tenants);
    return tenants[index];
  }

  async toggleActive(id: string): Promise<Tenant | null> {
    const tenants = this.getStorageData();
    const index = tenants.findIndex(t => t.id === id);
    if (index === -1) return null;

    tenants[index].active = !tenants[index].active;
    tenants[index].licensing.billingStatus = tenants[index].active ? 'free' : 'suspended';
    this.saveStorageData(tenants);
    return tenants[index];
  }

  async delete(id: string): Promise<boolean> {
    const tenants = this.getStorageData();
    const filtered = tenants.filter(t => t.id !== id);
    if (filtered.length === tenants.length) return false;
    this.saveStorageData(filtered);
    return true;
  }
}
