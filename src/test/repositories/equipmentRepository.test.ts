import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageEquipmentRepository } from '../../repositories/localStorage/LocalStorageEquipmentRepository';

describe('LocalStorageEquipmentRepository', () => {
  let repo: LocalStorageEquipmentRepository;

  beforeEach(() => {
    localStorage.clear();
    repo = new LocalStorageEquipmentRepository();
  });

  it('should initialize with default equipments and list them', async () => {
    const list = await repo.getAll();
    expect(list.length).toBeGreaterThanOrEqual(4);
    expect(list.some(e => e.name.includes('Leg Press'))).toBe(true);
  });

  it('should create a new equipment', async () => {
    const newItem = await repo.create({
      name: 'Hack Squat 45°',
      brand: 'Movement',
      location: 'Área Maromba - Piso 1',
      status: 'ativo',
      notes: 'Suporta 400kg',
    });

    expect(newItem.id).toMatch(/^eq-/);
    expect(newItem.name).toBe('Hack Squat 45°');

    const fetched = await repo.getById(newItem.id);
    expect(fetched).not.toBeNull();
    expect(fetched?.location).toBe('Área Maromba - Piso 1');
  });

  it('should update and delete equipment', async () => {
    const item = await repo.create({
      name: 'Supino Reto com Trava',
      location: 'Andar 2',
      status: 'ativo',
    });

    const updated = await repo.update(item.id, { status: 'manutencao' });
    expect(updated?.status).toBe('manutencao');

    const deleted = await repo.delete(item.id);
    expect(deleted).toBe(true);

    const fetched = await repo.getById(item.id);
    expect(fetched).toBeNull();
  });

  it('should search equipments by query and filter by location', async () => {
    await repo.create({
      name: 'Remada Cavalinho Articulada',
      brand: 'Matrix',
      location: 'Setor Dorsal - Piso 1',
      status: 'ativo',
    });

    const searchResults = await repo.search('cavalinho');
    expect(searchResults).toHaveLength(1);
    expect(searchResults[0].name).toContain('Cavalinho');

    const locationResults = await repo.getByLocation('Dorsal');
    expect(locationResults).toHaveLength(1);
  });
});
