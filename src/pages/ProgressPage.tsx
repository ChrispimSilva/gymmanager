import { useState, useMemo, useEffect } from 'react';
import { Plus, X, TrendingUp, Weight, Percent, Activity } from 'lucide-react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { progressService } from '../services/progressService';
import { studentService } from '../services/studentService';
import { activityService } from '../services/activityService';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import type { PhysicalProgress, Student } from '../types';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

export default function ProgressPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAluno = user?.role === 'aluno';

  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [records, setRecords] = useState<PhysicalProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Confirm delete dialog state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function init() {
      try {
        if (isAluno && user) {
          const myStudent = await studentService.getByUserId(user.id);
          const sList = myStudent ? [myStudent] : [];
          if (active) {
            setStudents(sList);
            if (sList.length > 0) setSelectedStudentId(sList[0].id);
          }
        } else {
          const sList = await studentService.getAll();
          if (active) {
            setStudents(sList);
            if (sList.length > 0) setSelectedStudentId(prev => prev || sList[0].id);
          }
        }
      } catch {
        if (active) toast.error('Erro ao carregar alunos.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void init();
    return () => { active = false; };
  }, [isAluno, user, toast]);

  useEffect(() => {
    let active = true;
    if (!selectedStudentId) {
      return;
    }
    async function fetchRecords() {
      try {
        const data = await progressService.getByStudentId(selectedStudentId);
        if (active) setRecords(data);
      } catch {
        if (active) toast.error('Erro ao carregar registros de evolução.');
      }
    }
    void fetchRecords();
    return () => { active = false; };
  }, [selectedStudentId, toast]);

  const selectedStudent = students.find(s => s.id === selectedStudentId);

  const handleStudentChange = (id: string) => {
    setSelectedStudentId(id);
  };

  const refresh = async () => {
    if (selectedStudentId) {
      try {
        const data = await progressService.getByStudentId(selectedStudentId);
        setRecords(data);
      } catch {
        toast.error('Erro ao atualizar registros.');
      }
    }
  };

  const handleOpenDelete = (id: string) => {
    setRecordToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!recordToDelete) return;
    try {
      await progressService.delete(recordToDelete);
      toast.success('Medição excluída com sucesso!', 'Exclusão concluída');
      refresh();
    } catch {
      toast.error('Erro ao excluir medição.');
    } finally {
      setDeleteConfirmOpen(false);
      setRecordToDelete(null);
    }
  };

  const chartData = useMemo(() => ({
    labels: records.map(r => new Date(r.recordedAt).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })),
    datasets: [
      { label: 'Peso (kg)', data: records.map(r => r.weight), borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', fill: true, tension: 0.4 },
      { label: '% Gordura', data: records.map(r => r.bodyFat || 0), borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.1)', fill: true, tension: 0.4 },
      { label: 'Massa Muscular (kg)', data: records.map(r => r.muscleMass || 0), borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.1)', fill: true, tension: 0.4 },
    ],
  }), [records]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'top' as const, labels: { usePointStyle: true, padding: 15, font: { size: 11 } } }, tooltip: { mode: 'index' as const, intersect: false } },
    scales: { y: { grid: { color: 'rgba(148,163,184,0.1)' } }, x: { grid: { display: false } } },
  };

  const latest = records[records.length - 1];
  const previous = records[records.length - 2];
  const diff = (field: 'weight' | 'bodyFat' | 'muscleMass') => latest && previous ? ((latest[field] || 0) - (previous[field] || 0)).toFixed(1) : null;

  return (
    <div className="space-y-6 animate-fade-in pb-20 md:pb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {isAluno ? 'Minha Evolução' : 'Evolução Física'}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
            {isAluno ? 'Acompanhe e registre seu progresso corporal' : 'Acompanhe o progresso dos alunos'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {!isAluno && students.length > 0 && (
            <select
              value={selectedStudentId}
              onChange={e => handleStudentChange(e.target.value)}
              className="px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
            >
              {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
          {selectedStudent && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-brand text-white text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-brand-500/25 cursor-pointer min-h-[42px]"
            >
              <Plus className="w-4 h-4" /> {isAluno ? 'Registrar Minha Evolução' : 'Registrar'}
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="rounded-2xl p-4 border animate-pulse h-28" style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }} />
          ))}
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          {latest && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: 'Peso Atual', value: `${latest.weight} kg`, icon: Weight, color: '#10b981', diff: diff('weight'), unit: 'kg' },
                { label: 'IMC', value: latest.bmi.toFixed(1), icon: Activity, color: '#3b82f6', diff: null, unit: '' },
                { label: '% Gordura', value: `${latest.bodyFat || '—'}%`, icon: Percent, color: '#f59e0b', diff: diff('bodyFat'), unit: '%' },
                { label: 'Massa Muscular', value: `${latest.muscleMass || '—'} kg`, icon: TrendingUp, color: '#6366f1', diff: diff('muscleMass'), unit: 'kg' },
              ].map(card => (
                <div key={card.label} className="rounded-2xl p-4 border card-hover" style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2" style={{ background: `${card.color}15` }}>
                    <card.icon className="w-4 h-4" style={{ color: card.color }} />
                  </div>
                  <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{card.value}</p>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    {card.label}
                    {card.diff && <span className={`ml-1 ${Number(card.diff) < 0 ? 'text-green-500' : Number(card.diff) > 0 ? 'text-red-400' : ''}`}>{Number(card.diff) > 0 ? '+' : ''}{card.diff}{card.unit}</span>}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Chart */}
          {records.length > 1 && (
            <div className="rounded-2xl p-5 border" style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
              <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Gráfico de Evolução</h3>
              <div className="h-72"><Line data={chartData} options={chartOptions} /></div>
            </div>
          )}

          {/* History Table */}
          <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-color)' }}>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Histórico de Medições</h3>
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{records.length} registro(s)</span>
            </div>
            {records.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left" style={{ borderColor: 'var(--border-color)', color: 'var(--text-tertiary)' }}>
                      <th className="p-3 font-medium">Data</th>
                      <th className="p-3 font-medium">Peso</th>
                      <th className="p-3 font-medium">IMC</th>
                      <th className="p-3 font-medium">% Gordura</th>
                      <th className="p-3 font-medium">Massa Muscular</th>
                      <th className="p-3 font-medium text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.slice().reverse().map(r => (
                      <tr key={r.id} className="border-b last:border-0 hover:bg-black/5 dark:hover:bg-white/5 transition-colors" style={{ borderColor: 'var(--border-color)' }}>
                        <td className="p-3 font-medium" style={{ color: 'var(--text-primary)' }}>
                          {new Date(r.recordedAt).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="p-3 font-semibold" style={{ color: 'var(--text-primary)' }}>{r.weight} kg</td>
                        <td className="p-3" style={{ color: 'var(--text-secondary)' }}>{r.bmi.toFixed(1)}</td>
                        <td className="p-3" style={{ color: 'var(--text-secondary)' }}>{r.bodyFat ? `${r.bodyFat}%` : '—'}</td>
                        <td className="p-3" style={{ color: 'var(--text-secondary)' }}>{r.muscleMass ? `${r.muscleMass} kg` : '—'}</td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleOpenDelete(r.id)}
                            className="text-xs text-red-500 hover:text-red-600 transition-colors cursor-pointer font-medium p-1 rounded-lg hover:bg-red-500/10"
                            title="Excluir medição"
                          >
                            Excluir
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 px-4">
                <TrendingUp className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-tertiary)' }} />
                <p className="text-sm font-medium" style={{ color: 'var(--text-tertiary)' }}>Nenhum registro de evolução encontrado</p>
                {selectedStudent && (
                  <button
                    onClick={() => setShowForm(true)}
                    className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-brand text-white text-xs font-semibold hover:opacity-90 transition-all cursor-pointer shadow-md"
                  >
                    <Plus className="w-4 h-4" /> {isAluno ? 'Registrar Minha Primeira Medição' : 'Registrar Primeira Medição'}
                  </button>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {showForm && selectedStudent && (
        <ProgressFormModal
          student={selectedStudent}
          isAluno={isAluno}
          currentUserId={user?.id}
          onClose={() => setShowForm(false)}
          onSave={() => { refresh(); setShowForm(false); }}
        />
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        title="Excluir Medição"
        message="Tem certeza que deseja excluir esta medição física do histórico?"
        confirmLabel="Sim, Excluir"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => { setDeleteConfirmOpen(false); setRecordToDelete(null); }}
      />
    </div>
  );
}

function ProgressFormModal({
  student,
  isAluno,
  currentUserId,
  onClose,
  onSave,
}: {
  student: Student;
  isAluno: boolean;
  currentUserId?: string;
  onClose: () => void;
  onSave: () => void;
}) {
  const { toast } = useToast();
  const [weight, setWeight] = useState(student.weight);
  const [bodyFat, setBodyFat] = useState<number | undefined>(undefined);
  const [muscleMass, setMuscleMass] = useState<number | undefined>(undefined);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weight || weight <= 0) {
      toast.error('Informe um peso válido.');
      return;
    }

    setSaving(true);
    try {
      await progressService.create(
        { studentId: student.id, weight, bodyFat, muscleMass, recordedAt: new Date(date).toISOString() },
        student.height
      );
      await activityService.log({
        userId: currentUserId || 'usr-inst-001',
        type: 'progress_recorded',
        description: isAluno
          ? `${student.name} registrou sua própria evolução física (${weight} kg)`
          : `Medidas registradas para ${student.name}`,
        relatedId: student.id,
      });
      toast.success(
        isAluno ? 'Sua evolução física foi registrada com sucesso!' : `Medidas de ${student.name} registradas com sucesso!`,
        'Evolução registrada'
      );
      onSave();
    } catch {
      toast.error('Erro ao registrar evolução.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-3xl p-6 shadow-2xl border animate-scale-in"
        style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            {isAluno ? 'Registrar Minha Evolução' : 'Registrar Medidas'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer">
            <X className="w-5 h-5" style={{ color: 'var(--text-tertiary)' }} />
          </button>
        </div>
        <p className="text-xs mb-5" style={{ color: 'var(--text-secondary)' }}>
          {isAluno ? 'Atualize seu peso e medidas corporais para acompanhar seu gráfico' : <>Aluno: <strong>{student.name}</strong></>}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Data da Medição</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Peso (kg) *</label>
              <input
                type="number"
                step="0.1"
                min="20"
                max="300"
                value={weight}
                onChange={e => setWeight(+e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Gordura (%)</label>
              <input
                type="number"
                step="0.1"
                min="1"
                max="70"
                value={bodyFat ?? ''}
                onChange={e => setBodyFat(e.target.value ? +e.target.value : undefined)}
                placeholder="Ex: 15.5"
                className="w-full px-3 py-2.5 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Massa (kg)</label>
              <input
                type="number"
                step="0.1"
                min="10"
                max="200"
                value={muscleMass ?? ''}
                onChange={e => setMuscleMass(e.target.value ? +e.target.value : undefined)}
                placeholder="Ex: 35.0"
                className="w-full px-3 py-2.5 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
              />
            </div>
          </div>
          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border text-sm font-medium cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl gradient-brand text-white text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-brand-500/25 cursor-pointer disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Salvar Medição'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
