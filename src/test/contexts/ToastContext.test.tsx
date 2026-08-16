import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ToastProvider, useToast } from '../../contexts/ToastContext';

function TestComponent() {
  const { toast } = useToast();
  return (
    <div>
      <button onClick={() => toast.success('Operação realizada com sucesso!', 'Sucesso')}>
        Show Success
      </button>
      <button onClick={() => toast.error('Ocorreu um erro', 'Erro')}>
        Show Error
      </button>
    </div>
  );
}

describe('ToastContext', () => {
  it('should render toast notifications when triggered', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    const btn = screen.getByText('Show Success');
    act(() => {
      btn.click();
    });

    expect(screen.getByText('Operação realizada com sucesso!')).toBeInTheDocument();
    expect(screen.getByText('Sucesso')).toBeInTheDocument();
  });
});
