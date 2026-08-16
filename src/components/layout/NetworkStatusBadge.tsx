import { Wifi, WifiOff } from 'lucide-react';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

export function NetworkStatusBadge() {
  const { isOnline } = useNetworkStatus();

  if (isOnline) {
    return (
      <div
        className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border transition-all"
        style={{
          background: 'rgba(16, 185, 129, 0.08)',
          borderColor: 'rgba(16, 185, 129, 0.25)',
          color: '#10b981',
        }}
        title="Conectado à internet. PWA pronto."
      >
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <Wifi className="w-3.5 h-3.5" />
        <span>Online</span>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border transition-all animate-pulse"
      style={{
        background: 'rgba(239, 68, 68, 0.1)',
        borderColor: 'rgba(239, 68, 68, 0.3)',
        color: '#ef4444',
      }}
      title="Sem internet. Você pode continuar usando o app offline!"
    >
      <WifiOff className="w-3.5 h-3.5" />
      <span>Modo Offline (Salvo Localmente)</span>
    </div>
  );
}
