import { useMemo, useState } from 'react';
import exercisesData from '../data/exercises.json';
import { normalizeMuscleGroup, type NormalizedExercise, type Exercise } from '../types';

export function useExercises() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedEquipment, setSelectedEquipment] = useState<string>('');

  const exercises: NormalizedExercise[] = useMemo(() => {
    return (exercisesData as Exercise[]).map((ex, index) => ({
      ...ex,
      id: index,
      category: normalizeMuscleGroup(ex.musculos),
    }));
  }, []);

  const categories = useMemo(() => {
    const cats = [...new Set(exercises.map(e => e.category))].sort();
    return cats;
  }, [exercises]);

  const equipments = useMemo(() => {
    const equips = [...new Set(exercises.map(e => e.equipamento))].sort();
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
    getExerciseById: (id: number) => exercises[id],
  };
}
