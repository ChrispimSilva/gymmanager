import { useState } from 'react';
import { Search, Filter, X, Dumbbell, ChevronDown } from 'lucide-react';
import { useExercises } from '../hooks/useExercises';
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
  } = useExercises();

  const [selectedExercise, setSelectedExercise] = useState<NormalizedExercise | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Catálogo de Exercícios
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
          {filtered.length} exercícios disponíveis
        </p>
      </div>

      {/* Search & Filter Bar */}
      <div className="space-y-3">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar exercício por nome ou músculo..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              style={{
                background: 'var(--bg-secondary)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
              }}
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
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
            className="p-4 rounded-2xl border space-y-4 animate-slide-down"
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
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
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
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
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
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
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
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
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
                className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
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
            className={`rounded-2xl overflow-hidden border card-hover cursor-pointer animate-slide-up`}
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
                className="absolute top-2 left-2 px-2 py-1 rounded-lg text-[10px] font-bold text-white"
                style={{ background: categoryColors[exercise.category] || '#94a3b8' }}
              >
                {exercise.category}
              </div>
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
                  className="text-[10px] px-2 py-0.5 rounded-md font-medium"
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
            Tente alterar os filtros ou busca
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
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-2xl shadow-2xl border animate-scale-in max-h-[90vh] overflow-y-auto"
        style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* GIF */}
        <div
          className="h-72 md:h-96 relative overflow-hidden rounded-t-2xl"
          style={{ background: 'var(--bg-tertiary)' }}
        >
          <img
            src={exercise.gif}
            alt={exercise.nome}
            className="w-full h-full object-contain"
          />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div
            className="absolute bottom-4 left-4 px-3 py-1.5 rounded-xl text-xs font-bold text-white"
            style={{ background: categoryColors[exercise.category] || '#94a3b8' }}
          >
            {exercise.category}
          </div>
        </div>

        {/* Details */}
        <div className="p-6">
          <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            {exercise.nome}
          </h2>

          <div className="flex flex-wrap gap-2 mb-4">
            <span
              className="px-3 py-1 rounded-lg text-xs font-medium"
              style={{
                background: `${categoryColors[exercise.category]}15`,
                color: categoryColors[exercise.category],
              }}
            >
              🎯 {exercise.musculos}
            </span>
            <span
              className="px-3 py-1 rounded-lg text-xs font-medium"
              style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
            >
              🔧 {exercise.equipamento}
            </span>
          </div>

          {exercise.descricao && (
            <div
              className="p-4 rounded-xl mt-4"
              style={{ background: 'var(--bg-tertiary)' }}
            >
              <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                Descrição
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {exercise.descricao}
              </p>
            </div>
          )}

          {/* Link to GIF */}
          <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
            <a
              href={exercise.gif}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-80"
              style={{ background: 'var(--accent)', color: 'white' }}
            >
              🎬 Ver exercício em tela cheia
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
