import { equipmentRepository } from '../repositories';
import { activityService } from './activityService';
import type { EquipmentItem } from '../types';

export const equipmentService = {
  async getAll(): Promise<EquipmentItem[]> {
    return equipmentRepository.getAll();
  },

  async getById(id: string): Promise<EquipmentItem | null> {
    return equipmentRepository.getById(id);
  },

  async create(
    data: Omit<EquipmentItem, 'id' | 'createdAt'>,
    userId?: string
  ): Promise<EquipmentItem> {
    const item = await equipmentRepository.create(data);

    await activityService.log({
      userId: userId || 'usr-admin-001',
      type: 'equipment_added',
      description: `Novo aparelho cadastrado: ${item.name} (${item.location})`,
      relatedId: item.id,
    });

    return item;
  },

  async update(id: string, data: Partial<EquipmentItem>): Promise<EquipmentItem | null> {
    return equipmentRepository.update(id, data);
  },

  async delete(id: string): Promise<boolean> {
    return equipmentRepository.delete(id);
  },

  async search(query: string): Promise<EquipmentItem[]> {
    return equipmentRepository.search(query);
  },
};
