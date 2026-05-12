import { useMemo } from 'react';
import { History, Dumbbell, UserPlus, TrendingUp, FileEdit } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { activityService } from '../services/activityService';

const typeConfig: Record<string, { icon: LucideIcon; color: string; bg: string }> = {
  workout_created: { icon: Dumbbell, color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
  workout_completed: { icon: Dumbbell, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  workout_updated: { icon: FileEdit, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  student_added: { icon: UserPlus, color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  progress_recorded: { icon: TrendingUp, color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
};

export default function HistoryPage() {
  const activities = useMemo(() => activityService.getAll(), []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Histórico</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>Registro de todas as atividades</p>
      </div>

      {activities.length > 0 ? (
        <div className="space-y-3">
          {activities.map((activity, i) => {
            const config = typeConfig[activity.type] || typeConfig.workout_created;
            const Icon = config.icon;
            return (
              <div key={activity.id} className={`flex items-center gap-4 p-4 rounded-2xl border card-hover animate-slide-up`} style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)', animationDelay: `${i * 0.04}s`, animationFillMode: 'both' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: config.bg }}>
                  <Icon className="w-5 h-5" style={{ color: config.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{activity.description}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                    {new Date(activity.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16">
          <History className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-tertiary)' }} />
          <p className="text-lg font-medium" style={{ color: 'var(--text-secondary)' }}>Nenhum registro no histórico</p>
        </div>
      )}
    </div>
  );
}
