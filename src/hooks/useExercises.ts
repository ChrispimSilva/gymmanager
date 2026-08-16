import { useMemo, useState, useEffect, useCallback } from 'react';
import exercisesData from '../data/exercises.json';
import { customExerciseService } from '../services/customExerciseService';
import { normalizeMuscleGroup, type NormalizedExercise, type Exercise, type CustomExercise } from '../types';

export function useExercises() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedEquipment, setSelectedEquipment] = useState<string>('');
  const [customExercises, setCustomExercises] = useState<CustomExercise[]>([]);

  const loadCustom = useCallback(async () => {
    try {
      const data = await customExerciseService.getAll();
      setCustomExercises(data);
    } catch {
      // Keep static exercises
    }
  }, []);

  useEffect(() => {
    let active = true;
    async function init() {
      try {
        const data = await customExerciseService.getAll();
        if (active) setCustomExercises(data);
      } catch {
        // Fallback gracefully
      }
    }
    void init();
    return () => { active = false; };
  }, []);

  const exercises: NormalizedExercise[] = useMemo(() => {
    const staticList: NormalizedExercise[] = (exercisesData as Exercise[]).map((ex, index) => ({
      ...ex,
      id: index,
      category: normalizeMuscleGroup(ex.musculos),
      isCustom: false,
    }));

    const customList: NormalizedExercise[] = customExercises.map(ex => ({
      ...ex,
      category: ex.category || normalizeMuscleGroup(ex.musculos),
      isCustom: true,
    }));

    return [...customList, ...staticList];
  }, [customExercises]);

  const categories = useMemo(() => {
    const cats = [...new Set(exercises.map(e => e.category))].filter(Boolean).sort();
    return cats;
  }, [exercises]);

  const equipments = useMemo(() => {
    const equips = [...new Set(exercises.map(e => e.equipamento))].filter(Boolean).sort();
    return equips;
  }, [exercises]);

  const filtered = useMemo(() => {
    let result = exercises;

    if (searchQuery) {
      const lower = searchQuery.toLowerCase();
      result = result.filter(e =>
        e.nome.toLowerCase().includes(lower) ||
        e.musculos.toLowerCase().includes(lower)
      );
    }

    if (selectedCategory) {
      result = result.filter(e => e.category === selectedCategory);
    }

    if (selectedEquipment) {
      result = result.filter(e => e.equipamento === selectedEquipment);
    }

    return result;
  }, [exercises, searchQuery, selectedCategory, selectedEquipment]);

  const exerciseMap = useMemo(() => {
    const map = new Map<string | number, NormalizedExercise>();
    exercises.forEach(e => {
      map.set(e.id, e);
      if (typeof e.id === 'number') {
        map.set(String(e.id), e);
      }
    });
    return map;
  }, [exercises]);

  const getExerciseById = useCallback((id: number | string): NormalizedExercise | undefined => {
    return exerciseMap.get(id);
  }, [exerciseMap]);

  return {
    exercises,
    filtered,
    categories,
    equipments,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    selectedEquipment,
    setSelectedEquipment,
    getExerciseById,
    reloadCustomExercises: loadCustom,
  };
}
