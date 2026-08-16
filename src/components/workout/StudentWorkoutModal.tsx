import { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Search,
  Dumbbell,
  Sparkles,
} from 'lucide-react';
import { workoutService } from '../../services/workoutService';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useExercises } from '../../hooks/useExercises';
import type { Workout, WorkoutExercise, Student, NormalizedExercise } from '../../types';

interface StudentWorkoutModalProps {
  student: Student | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (created: Workout) => void;
}

export function StudentWorkoutModal({
  student,
  isOpen,
  onClose,
  onSuccess,
}: StudentWorkoutModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { exercises } = useExercises();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [muscleGroup, setMuscleGroup] = useState('Geral');
  const [selectedExercises, setSelectedExercises] = useState<WorkoutExercise[]>([]);
  
  const [showSelector, setShowSelector] = useState(false);
  const [exSearch, setExSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setName('');
    setDescription('');
    setMuscleGroup('Geral');
    setSelectedExercises([]);
    setShowSelector(false);
    setExSearch('');
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredEx = exercises.filter(
    e =>
      e.nome.toLowerCase().includes(exSearch.toLowerCase()) ||
      e.musculos.toLowerCase().includes(exSearch.toLowerCase()) ||
      e.category.toLowerCase().includes(exSearch.toLowerCase())
  );

  const addExercise = (ex: NormalizedExercise) => {
    if (selectedExercises.find(se => se.exerciseId === ex.id)) return;
    setSelectedExercises(prev => [
      ...prev,
      {
        exerciseId: ex.id,
        sets: 3,
        repetitions: 12,
        weight: 10,
        notes: '',
        order: prev.length + 1,
      },
    ]);
    setShowSelector(false);
    setExSearch('');
  };

  const removeExercise = (idx: number) => {
    setSelectedExercises(prev => prev.filter((_, i) => i !== idx));
  };

  const updateEx = (idx: number, field: keyof WorkoutExercise, val: unknown) => {
    setSelectedExercises(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Informe o nome do treino.');
      return;
    }
    if (selectedExercises.length === 0) {
      toast.error('Adicione pelo menos um exercício ao treino.');
      return;
    }

    setSaving(true);
    try {
      const created = await workoutService.create({
        name: name.trim(),
        description: description.trim(),
        muscleGroup,
        studentId: student?.id,
        instructorId: user?.id || 'usr-aluno-001',
        isCommunity: false,
        authorName: user?.name,
        authorRole: user?.role,
        exercises: selectedExercises.map((ex, i) => ({ ...ex, order: i + 1 })),
      });

      toast.success(`Treino "${created.name}" criado com sucesso!`, 'Treino Salvo');
      resetForm();
      onSuccess?.(created);
      onClose();
    } catch {
      toast.error('Erro ao criar treino personalizado.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-3xl p-5 sm:p-6 shadow-2xl border animate-scale-in max-h-[90vh] flex flex-col"
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
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center flex-shrink-0">
              <Dumbbell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                Criar Meu Treino Personalizado
              </h2>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                Monte sua própria ficha escolhendo exercícios do catálogo
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

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Workout Name */}
          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
              Nome do Treino *
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              placeholder="Ex: Treino A - Peito & Tríceps Monstro"
              className="w-full px-4 py-3 rounded-2xl border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/50 min-h-[46px]"
              style={{
                background: 'var(--bg-tertiary)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          {/* Muscle Group & Description */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                Grupo Muscular Principal
              </label>
              <select
                value={muscleGroup}
                onChange={e => setMuscleGroup(e.target.value)}
                className="w-full px-3 py-3 rounded-2xl border text-sm font-medium focus:outline-none min-h-[46px] cursor-pointer"
                style={{
                  background: 'var(--bg-tertiary)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="Peito / Tríceps">Peito / Tríceps</option>
                <option value="Costas / Bíceps">Costas / Bíceps</option>
                <option value="Pernas / Glúteos">Pernas / Glúteos</option>
                <option value="Ombros / Trapézio">Ombros / Trapézio</option>
                <option value="Abdominais / Core">Abdominais / Core</option>
                <option value="Cardio / Hiit">Cardio / Hiit</option>
                <option value="Corpo Inteiro (Full Body)">Corpo Inteiro (Full Body)</option>
                <option value="Geral">Geral</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                Observação / Foco
              </label>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Ex: Foco em carga progressiva"
                className="w-full px-4 py-3 rounded-2xl border text-sm font-medium focus:outline-none min-h-[46px]"
                style={{
                  background: 'var(--bg-tertiary)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          </div>

          {/* Exercises Section */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                <Sparkles className="w-4 h-4 text-brand-500" />
                Exercícios Selecionados ({selectedExercises.length})
              </label>
              <button
                type="button"
                onClick={() => setShowSelector(!showSelector)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                style={{ background: 'var(--accent)', color: 'white' }}
              >
                <Plus className="w-3.5 h-3.5" />
                {showSelector ? 'Fechar Seletor' : 'Adicionar Exercício'}
              </button>
            </div>

            {/* Exercise Selector Box */}
            {showSelector && (
              <div
                className="p-4 rounded-3xl border animate-scale-in space-y-3 shadow-inner"
                style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)' }}
              >
                <div className="relative">
                  <Search
                    className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"
                  />
                  <input
                    type="text"
                    value={exSearch}
                    onChange={e => setExSearch(e.target.value)}
                    placeholder="Buscar por nome, músculo ou categoria..."
                    className="w-full pr-3 py-2.5 rounded-2xl border text-xs font-medium focus:outline-none min-h-[42px]"
                    style={{
                      paddingLeft: '2.75rem',
                      background: 'var(--bg-secondary)',
                      borderColor: 'var(--border-color)',
                      color: 'var(--text-primary)',
                    }}
                    autoFocus
                  />
                </div>

                <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
                  {filteredEx.slice(0, 25).map(ex => {
                    const isAlreadyAdded = !!selectedExercises.find(se => se.exerciseId === ex.id);
                    return (
                      <button
                        key={ex.id}
                        type="button"
                        onClick={() => addExercise(ex)}
                        disabled={isAlreadyAdded}
                        className={`w-full flex items-center justify-between p-2.5 rounded-2xl text-left transition-all ${
                          isAlreadyAdded
                            ? 'opacity-40 cursor-not-allowed'
                            : 'hover:bg-brand-500/10 hover:border-brand-500/30 cursor-pointer border border-transparent'
                        }`}
                        style={{ background: 'var(--card-bg)' }}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={ex.gif}
                            alt=""
                            className="w-10 h-10 rounded-xl object-contain bg-slate-900 border p-0.5 flex-shrink-0"
                            style={{ borderColor: 'var(--border-color)' }}
                            onError={e => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                              {ex.nome}
                            </p>
                            <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                              🎯 {ex.musculos} • {ex.equipamento}
                            </p>
                          </div>
                        </div>

                        {isAlreadyAdded ? (
                          <span className="text-[10px] font-bold text-slate-400 px-2 py-1 bg-slate-800 rounded-lg">
                            Adicionado
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-brand-500 flex items-center gap-1">
                            <Plus className="w-3.5 h-3.5" /> Adicionar
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Selected Exercises Table / Cards */}
            {selectedExercises.length === 0 ? (
              <div
                className="p-8 rounded-3xl border border-dashed text-center"
                style={{ borderColor: 'var(--border-color)', color: 'var(--text-tertiary)' }}
              >
                <Dumbbell className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-xs">Nenhum exercício adicionado ainda.</p>
                <p className="text-[10px] mt-1">Clique em "+ Adicionar Exercício" para montar sua rotina.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {selectedExercises.map((se, idx) => {
                  const exDetails = exercises.find(e => e.id === se.exerciseId);
                  return (
                    <div
                      key={se.exerciseId}
                      className="p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
                      style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)' }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-6 h-6 rounded-full bg-brand-500/10 text-brand-500 font-bold text-xs flex items-center justify-center flex-shrink-0">
                          {idx + 1}
                        </span>
                        {exDetails?.gif && (
                          <img
                            src={exDetails.gif}
                            alt=""
                            className="w-10 h-10 rounded-xl object-contain bg-slate-900 border p-0.5 flex-shrink-0"
                            style={{ borderColor: 'var(--border-color)' }}
                          />
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                            {exDetails?.nome || `Exercício #${se.exerciseId}`}
                          </p>
                          <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                            {exDetails?.musculos}
                          </p>
                        </div>
                      </div>

                      {/* Series, Reps, Weight inputs */}
                      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                        <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 px-2 py-1 rounded-xl">
                          <span className="text-[10px] font-bold text-slate-400">Séries:</span>
                          <input
                            type="number"
                            min="1"
                            max="20"
                            value={se.sets}
                            onChange={e => updateEx(idx, 'sets', Number(e.target.value))}
                            className="w-10 text-xs font-bold text-center bg-transparent focus:outline-none"
                            style={{ color: 'var(--text-primary)' }}
                          />
                        </div>

                        <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 px-2 py-1 rounded-xl">
                          <span className="text-[10px] font-bold text-slate-400">Reps:</span>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={se.repetitions}
                            onChange={e => updateEx(idx, 'repetitions', Number(e.target.value))}
                            className="w-10 text-xs font-bold text-center bg-transparent focus:outline-none"
                            style={{ color: 'var(--text-primary)' }}
                          />
                        </div>

                        <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 px-2 py-1 rounded-xl">
                          <span className="text-[10px] font-bold text-slate-400">Kg:</span>
                          <input
                            type="number"
                            min="0"
                            max="500"
                            value={se.weight}
                            onChange={e => updateEx(idx, 'weight', Number(e.target.value))}
                            className="w-12 text-xs font-bold text-center bg-transparent focus:outline-none"
                            style={{ color: 'var(--text-primary)' }}
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => removeExercise(idx)}
                          className="p-1.5 rounded-xl hover:bg-red-500/10 text-red-400 transition-colors cursor-pointer ml-auto sm:ml-0"
                          title="Remover"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div
            className="flex gap-3 pt-4 border-t flex-shrink-0"
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
              type="submit"
              disabled={saving || selectedExercises.length === 0}
              className="flex-1 py-3 rounded-2xl text-white text-sm font-bold shadow-lg transition-all hover:scale-102 active:scale-98 cursor-pointer disabled:opacity-50 min-h-[46px]"
              style={{ background: 'var(--accent)' }}
            >
              {saving ? 'Salvando...' : 'Salvar Treino'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
