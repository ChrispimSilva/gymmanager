import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
  duration?: number;
}

interface ToastContextType {
  toast: {
    success: (message: string, title?: string) => void;
    error: (message: string, title?: string) => void;
    info: (message: string, title?: string) => void;
    warning: (message: string, title?: string) => void;
  };
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((type: ToastType, message: string, title?: string, duration = 3500) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: ToastItem = { id, type, message, title, duration };

    setToasts(prev => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const toast = {
    success: useCallback((message: string, title?: string) => addToast('success', message, title), [addToast]),
    error: useCallback((message: string, title?: string) => addToast('error', message, title), [addToast]),
    info: useCallback((message: string, title?: string) => addToast('info', message, title), [addToast]),
    warning: useCallback((message: string, title?: string) => addToast('warning', message, title), [addToast]),
  };

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-sky-500 flex-shrink-0" />;
    }
  };

  const getBorderColor = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'border-emerald-500/30 bg-emerald-500/10';
      case 'error':
        return 'border-rose-500/30 bg-rose-500/10';
      case 'warning':
        return 'border-amber-500/30 bg-amber-500/10';
      case 'info':
      default:
        return 'border-sky-500/30 bg-sky-500/10';
    }
  };

  return (
    <ToastContext.Provider value={{ toast, removeToast }}>
      {children}

      {/* Toast Container positioned top-center on mobile, top-right on desktop */}
      <div
        className="fixed top-4 right-4 left-4 sm:left-auto sm:right-6 sm:top-6 z-[9999] flex flex-col gap-2.5 max-w-sm w-auto pointer-events-none"
        aria-live="polite"
      >
        {toasts.map(t => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl shadow-2xl border backdrop-blur-xl transition-all duration-300 animate-slide-down ${getBorderColor(
              t.type
            )}`}
            style={{
              background: 'var(--card-bg)',
              color: 'var(--text-primary)',
            }}
            role="alert"
          >
            {getIcon(t.type)}
            <div className="flex-1 min-w-0">
              {t.title && (
                <h4 className="text-xs font-bold mb-0.5" style={{ color: 'var(--text-primary)' }}>
                  {t.title}
                </h4>
              )}
              <p className="text-xs font-medium leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {t.message}
              </p>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-slate-400 hover:text-slate-200 cursor-pointer"
              aria-label="Fechar notificação"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
