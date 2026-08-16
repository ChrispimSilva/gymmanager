import { describe, it, expect } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useExercises } from '../../hooks/useExercises';

describe('useExercises', () => {
  it('should load exercises and normalize muscle groups', async () => {
    const { result } = renderHook(() => useExercises());

    await waitFor(() => {
      expect(result.current.exercises.length).toBeGreaterThan(0);
    });

    expect(result.current.categories.length).toBeGreaterThan(0);
    expect(result.current.equipments.length).toBeGreaterThan(0);
  });

  it('should filter exercises by search query', async () => {
    const { result } = renderHook(() => useExercises());

    await waitFor(() => {
      expect(result.current.exercises.length).toBeGreaterThan(0);
    });

    act(() => {
      result.current.setSearchQuery('supino');
    });

    expect(
      result.current.filtered.every(
        e =>
          e.nome.toLowerCase().includes('supino') ||
          e.musculos.toLowerCase().includes('supino')
      )
    ).toBe(true);
  });
});
