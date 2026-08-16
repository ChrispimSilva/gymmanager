import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageCustomExerciseRepository } from '../../repositories/localStorage/LocalStorageCustomExerciseRepository';

describe('LocalStorageCustomExerciseRepository', () => {
  let customRepo: LocalStorageCustomExerciseRepository;

  beforeEach(() => {
    localStorage.clear();
    customRepo = new LocalStorageCustomExerciseRepository();
  });

  it('should create and retrieve custom exercises', async () => {
    const exercise = await customRepo.create({
      nome: 'Elevação Lateral na Polia com Rotação',
      musculos: 'Deltóide lateral',
      category: 'Ombros',
      equipamento: 'Cabo',
      descricao: 'Excelente para foco isolado nos deltóides.',
      gif: 'https://example.com/lateral-raise.gif',
    });

    expect(exercise.id).toMatch(/^custom-/);
    expect(exercise.isCustom).toBe(true);

    const all = await customRepo.getAll();
    expect(all.length).toBe(1);
    expect(all[0].nome).toBe('Elevação Lateral na Polia com Rotação');
  });

  it('should update and delete custom exercise', async () => {
    const created = await customRepo.create({
      nome: 'Rosca Scott Unilateral',
      musculos: 'Bíceps braquial',
      category: 'Bíceps',
      equipamento: 'Halteres',
      descricao: 'Foco na cabeça curta do bíceps.',
      gif: '',
    });

    const updated = await customRepo.update(created.id, {
      nome: 'Rosca Scott Unilateral com Halter Pesado',
    });
    expect(updated?.nome).toBe('Rosca Scott Unilateral com Halter Pesado');

    const deleted = await customRepo.delete(created.id);
    expect(deleted).toBe(true);
    expect(await customRepo.getById(created.id)).toBeNull();
  });
});
