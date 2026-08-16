import { useState, useEffect } from 'react';
import { X, Search, Check, UserCheck } from 'lucide-react';
import { studentService } from '../../services/studentService';
import { workoutService } from '../../services/workoutService';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import type { Workout, Student } from '../../types';

interface PrescribeWorkoutModalProps {
  workout: Workout | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function PrescribeWorkoutModal({
  workout,
  isOpen,
  onClose,
  onSuccess,
}: PrescribeWorkoutModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    if (isOpen) {
      async function loadStudents() {
        setLoading(true);
        try {
          const list = await studentService.getAll();
          if (active) {
            setStudents(list.filter(s => s.active));
          }
        } finally {
          if (active) setLoading(false);
        }
      }
      void loadStudents();
    }
    return () => {
      active = false;
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !workout) return null;

  const filteredStudents = students.filter(
    s =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase()) ||
      s.goal.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelectStudent = (studentId: string) => {
    setSelectedStudentIds(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleSelectAll = () => {
    if (selectedStudentIds.length === filteredStudents.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(filteredStudents.map(s => s.id));
    }
  };

  const handlePrescribe = async () => {
    if (selectedStudentIds.length === 0) {
      toast.error('Selecione pelo menos um aluno.');
      return;
    }

    setSubmitting(true);
    try {
      for (const studentId of selectedStudentIds) {
        await workoutService.prescribeToStudent(workout.id, studentId, user?.id);
      }

      toast.success(
        `Treino "${workout.name}" prescrito com sucesso para ${selectedStudentIds.length} aluno(s)!`,
        'Prescrição Concluída'
      );
      onSuccess?.();
      onClose();
    } catch {
      toast.error('Erro ao prescrever treino aos alunos.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl p-5 sm:p-6 shadow-2xl border animate-scale-in max-h-[90vh] flex flex-col"
        style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div
          className="flex items-center justify-between pb-3 mb-4 border-b flex-shrink-0"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center flex-shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                Prescrever Treino
              </h2>
              <p className="text-xs truncate max-w-[240px] sm:max-w-xs font-semibold text-brand-500">
                {workout.name} ({workout.muscleGroup})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" style={{ color: 'var(--text-tertiary)' }} />
          </button>
        </div>

        {/* Search Students */}
        <div className="relative mb-3 flex-shrink-0">
          <Search
            className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--text-tertiary)' }}
          />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar aluno por nome, e-mail ou objetivo..."
            className="w-full pr-4 py-3 rounded-2xl border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/50 min-h-[46px]"
            style={{
              paddingLeft: '2.75rem',
              background: 'var(--bg-tertiary)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)',
            }}
          />
        </div>

        {/* Select All Bar */}
        <div className="flex items-center justify-between px-1 mb-2 text-xs flex-shrink-0">
          <span style={{ color: 'var(--text-tertiary)' }}>
            {selectedStudentIds.length} selecionado(s) de {filteredStudents.length}
          </span>
          <button
            type="button"
            onClick={handleSelectAll}
            className="text-xs font-bold hover:underline cursor-pointer"
            style={{ color: 'var(--accent)' }}
          >
            {selectedStudentIds.length === filteredStudents.length
              ? 'Desmarcar Todos'
              : 'Selecionar Todos'}
          </button>
        </div>

        {/* Students List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[160px] max-h-[300px]">
          {loading ? (
            <p className="text-xs text-center py-8" style={{ color: 'var(--text-tertiary)' }}>
              Carregando lista de alunos...
            </p>
          ) : filteredStudents.length === 0 ? (
            <p className="text-xs text-center py-8" style={{ color: 'var(--text-tertiary)' }}>
              Nenhum aluno ativo encontrado.
            </p>
          ) : (
            filteredStudents.map(std => {
              const isSelected = selectedStudentIds.includes(std.id);
              return (
                <div
                  key={std.id}
                  onClick={() => toggleSelectStudent(std.id)}
                  className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-brand-500 bg-brand-500/10'
                      : 'hover:border-brand-500/30'
                  }`}
                  style={{
                    background: isSelected ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-tertiary)',
                    borderColor: isSelected ? 'var(--accent)' : 'var(--border-color)',
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl gradient-brand flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                      {std.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                        {std.name}
                      </p>
                      <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                        {std.goal} • {std.weight}kg
                      </p>
                    </div>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-brand-500 border-brand-500 text-white shadow-sm'
                        : 'border-slate-400'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div
          className="flex gap-3 pt-4 mt-3 border-t flex-shrink-0"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl border text-sm font-bold hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer min-h-[46px]"
            style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={submitting || selectedStudentIds.length === 0}
            onClick={handlePrescribe}
            className="flex-1 py-3 rounded-2xl text-white text-sm font-bold shadow-lg transition-all hover:scale-102 active:scale-98 cursor-pointer disabled:opacity-50 min-h-[46px]"
            style={{ background: 'var(--accent)' }}
          >
            {submitting
              ? 'Prescrevendo...'
              : `Prescrever para ${selectedStudentIds.length} Aluno(s)`}
          </button>
        </div>
      </div>
    </div>
  );
}
