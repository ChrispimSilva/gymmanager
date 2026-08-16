import { useState, useEffect, useCallback } from 'react';
import {
  Layers,
  Plus,
  Search,
  MapPin,
  Tag,
  Edit2,
  Trash2,
  X,
  Dumbbell,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import { equipmentService } from '../services/equipmentService';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import type { EquipmentItem } from '../types';

export default function EquipmentsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [equipments, setEquipments] = useState<EquipmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('todas');
  const [selectedStatus, setSelectedStatus] = useState<string>('todos');

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<EquipmentItem | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [equipmentToDelete, setEquipmentToDelete] = useState<EquipmentItem | null>(null);

  const loadEquipments = useCallback(async () => {
    try {
      const data = await equipmentService.getAll();
      setEquipments(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEquipments();
  }, [loadEquipments]);

  // Unique locations for filter
  const locations = Array.from(new Set(equipments.map(e => e.location.trim()))).filter(Boolean);

  const filteredEquipments = equipments.filter(eq => {
    const matchesSearch =
      eq.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (eq.brand && eq.brand.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (eq.model && eq.model.toLowerCase().includes(searchTerm.toLowerCase())) ||
      eq.location.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesLocation =
      selectedLocation === 'todas' || eq.location.toLowerCase().includes(selectedLocation.toLowerCase());

    const matchesStatus =
      selectedStatus === 'todos' || eq.status === selectedStatus;

    return matchesSearch && matchesLocation && matchesStatus;
  });

  const handleDelete = async () => {
    if (!equipmentToDelete) return;
    try {
      await equipmentService.delete(equipmentToDelete.id);
      toast.success(`Aparelho "${equipmentToDelete.name}" excluído.`, 'Exclusão Concluída');
      setEquipmentToDelete(null);
      setDeleteConfirmOpen(false);
      loadEquipments();
    } catch {
      toast.error('Erro ao excluir aparelho.');
    }
  };

  const getStatusBadge = (status: EquipmentItem['status']) => {
    switch (status) {
      case 'ativo':
        return (
          <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Ativo
          </span>
        );
      case 'manutencao':
        return (
          <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Manutenção
          </span>
        );
      case 'inativo':
      default:
        return (
          <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center gap-1">
            <XCircle className="w-3 h-3" /> Inativo
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-24 md:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Aparelhos & Equipamentos
          </h1>
          <p className="text-xs sm:text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
            Cadastre e gerencie os aparelhos, marcas e localizações na academia
          </p>
        </div>

        <button
          onClick={() => {
            setEditingEquipment(null);
            setFormModalOpen(true);
          }}
          className="px-5 py-3 rounded-2xl text-xs font-bold text-white shadow-xl transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2 cursor-pointer min-h-[48px]"
          style={{ background: 'var(--accent)' }}
        >
          <Plus className="w-4 h-4" />
          <span>Novo Aparelho</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div
        className="p-4 rounded-3xl border shadow-sm space-y-3"
        style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
      >
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search
              className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: 'var(--text-tertiary)' }}
            />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar por aparelho, marca, modelo ou local..."
              className="w-full pr-4 py-3 rounded-2xl border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all min-h-[46px]"
              style={{
                paddingLeft: '2.75rem',
                background: 'var(--bg-tertiary)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          <div className="flex gap-2">
            <select
              value={selectedLocation}
              onChange={e => setSelectedLocation(e.target.value)}
              className="px-3 py-2.5 rounded-2xl border text-xs font-semibold focus:outline-none cursor-pointer min-h-[44px]"
              style={{
                background: 'var(--bg-tertiary)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
              }}
            >
              <option value="todas">Todos os Locais</option>
              {locations.map(loc => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="px-3 py-2.5 rounded-2xl border text-xs font-semibold focus:outline-none cursor-pointer min-h-[44px]"
              style={{
                background: 'var(--bg-tertiary)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
              }}
            >
              <option value="todos">Todos os Status</option>
              <option value="ativo">Ativo</option>
              <option value="manutencao">Manutenção</option>
              <option value="inativo">Inativo</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid of Equipments */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div
              key={i}
              className="h-44 rounded-3xl bg-slate-500/10 animate-pulse border border-white/5"
            />
          ))}
        </div>
      ) : filteredEquipments.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEquipments.map((eq, idx) => (
            <div
              key={eq.id}
              className="rounded-3xl p-5 border card-hover flex flex-col justify-between space-y-4 animate-slide-up"
              style={{
                background: 'var(--card-bg)',
                borderColor: 'var(--border-color)',
                animationDelay: `${idx * 0.03}s`,
                animationFillMode: 'both',
              }}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent)' }}
                    >
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm sm:text-base leading-tight line-clamp-1" style={{ color: 'var(--text-primary)' }}>
                        {eq.name}
                      </h3>
                      {(eq.brand || eq.model) && (
                        <p className="text-[11px] font-medium mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                          {[eq.brand, eq.model].filter(Boolean).join(' • ')}
                        </p>
                      )}
                    </div>
                  </div>
                  {getStatusBadge(eq.status)}
                </div>

                {/* Location Badge */}
                <div className="flex items-center gap-1.5 mt-3 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                  <MapPin className="w-3.5 h-3.5 text-brand-500 flex-shrink-0" />
                  <span className="truncate">{eq.location}</span>
                </div>

                {eq.notes && (
                  <p className="text-xs mt-2 line-clamp-2 italic" style={{ color: 'var(--text-tertiary)' }}>
                    📝 {eq.notes}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between border-t pt-3" style={{ borderColor: 'var(--border-color)' }}>
                <span className="text-[10px] font-medium" style={{ color: 'var(--text-tertiary)' }}>
                  Cadastrado em {new Date(eq.createdAt).toLocaleDateString('pt-BR')}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setEditingEquipment(eq);
                      setFormModalOpen(true);
                    }}
                    className="p-2 rounded-xl border hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer"
                    style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
                    title="Editar aparelho"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => {
                      setEquipmentToDelete(eq);
                      setDeleteConfirmOpen(true);
                    }}
                    className="p-2 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                    title="Excluir aparelho"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <Dumbbell className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-tertiary)' }} />
          <p className="text-lg font-medium" style={{ color: 'var(--text-secondary)' }}>
            Nenhum aparelho encontrado
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
            Cadastre os aparelhos e locais da sua academia para organizar o espaço!
          </p>
        </div>
      )}

      {/* Equipment Form Modal */}
      {formModalOpen && (
        <EquipmentFormModal
          isOpen={formModalOpen}
          initialData={editingEquipment}
          onClose={() => setFormModalOpen(false)}
          onSaved={() => {
            setFormModalOpen(false);
            loadEquipments();
          }}
          userId={user?.id}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        title="Excluir Aparelho?"
        message={`Deseja realmente remover o aparelho "${equipmentToDelete?.name}" do cadastro?`}
        confirmLabel="Sim, Excluir"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
    </div>
  );
}

interface EquipmentFormModalProps {
  isOpen: boolean;
  initialData: EquipmentItem | null;
  onClose: () => void;
  onSaved: () => void;
  userId?: string;
}

function EquipmentFormModal({
  isOpen,
  initialData,
  onClose,
  onSaved,
  userId,
}: EquipmentFormModalProps) {
  const { toast } = useToast();

  const [name, setName] = useState(initialData?.name || '');
  const [brand, setBrand] = useState(initialData?.brand || '');
  const [model, setModel] = useState(initialData?.model || '');
  const [location, setLocation] = useState(initialData?.location || '');
  const [status, setStatus] = useState<EquipmentItem['status']>(initialData?.status || 'ativo');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !location.trim()) {
      toast.warning('Preencha o nome e a localização do aparelho.');
      return;
    }

    setIsSaving(true);
    try {
      if (initialData) {
        await equipmentService.update(initialData.id, {
          name: name.trim(),
          brand: brand.trim() || undefined,
          model: model.trim() || undefined,
          location: location.trim(),
          status,
          notes: notes.trim() || undefined,
        });
        toast.success('Aparelho atualizado com sucesso!', 'Sucesso');
      } else {
        await equipmentService.create(
          {
            name: name.trim(),
            brand: brand.trim() || undefined,
            model: model.trim() || undefined,
            location: location.trim(),
            status,
            notes: notes.trim() || undefined,
          },
          userId
        );
        toast.success('Novo aparelho cadastrado!', 'Sucesso');
      }
      onSaved();
    } catch {
      toast.error('Erro ao salvar aparelho.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl p-5 sm:p-6 shadow-2xl border animate-scale-in max-h-[90vh] overflow-y-auto space-y-5"
        style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
        onClick={e => e.stopPropagation()}
        role="dialog"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent)' }}
            >
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                {initialData ? 'Editar Aparelho' : 'Novo Aparelho'}
              </h2>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                Informe marca, modelo e localização na academia
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer">
            <X className="w-5 h-5" style={{ color: 'var(--text-tertiary)' }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
              Nome do Aparelho *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Leg Press 45°, Cadeira Extensora, Smith Machine"
              className="w-full px-4 py-3 rounded-2xl border text-sm font-medium focus:outline-none focus:ring-2 transition-all min-h-[46px]"
              style={{
                background: 'var(--bg-tertiary)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                Marca (Opcional)
              </label>
              <input
                type="text"
                value={brand}
                onChange={e => setBrand(e.target.value)}
                placeholder="Ex: Movement, Matrix"
                className="w-full px-4 py-3 rounded-2xl border text-sm font-medium focus:outline-none focus:ring-2 transition-all min-h-[46px]"
                style={{
                  background: 'var(--bg-tertiary)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                Modelo (Opcional)
              </label>
              <input
                type="text"
                value={model}
                onChange={e => setModel(e.target.value)}
                placeholder="Ex: RT 250, Linha Pró"
                className="w-full px-4 py-3 rounded-2xl border text-sm font-medium focus:outline-none focus:ring-2 transition-all min-h-[46px]"
                style={{
                  background: 'var(--bg-tertiary)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
              Localização na Academia * (Campo Livre)
            </label>
            <input
              type="text"
              required
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="Ex: Piso 1, Andar 2, Área Maromba, Setor Cardio"
              className="w-full px-4 py-3 rounded-2xl border text-sm font-medium focus:outline-none focus:ring-2 transition-all min-h-[46px]"
              style={{
                background: 'var(--bg-tertiary)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                Status
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as EquipmentItem['status'])}
                className="w-full px-4 py-3 rounded-2xl border text-sm font-medium focus:outline-none cursor-pointer min-h-[46px]"
                style={{
                  background: 'var(--bg-tertiary)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="ativo">Ativo (Em uso normal)</option>
                <option value="manutencao">Em Manutenção</option>
                <option value="inativo">Inativo / Desativado</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                Observações
              </label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Ex: Capacidade 450kg, cabos novos"
                className="w-full px-4 py-3 rounded-2xl border text-sm font-medium focus:outline-none focus:ring-2 transition-all min-h-[46px]"
                style={{
                  background: 'var(--bg-tertiary)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-3">
            <button
              type="button"
              disabled={isSaving}
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl border text-xs font-bold hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer min-h-[46px]"
              style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-3 rounded-2xl text-xs font-bold text-white shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer min-h-[46px]"
              style={{ background: 'var(--accent)' }}
            >
              {isSaving ? 'Salvando...' : initialData ? 'Salvar Alterações' : 'Cadastrar Aparelho'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
