import { v4 as uuidv4 } from 'uuid';
import type { EquipmentItem } from '../../types';
import type { IEquipmentRepository } from '../interfaces/IEquipmentRepository';
import { matchesActiveTenant, resolveTenantId } from '../../utils/tenantContext';

const STORAGE_KEY = 'gymmanager-equipments';

const DEFAULT_EQUIPMENTS: EquipmentItem[] = [
  {
    id: 'eq-001',
    name: 'Leg Press 45°',
    brand: 'Movement',
    model: 'Linha Hi-Tech',
    location: 'Área Maromba - Piso 1',
    status: 'ativo',
    notes: 'Capacidade até 450kg de anilhas',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'eq-002',
    name: 'Cadeira Extensora',
    brand: 'Matrix',
    model: 'Versa Series',
    location: 'Área Maromba - Piso 1',
    status: 'ativo',
    notes: 'Placas de peso de 5 em 5kg',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'eq-003',
    name: 'Crossover Angular com Polias Reguláveis',
    brand: 'GervaSport',
    model: 'Pró Master',
    location: 'Andar 2 - Musculação Livre',
    status: 'ativo',
    notes: 'Cabos substituídos na última revisão',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'eq-004',
    name: 'Esteira Ergométrica Profissional',
    brand: 'Movement',
    model: 'RT 250 G2',
    location: 'Setor Cardio - Andar 2',
    status: 'ativo',
    notes: 'Velocidade máx 18km/h, inclinação eletrônica',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'eq-005',
    name: 'Smith Machine / Barra Guiada',
    brand: 'Technogym',
    model: 'Selection Pro',
    location: 'Área Maromba - Piso 1',
    status: 'ativo',
    notes: 'Trava de segurança ajustável',
    createdAt: '2026-01-01T00:00:00Z',
  },
];

export class LocalStorageEquipmentRepository implements IEquipmentRepository {
  private ensureDefaults(): void {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_EQUIPMENTS));
    }
  }

  private getStorageData(): EquipmentItem[] {
    this.ensureDefaults();
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }

  private saveStorageData(equipments: EquipmentItem[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(equipments));
  }

  async getAll(): Promise<EquipmentItem[]> {
    return this.getStorageData().filter(e => matchesActiveTenant(e.tenantId));
  }

  async getById(id: string): Promise<EquipmentItem | null> {
    const item = this.getStorageData().find(e => e.id === id);
    return item || null;
  }

  async create(
    equipment: Omit<EquipmentItem, 'id' | 'createdAt'>
  ): Promise<EquipmentItem> {
    const equipments = this.getStorageData();
    const newItem: EquipmentItem = {
      ...equipment,
      tenantId: resolveTenantId(equipment.tenantId),
      id: `eq-${uuidv4().slice(0, 8)}`,
      createdAt: new Date().toISOString(),
    };
    equipments.push(newItem);
    this.saveStorageData(equipments);
    return newItem;
  }

  async update(
    id: string,
    data: Partial<EquipmentItem>
  ): Promise<EquipmentItem | null> {
    const equipments = this.getStorageData();
    const index = equipments.findIndex(e => e.id === id);
    if (index === -1) return null;

    equipments[index] = { ...equipments[index], ...data };
    this.saveStorageData(equipments);
    return equipments[index];
  }

  async delete(id: string): Promise<boolean> {
    const equipments = this.getStorageData();
    const filtered = equipments.filter(e => e.id !== id);
    if (filtered.length === equipments.length) return false;
    this.saveStorageData(filtered);
    return true;
  }

  async search(query: string): Promise<EquipmentItem[]> {
    const lower = query.toLowerCase();
    const all = await this.getAll();
    return all.filter(
      e =>
        e.name.toLowerCase().includes(lower) ||
        (e.brand && e.brand.toLowerCase().includes(lower)) ||
        (e.model && e.model.toLowerCase().includes(lower)) ||
        e.location.toLowerCase().includes(lower)
    );
  }

  async getByLocation(location: string): Promise<EquipmentItem[]> {
    const lower = location.toLowerCase();
    const all = await this.getAll();
    return all.filter(e =>
      e.location.toLowerCase().includes(lower)
    );
  }
}
