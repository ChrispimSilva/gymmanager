import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Award,
  Plus,
  Search,
  Mail,
  Phone,
  Lock,
  X,
  UserX,
  ShieldCheck,
  CreditCard,
} from 'lucide-react';
import { userService } from '../services/userService';
import { tenantService } from '../services/tenantService';
import { activityService } from '../services/activityService';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { DEFAULT_TENANT_ID, type TenantSeatUsage, type User } from '../types';

export default function PersonalsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const tenantId = user?.tenantId || DEFAULT_TENANT_ID;

  const [personals, setPersonals] = useState<User[]>([]);
  const [seatUsage, setSeatUsage] = useState<TenantSeatUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingPersonal, setEditingPersonal] = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [list, usage] = await Promise.all([
        userService.getByRole('personal', tenantId),
        tenantService.getSeatUsage(tenantId),
      ]);
      setPersonals(list);
      setSeatUsage(usage);
    } catch {
      toast.error('Erro ao carregar equipe de personais.');
    } finally {
      setLoading(false);
    }
  }, [tenantId, toast]);

  useEffect(() => {
    let active = true;
    async function init() {
      try {
        const [list, usage] = await Promise.all([
          userService.getByRole('personal', tenantId),
          tenantService.getSeatUsage(tenantId),
        ]);
        if (active) {
          setPersonals(list);
          setSeatUsage(usage);
        }
      } catch {
        if (active) toast.error('Erro ao carregar equipe de personais.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void init();
    return () => {
      active = false;
    };
  }, [tenantId, toast]);

  const filtered = useMemo(() => {
    let list = personals;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        p =>
          p.name.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q) ||
          (p.specialty && p.specialty.toLowerCase().includes(q)) ||
          (p.cref && p.cref.toLowerCase().includes(q))
      );
    }
    if (filter === 'active') list = list.filter(p => p.active !== false);
    if (filter === 'inactive') list = list.filter(p => p.active === false);
    return list;
  }, [personals, search, filter]);

  const handleToggleActive = async (personal: User) => {
    try {
      const isCurrentlyActive = personal.active !== false;
      if (!isCurrentlyActive) {
        const seatCheck = await tenantService.canAddSeat(tenantId);
        if (!seatCheck.allowed) {
          toast.error(seatCheck.reason || 'Limite de assentos atingido.');
          return;
        }
      }

      const updated = await userService.toggleActive(personal.id);
      if (updated) {
        toast.info(
          `Personal ${updated.name} está agora ${updated.active !== false ? 'ativo' : 'inativo'}.`,
          'Status atualizado'
        );
        await loadData();
      }
    } catch {
      toast.error('Erro ao atualizar status do personal.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await userService.delete(deleteTarget.id);
      await activityService.log({
        userId: user?.id || 'usr-admin-001',
        type: 'personal_added',
        description: `Personal removido da equipe: ${deleteTarget.name}`,
      });
      toast.success(`Personal ${deleteTarget.name} removido da academia.`);
      await loadData();
    } catch {
      toast.error('Erro ao excluir personal.');
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Equipe de Personais
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
            {personals.length} personais cadastrados •{' '}
            {personals.filter(p => p.active !== false).length} ativos na academia
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingPersonal(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-brand text-white text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-brand-500/25 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Novo Personal
        </button>
      </div>

      {/* Seat Usage Summary Bar */}
      {seatUsage && (
        <div
          className="rounded-2xl p-4 border flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center flex-shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                Assentos Ocupados na Academia: {seatUsage.usedSeats} /{' '}
                {seatUsage.maxSeats ?? 'Ilimitado'}
              </p>
              <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                Detalhamento: {seatUsage.activePersonals} Personais ativos +{' '}
                {seatUsage.activeStudents} Alunos ativos • Plano Gratuito por Assento
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-500 self-start sm:self-center">
            ✓ Assinatura Gratuita Ativa
          </span>
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            style={{ color: 'var(--text-tertiary)' }}
          />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar personal por nome, e-mail, CREF ou especialidade..."
            className="w-full pr-4 py-3 rounded-2xl border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/50"
            style={{
              paddingLeft: '2.75rem',
              background: 'var(--bg-secondary)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)',
            }}
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'active', 'inactive'] as const).map(f => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-4 py-2.5 rounded-xl text-xs font-medium transition-all border cursor-pointer ${
                filter === f
                  ? 'bg-brand-500/10 text-brand-500 border-brand-500/30'
                  : 'border-transparent'
              }`}
              style={
                filter !== f
                  ? {
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-secondary)',
                      borderColor: 'var(--border-color)',
                    }
                  : {}
              }
            >
              {f === 'all' ? 'Todos' : f === 'active' ? 'Ativos' : 'Inativos'}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2].map(i => (
            <div
              key={i}
              className="rounded-2xl p-5 border animate-pulse h-48"
              style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
            />
          ))}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(personal => {
            const isActive = personal.active !== false;
            return (
              <div
                key={personal.id}
                className="rounded-2xl p-5 border card-hover flex flex-col justify-between"
                style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
              >
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                        style={{
                          background: isActive
                            ? 'linear-gradient(135deg, var(--accent), #4f46e5)'
                            : 'linear-gradient(135deg, #94a3b8, #64748b)',
                        }}
                      >
                        {personal.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                          {personal.name}
                        </h3>
                        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                          {personal.email}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-lg text-[10px] font-semibold ${
                        isActive
                          ? 'bg-brand-500/10 text-brand-500'
                          : 'bg-red-500/10 text-red-400'
                      }`}
                    >
                      {isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    <div className="flex items-center gap-2">
                      <Award className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                      <span>{personal.specialty || 'Musculação & Condicionamento'}</span>
                    </div>
                    {personal.cref && (
                      <div className="flex items-center gap-2" style={{ color: 'var(--text-tertiary)' }}>
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>CREF: {personal.cref}</span>
                      </div>
                    )}
                    {personal.phone && (
                      <div className="flex items-center gap-2" style={{ color: 'var(--text-tertiary)' }}>
                        <Phone className="w-3.5 h-3.5" />
                        <span>{personal.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div
                  className="flex gap-2 mt-4 pt-3 border-t"
                  style={{ borderColor: 'var(--border-color)' }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setEditingPersonal(personal);
                      setShowForm(true);
                    }}
                    className="flex-1 py-2 rounded-lg text-xs font-medium transition-all hover:bg-brand-500/10 cursor-pointer"
                    style={{ color: 'var(--accent)', background: 'var(--bg-tertiary)' }}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleActive(personal)}
                    className="flex-1 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer"
                    style={{
                      color: isActive ? '#f59e0b' : '#10b981',
                      background: 'var(--bg-tertiary)',
                    }}
                  >
                    {isActive ? 'Desativar' : 'Ativar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(personal)}
                    className="py-2 px-3 rounded-lg text-xs font-medium text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                    style={{ background: 'var(--bg-tertiary)' }}
                    title="Excluir Personal"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-16">
          <UserX className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-tertiary)' }} />
          <p className="text-lg font-medium" style={{ color: 'var(--text-secondary)' }}>
            Nenhum personal encontrado
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
            Cadastre os profissionais da sua academia para prescreverem treinos
          </p>
        </div>
      )}

      {showForm && (
        <PersonalFormModal
          personal={editingPersonal}
          tenantId={tenantId}
          onClose={() => {
            setShowForm(false);
            setEditingPersonal(null);
          }}
          onSaved={async () => {
            setShowForm(false);
            setEditingPersonal(null);
            await loadData();
          }}
        />
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Remover Personal da Academia"
        message={`Tem certeza que deseja excluir o acesso do personal "${deleteTarget?.name}"?`}
        confirmLabel="Sim, Excluir"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function PersonalFormModal({
  personal,
  tenantId,
  onClose,
  onSaved,
}: {
  personal: User | null;
  tenantId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [name, setName] = useState(personal?.name || '');
  const [email, setEmail] = useState(personal?.email || '');
  const [phone, setPhone] = useState(personal?.phone || '');
  const [cref, setCref] = useState(personal?.cref || '');
  const [specialty, setSpecialty] = useState(personal?.specialty || 'Hipertrofia & Força');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (personal) {
        await userService.update(personal.id, {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          cref: cref.trim(),
          specialty: specialty.trim(),
          ...(password.trim().length >= 6 ? { password: password.trim() } : {}),
        });
        toast.success(`Dados de ${name} atualizados com sucesso!`);
        onSaved();
      } else {
        const seatCheck = await tenantService.canAddSeat(tenantId);
        if (!seatCheck.allowed) {
          toast.error(seatCheck.reason || 'Limite de assentos atingido.');
          setSaving(false);
          return;
        }

        const res = await userService.register({
          name: name.trim(),
          email: email.trim(),
          password: password || 'personal123',
          role: 'personal',
          tenantId,
          phone: phone.trim(),
          cref: cref.trim(),
          specialty: specialty.trim(),
          active: true,
        });

        if (!res.success) {
          toast.error(res.error || 'Não foi possível cadastrar o personal.');
          setSaving(false);
          return;
        }

        await activityService.log({
          userId: user?.id || 'usr-admin-001',
          type: 'personal_added',
          description: `Novo personal adicionado à equipe: ${name}`,
        });

        toast.success(`Personal ${name} cadastrado com sucesso!`);
        onSaved();
      }
    } catch {
      toast.error('Erro ao salvar personal.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl p-6 shadow-2xl border animate-scale-in max-h-[90vh] overflow-y-auto"
        style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {personal ? 'Editar Personal' : 'Novo Personal da Academia'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
          >
            <X className="w-5 h-5" style={{ color: 'var(--text-tertiary)' }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Nome completo *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Prof. Marcos Silva"
              className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none"
              style={{
                background: 'var(--bg-tertiary)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                <Mail className="w-3 h-3 inline mr-1" /> E-mail de Login *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="personal@academia.com"
                className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none"
                style={{
                  background: 'var(--bg-tertiary)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                <Phone className="w-3 h-3 inline mr-1" /> Telefone
              </label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="(11) 99999-9999"
                className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none"
                style={{
                  background: 'var(--bg-tertiary)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Registro CREF
              </label>
              <input
                type="text"
                value={cref}
                onChange={e => setCref(e.target.value)}
                placeholder="000000-G/SP"
                className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none"
                style={{
                  background: 'var(--bg-tertiary)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Especialidade
              </label>
              <input
                type="text"
                value={specialty}
                onChange={e => setSpecialty(e.target.value)}
                placeholder="Ex: Hipertrofia"
                className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none"
                style={{
                  background: 'var(--bg-tertiary)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              <Lock className="w-3 h-3 inline mr-1" />{' '}
              {personal ? 'Nova Senha de Acesso (opcional)' : 'Senha de Acesso *'}
            </label>
            <input
              type="password"
              required={!personal}
              minLength={6}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={personal ? 'Deixe em branco para manter' : 'Mínimo 6 caracteres'}
              className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none"
              style={{
                background: 'var(--bg-tertiary)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border text-sm font-medium cursor-pointer"
              style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl gradient-brand text-white text-sm font-semibold shadow-lg shadow-brand-500/25 cursor-pointer disabled:opacity-50"
            >
              {saving ? 'Salvando...' : personal ? 'Salvar' : 'Cadastrar Personal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
