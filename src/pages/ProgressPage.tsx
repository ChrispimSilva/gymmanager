import { useState, useMemo } from 'react';
import { Plus, X, TrendingUp, Weight, Percent, Activity } from 'lucide-react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { progressService } from '../services/progressService';
import { studentService } from '../services/studentService';
import { activityService } from '../services/activityService';
import { useAuth } from '../contexts/AuthContext';
import type { PhysicalProgress, Student } from '../types';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

export default function ProgressPage() {
  const { user } = useAuth();
  const isAluno = user?.role === 'aluno';

  const students = useMemo(() => {
    if (isAluno && user) {
      // Aluno can only see their own student record
      const myStudent = studentService.getByUserId(user.id);
      return myStudent ? [myStudent] : [];
    }
    return studentService.getAll();
  }, [isAluno, user]);

  const [selectedStudentId, setSelectedStudentId] = useState(students[0]?.id || '');
  const [records, setRecords] = useState<PhysicalProgress[]>(() => selectedStudentId ? progressService.getByStudentId(selectedStudentId) : []);
  const [showForm, setShowForm] = useState(false);

  const selectedStudent = students.find(s => s.id === selectedStudentId);

  const handleStudentChange = (id: string) => {
    setSelectedStudentId(id);
    setRecords(progressService.getByStudentId(id));
  };

  const refresh = () => setRecords(progressService.getByStudentId(selectedStudentId));

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
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {isAluno ? 'Minha Evolução' : 'Evolução Física'}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
            {isAluno ? 'Acompanhe seu progresso' : 'Acompanhe o progresso dos alunos'}
          </p>
        </div>
        <div className="flex gap-3">
          {!isAluno && (
            <select value={selectedStudentId} onChange={e => handleStudentChange(e.target.value)} className="px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
              {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
          {!isAluno && (
            <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-brand text-white text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-brand-500/25">
              <Plus className="w-4 h-4" /> Registrar
            </button>
          )}
        </div>
      </div>

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

      {/* Records Table */}
      <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
        <h3 className="text-sm font-semibold p-4 border-b" style={{ color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}>Histórico de Medições</h3>
        {records.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr style={{ background: 'var(--bg-tertiary)' }}>
                {['Data', 'Peso', 'IMC', 'Gordura', 'Massa', ...(!isAluno ? [''] : [])].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {[...records].reverse().map(r => (
                  <tr key={r.id} className="border-t" style={{ borderColor: 'var(--border-color)' }}>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-primary)' }}>{new Date(r.recordedAt).toLocaleDateString('pt-BR')}</td>
                    <td className="px-4 py-3 text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{r.weight} kg</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{r.bmi}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{r.bodyFat ? `${r.bodyFat}%` : '—'}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{r.muscleMass ? `${r.muscleMass} kg` : '—'}</td>
                    {!isAluno && <td className="px-4 py-3"><button onClick={() => { progressService.delete(r.id); refresh(); }} className="text-red-400 text-xs hover:underline">Excluir</button></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12"><TrendingUp className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-tertiary)' }} /><p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Nenhum registro encontrado</p></div>
        )}
      </div>

      {showForm && selectedStudent && (
        <ProgressFormModal student={selectedStudent} onClose={() => setShowForm(false)} onSave={() => { refresh(); setShowForm(false); }} />
      )}
    </div>
  );
}

function ProgressFormModal({ student, onClose, onSave }: { student: Student; onClose: () => void; onSave: () => void }) {
  const [weight, setWeight] = useState(student.weight);
  const [bodyFat, setBodyFat] = useState<number | undefined>(undefined);
  const [muscleMass, setMuscleMass] = useState<number | undefined>(undefined);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    progressService.create({ studentId: student.id, weight, bodyFat, muscleMass, recordedAt: new Date(date).toISOString() }, student.height);
    activityService.log({ userId: 'usr-inst-001', type: 'progress_recorded', description: `Medidas registradas para ${student.name}` });
    onSave();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl p-6 shadow-2xl border animate-scale-in" style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Registrar Medidas</h2>
          <button onClick={onClose}><X className="w-5 h-5" style={{ color: 'var(--text-tertiary)' }} /></button>
        </div>
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>Aluno: <strong>{student.name}</strong></p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Data</label><input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Peso (kg)</label><input type="number" step="0.1" value={weight} onChange={e => setWeight(+e.target.value)} className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} required /></div>
            <div><label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Gordura (%)</label><input type="number" step="0.1" value={bodyFat || ''} onChange={e => setBodyFat(e.target.value ? +e.target.value : undefined)} className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} /></div>
            <div><label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Massa (kg)</label><input type="number" step="0.1" value={muscleMass || ''} onChange={e => setMuscleMass(e.target.value ? +e.target.value : undefined)} className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} /></div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border text-sm font-medium" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>Cancelar</button>
            <button type="submit" className="flex-1 py-2.5 rounded-xl gradient-brand text-white text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-brand-500/25">Salvar</button>
          </div>
        </form>
      </div>
    </div>
  );
}
