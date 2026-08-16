import { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/25';
      case 'warning':
        return 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/25';
      case 'primary':
      default:
        return 'gradient-brand shadow-brand-500/25';
    }
  };

  return (
    <div
      className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-3xl p-6 shadow-2xl border animate-scale-in"
        style={{
          background: 'var(--card-bg)',
          borderColor: 'var(--border-color)',
        }}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                {title}
              </h3>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-slate-400 hover:text-slate-200"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--text-secondary)' }}>
          {message}
        </p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all hover:bg-black/5 dark:hover:bg-white/5"
            style={{
              borderColor: 'var(--border-color)',
              color: 'var(--text-secondary)',
            }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-xl text-white text-sm font-semibold transition-all shadow-lg active:scale-[0.98] ${getVariantStyles()}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
