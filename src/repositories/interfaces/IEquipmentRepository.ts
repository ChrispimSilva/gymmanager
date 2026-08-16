import type { EquipmentItem } from '../../types';

export interface IEquipmentRepository {
  getAll(): Promise<EquipmentItem[]>;
  getById(id: string): Promise<EquipmentItem | null>;
  create(equipment: Omit<EquipmentItem, 'id' | 'createdAt'>): Promise<EquipmentItem>;
  update(id: string, data: Partial<EquipmentItem>): Promise<EquipmentItem | null>;
  delete(id: string): Promise<boolean>;
  search(query: string): Promise<EquipmentItem[]>;
  getByLocation(location: string): Promise<EquipmentItem[]>;
}
