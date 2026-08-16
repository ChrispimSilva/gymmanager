import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

describe('useNetworkStatus', () => {
  it('should return initial network status', () => {
    const { result } = renderHook(() => useNetworkStatus());
    expect(typeof result.current.isOnline).toBe('boolean');
  });

  it('should react to online and offline window events', () => {
    const { result } = renderHook(() => useNetworkStatus());

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(result.current.isOnline).toBe(false);

    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(result.current.isOnline).toBe(true);
  });
});
