import { useState, useEffect } from 'react';
import { X, Plus, Dumbbell } from 'lucide-react';
import { customExerciseService } from '../../services/customExerciseService';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { MUSCLE_CATEGORIES, EQUIPMENT_TYPES, normalizeMuscleGroup } from '../../types';

interface CustomExerciseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CustomExerciseModal({
  isOpen,
  onClose,
  onCreated,
}: CustomExerciseModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [nome, setNome] = useState('');
  const [musculos, setMusculos] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Peito');
  const [equipamento, setEquipamento] = useState('Halteres');
  const [descricao, setDescricao] = useState('');
  const [gifUrl, setGifUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      toast.warning('Informe o nome do exercício.');
      return;
    }

    setIsSubmitting(true);
    try {
      await customExerciseService.create(
        {
          nome: nome.trim(),
          musculos: musculos.trim() || selectedCategory,
          category: selectedCategory || normalizeMuscleGroup(musculos),
          equipamento,
          descricao: descricao.trim(),
          gif: gifUrl.trim() || 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/3_4_Sit-Up/0.jpg',
        },
        user?.id
      );

      toast.success('Exercício personalizado criado com sucesso!', 'Exercício Criado');
      onCreated();
      onClose();
    } catch {
      toast.error('Erro ao salvar exercício personalizado.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = Object.keys(MUSCLE_CATEGORIES);

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl p-6 shadow-2xl border animate-scale-in max-h-[90vh] overflow-y-auto"
        style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
        onClick={e => e.stopPropagation()}
        role="dialog"
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-500/10 text-brand-500 flex items-center justify-center">
              <Dumbbell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                Novo Exercício Personalizado
              </h2>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                Adicione exercícios exclusivos ao catálogo da academia
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer">
            <X className="w-5 h-5" style={{ color: 'var(--text-tertiary)' }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Exercise Name */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Nome do Exercício *
            </label>
            <input
              type="text"
              required
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Ex: Supino Inclinado com Halteres Pronado"
              className="w-full px-4 py-2.5 rounded-2xl border text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              style={{
                background: 'var(--bg-secondary)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          {/* Muscle Group & Category */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Grupo Muscular Principal *
              </label>
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2.5 rounded-2xl border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                style={{
                  background: 'var(--bg-secondary)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                }}
              >
                {categories.map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Equipamento *
              </label>
              <select
                value={equipamento}
                onChange={e => setEquipamento(e.target.value)}
                className="w-full px-3 py-2.5 rounded-2xl border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                style={{
                  background: 'var(--bg-secondary)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                }}
              >
                {EQUIPMENT_TYPES.map(eq => (
                  <option key={eq} value={eq}>
                    {eq}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Specific Muscles targeted */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Músculos Trabalhados (Opcional)
            </label>
            <input
              type="text"
              value={musculos}
              onChange={e => setMusculos(e.target.value)}
              placeholder="Ex: Peitoral maior clavicular, deltóide anterior, tríceps"
              className="w-full px-4 py-2 rounded-2xl border text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              style={{
                background: 'var(--bg-secondary)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          {/* Description / Instructions */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Instruções de Execução
            </label>
            <textarea
              rows={3}
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              placeholder="Descreva a postura, amplitude de movimento e dicas de respiração..."
              className="w-full px-4 py-2 rounded-2xl border text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/50 resize-none"
              style={{
                background: 'var(--bg-secondary)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          {/* GIF / Image URL */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              URL da Imagem / GIF Demonstrativo (Opcional)
            </label>
            <input
              type="url"
              value={gifUrl}
              onChange={e => setGifUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-4 py-2 rounded-2xl border text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              style={{
                background: 'var(--bg-secondary)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 pt-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl border text-xs font-bold hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer disabled:opacity-50"
              style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 rounded-2xl text-xs font-bold text-white shadow-xl shadow-brand-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              style={{ background: 'var(--accent)' }}
            >
              <Plus className="w-4 h-4" />
              {isSubmitting ? 'Salvando...' : 'Criar Exercício'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
