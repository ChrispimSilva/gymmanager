import { useState, useEffect } from 'react';
import { Search, Filter, X, Dumbbell, ChevronDown, Plus, Sparkles } from 'lucide-react';
import { useExercises } from '../hooks/useExercises';
import { useAuth } from '../contexts/AuthContext';
import { CustomExerciseModal } from '../components/exercise/CustomExerciseModal';
import type { NormalizedExercise } from '../types';

// Muscle group color map
const categoryColors: Record<string, string> = {
  'Peito': '#ef4444',
  'Costas': '#3b82f6',
  'Ombros': '#f59e0b',
  'Bíceps': '#8b5cf6',
  'Tríceps': '#ec4899',
  'Pernas': '#10b981',
  'Abdominais': '#06b6d4',
  'Panturrilha': '#84cc16',
  'Antebraço': '#d946ef',
  'Trapézio': '#f97316',
  'Lombar': '#14b8a6',
  'Pescoço': '#a855f7',
  'Cardio': '#f43f5e',
  'Corpo Inteiro': '#6366f1',
  'Outros': '#94a3b8',
};

export default function ExercisesPage() {
  const { user } = useAuth();
  const {
    filtered,
    categories,
    equipments,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    selectedEquipment,
    setSelectedEquipment,
    reloadCustomExercises,
  } = useExercises();

  const [selectedExercise, setSelectedExercise] = useState<NormalizedExercise | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [customModalOpen, setCustomModalOpen] = useState(false);

  const canCreateExercise = user?.role === 'admin' || user?.role === 'instrutor';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Catálogo de Exercícios
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
            {filtered.length} exercícios disponíveis
          </p>
        </div>

        {canCreateExercise && (
          <button
            onClick={() => setCustomModalOpen(true)}
            className="px-4 py-2.5 rounded-2xl text-xs font-bold text-white shadow-lg shadow-brand-500/25 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 cursor-pointer"
            style={{ background: 'var(--accent)' }}
          >
            <Plus className="w-4 h-4" />
            Novo Exercício Personalizado
          </button>
        )}
      </div>

      {/* Search & Filter Bar */}
      <div className="space-y-3">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-tertiary)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar exercício por nome ou músculo..."
              className="w-full pr-4 py-3 rounded-2xl border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/50 min-h-[46px]"
              style={{
                paddingLeft: '2.75rem',
                background: 'var(--bg-secondary)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
              }}
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-sm font-medium transition-all cursor-pointer ${
              showFilters || selectedCategory || selectedEquipment
                ? 'bg-brand-500/10 text-brand-500 border-brand-500/30'
                : ''
            }`}
            style={!showFilters && !selectedCategory && !selectedEquipment ? {
              borderColor: 'var(--border-color)',
              color: 'var(--text-secondary)',
              background: 'var(--bg-secondary)',
            } : {}}
          >
            <Filter className="w-4 h-4" />
            Filtros
            <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div
            className="p-4 rounded-3xl border space-y-4 animate-slide-down"
            style={{
              background: 'var(--card-bg)',
              borderColor: 'var(--border-color)',
            }}
          >
            {/* Category Filter */}
            <div>
              <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--text-secondary)' }}>
                Grupo Muscular
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCategory('')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                    !selectedCategory ? 'bg-brand-500 text-white' : ''
                  }`}
                  style={selectedCategory ? { background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' } : {}}
                >
                  Todos
                </button>
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat === selectedCategory ? '' : cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                      selectedCategory === cat ? 'text-white' : ''
                    }`}
                    style={
                      selectedCategory === cat
                        ? { background: categoryColors[cat] || '#94a3b8' }
                        : { background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }
                    }
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Equipment Filter */}
            <div>
              <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--text-secondary)' }}>
                Equipamento
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedEquipment('')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                    !selectedEquipment ? 'bg-brand-500 text-white' : ''
                  }`}
                  style={selectedEquipment ? { background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' } : {}}
                >
                  Todos
                </button>
                {equipments.map(eq => (
                  <button
                    key={eq}
                    onClick={() => setSelectedEquipment(eq === selectedEquipment ? '' : eq)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                      selectedEquipment === eq ? 'bg-brand-500 text-white' : ''
                    }`}
                    style={selectedEquipment !== eq ? { background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' } : {}}
                  >
                    {eq}
                  </button>
                ))}
              </div>
            </div>

            {/* Clear filters */}
            {(selectedCategory || selectedEquipment) && (
              <button
                onClick={() => { setSelectedCategory(''); setSelectedEquipment(''); }}
                className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3 h-3" /> Limpar filtros
              </button>
            )}
          </div>
        )}
      </div>

      {/* Exercise Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.slice(0, 60).map((exercise, i) => (
          <div
            key={exercise.id}
            onClick={() => setSelectedExercise(exercise)}
            className={`rounded-3xl overflow-hidden border card-hover cursor-pointer animate-slide-up relative`}
            style={{
              background: 'var(--card-bg)',
              borderColor: 'var(--border-color)',
              animationDelay: `${Math.min(i * 0.03, 0.3)}s`,
              animationFillMode: 'both',
            }}
          >
            {/* GIF Preview */}
            <div
              className="h-48 relative overflow-hidden"
              style={{ background: 'var(--bg-tertiary)' }}
            >
              <img
                src={exercise.gif}
                alt={exercise.nome}
                className="w-full h-full object-contain"
                loading="lazy"
                onError={e => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).parentElement!.innerHTML = `
                    <div class="w-full h-full flex items-center justify-center">
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--text-tertiary)">
                        <path d="M6.5 6.5h11M6.5 17.5h11M3 12h18M4 8l2-5h12l2 5M4 16l2 5h12l2-5"/>
                      </svg>
                    </div>`;
                }}
              />
              {/* Category badge */}
              <div
                className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-xl text-[10px] font-bold text-white shadow-sm"
                style={{ background: categoryColors[exercise.category] || '#94a3b8' }}
              >
                {exercise.category}
              </div>

              {/* Custom badge */}
              {exercise.isCustom && (
                <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-xl text-[10px] font-bold bg-purple-600 text-white flex items-center gap-1 shadow-sm">
                  <Sparkles className="w-3 h-3" /> Custom
                </div>
              )}
            </div>

            {/* Info */}
            <div className="p-4">
              <h3
                className="text-sm font-semibold mb-1 line-clamp-2 leading-tight"
                style={{ color: 'var(--text-primary)' }}
              >
                {exercise.nome}
              </h3>
              <div className="flex items-center gap-2 mt-2">
                <span
                  className="text-[10px] px-2.5 py-0.5 rounded-lg font-medium"
                  style={{
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {exercise.equipamento}
                </span>
              </div>
              <p className="text-xs mt-2 line-clamp-1" style={{ color: 'var(--text-tertiary)' }}>
                {exercise.musculos}
              </p>
            </div>
          </div>
        ))}
      </div>

      {filtered.length > 60 && (
        <p className="text-center text-sm py-4" style={{ color: 'var(--text-tertiary)' }}>
          Mostrando 60 de {filtered.length} exercícios. Use os filtros para refinar.
        </p>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <Dumbbell className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-tertiary)' }} />
          <p className="text-lg font-medium" style={{ color: 'var(--text-secondary)' }}>
            Nenhum exercício encontrado
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
            Tente alterar os filtros ou crie um novo exercício personalizado
          </p>
        </div>
      )}

      {/* Exercise Detail Modal */}
      {selectedExercise && (
        <ExerciseDetailModal
          exercise={selectedExercise}
          onClose={() => setSelectedExercise(null)}
        />
      )}

      {/* Custom Exercise Modal */}
      <CustomExerciseModal
        isOpen={customModalOpen}
        onClose={() => setCustomModalOpen(false)}
        onCreated={() => {
          void reloadCustomExercises();
        }}
      />
    </div>
  );
}

// ============================================================
// Exercise Detail Modal
// ============================================================
function ExerciseDetailModal({
  exercise,
  onClose,
}: {
  exercise: NormalizedExercise;
  onClose: () => void;
}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-3xl p-5 sm:p-6 shadow-2xl border animate-scale-in max-h-[90vh] overflow-y-auto"
        style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div
          className="flex items-center justify-between mb-4 pb-3 border-b"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-lg sm:text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {exercise.nome}
            </h2>
            <span
              className="px-3 py-1 rounded-xl text-xs font-bold text-white shadow-sm"
              style={{ background: categoryColors[exercise.category] || '#94a3b8' }}
            >
              {exercise.category}
            </span>
            {exercise.isCustom && (
              <span className="px-3 py-1 rounded-xl text-xs font-bold bg-purple-600 text-white flex items-center gap-1 shadow-sm">
                <Sparkles className="w-3.5 h-3.5" /> Personalizado
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" style={{ color: 'var(--text-tertiary)' }} />
          </button>
        </div>

        {/* GIF Canvas */}
        <div
          className="h-64 sm:h-80 md:h-96 relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border p-3 flex items-center justify-center mb-5 shadow-inner"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <img
            src={exercise.gif}
            alt={exercise.nome}
            className="w-full h-full object-contain rounded-xl"
            onError={e => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>

        {/* Details & Pills */}
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2.5">
            <div
              className="px-3.5 py-2 rounded-xl border text-xs font-medium flex items-center gap-1.5"
              style={{
                background: 'var(--bg-tertiary)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
              }}
            >
              <span>🎯 Músculos:</span>
              <span className="font-bold">{exercise.musculos}</span>
            </div>

            <div
              className="px-3.5 py-2 rounded-xl border text-xs font-medium flex items-center gap-1.5"
              style={{
                background: 'var(--bg-tertiary)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
              }}
            >
              <span>🔧 Equipamento:</span>
              <span className="font-bold">{exercise.equipamento}</span>
            </div>
          </div>

          {exercise.descricao && (
            <div
              className="p-4 rounded-2xl border"
              style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)' }}
            >
              <h3 className="text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-primary)' }}>
                Instruções de Execução
              </h3>
              <p className="text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {exercise.descricao}
              </p>
            </div>
          )}

          {/* Action footer */}
          <div className="pt-3 border-t flex justify-end" style={{ borderColor: 'var(--border-color)' }}>
            <a
              href={exercise.gif}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold text-white shadow-xl transition-all hover:scale-105 active:scale-95"
              style={{ background: 'var(--accent)' }}
            >
              🎬 Abrir GIF em alta resolução
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
