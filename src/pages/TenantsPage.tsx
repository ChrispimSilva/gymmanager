import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Building2,
  Plus,
  Search,
  Users,
  Award,
  ShieldCheck,
  CheckCircle2,
  Ban,
  X,
  Mail,
  Phone,
  Lock,
  Sparkles,
  CreditCard,
  Edit3,
  Trash2,
} from 'lucide-react';
import { tenantService } from '../services/tenantService';
import { userService } from '../services/userService';
import { activityService } from '../services/activityService';
import { THEME_PRESETS } from '../services/settingsService';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import type { GymSettings, Tenant, TenantSeatUsage, User } from '../types';

interface TenantWithDetails {
  tenant: Tenant;
  admin: User | null;
  usage: TenantSeatUsage;
}

export default function TenantsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [items, setItems] = useState<TenantWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingItem, setEditingItem] = useState<TenantWithDetails | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TenantWithDetails | null>(null);

  const loadTenants = useCallback(async () => {
    try {
      const tenants = await tenantService.getAll();
      const detailed: TenantWithDetails[] = await Promise.all(
        tenants.map(async t => {
          const [admin, usage] = await Promise.all([
            userService.findById(t.ownerUserId),
            tenantService.getSeatUsage(t.id),
          ]);
          return { tenant: t, admin, usage };
        })
      );
      setItems(detailed);
    } catch {
      toast.error('Erro ao carregar lista de academias.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    let active = true;
    async function init() {
      try {
        const tenants = await tenantService.getAll();
        const detailed: TenantWithDetails[] = await Promise.all(
          tenants.map(async t => {
            const [admin, usage] = await Promise.all([
              userService.findById(t.ownerUserId),
              tenantService.getSeatUsage(t.id),
            ]);
            return { tenant: t, admin, usage };
          })
        );
        if (active) setItems(detailed);
      } catch {
        if (active) toast.error('Erro ao carregar lista de academias.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void init();
    return () => {
      active = false;
    };
  }, [toast]);

  const filtered = useMemo(() => {
    let list = items;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        i =>
          i.tenant.name.toLowerCase().includes(q) ||
          i.tenant.slug.toLowerCase().includes(q) ||
          i.tenant.email.toLowerCase().includes(q) ||
          (i.admin?.name && i.admin.name.toLowerCase().includes(q))
      );
    }
    if (filter === 'active') list = list.filter(i => i.tenant.active);
    if (filter === 'suspended') list = list.filter(i => !i.tenant.active);
    return list;
  }, [items, search, filter]);

  const platformTotals = useMemo(() => {
    return items.reduce(
      (acc, curr) => {
        acc.totalTenants += 1;
        if (curr.tenant.active) acc.activeTenants += 1;
        acc.totalSeats += curr.usage.usedSeats;
        acc.activePersonals += curr.usage.activePersonals;
        acc.activeStudents += curr.usage.activeStudents;
        acc.estimatedMonthlyCents += curr.usage.estimatedMonthlyCents;
        return acc;
      },
      {
        totalTenants: 0,
        activeTenants: 0,
        totalSeats: 0,
        activePersonals: 0,
        activeStudents: 0,
        estimatedMonthlyCents: 0,
      }
    );
  }, [items]);

  const handleToggleActive = async (item: TenantWithDetails) => {
    try {
      const updated = await tenantService.toggleActive(item.tenant.id);
      if (updated) {
        toast.info(
          `Academia "${updated.name}" foi ${updated.active ? 'ativada' : 'suspensa'}.`,
          'Status Atualizado'
        );
        await loadTenants();
      }
    } catch {
      toast.error('Não foi possível alterar o status da academia.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.tenant.id === 'tenant-default') {
      toast.error('A academia padrão de demonstração não pode ser excluída.');
      setDeleteTarget(null);
      return;
    }
    try {
      await tenantService.delete(deleteTarget.tenant.id);
      if (deleteTarget.admin) {
        await userService.delete(deleteTarget.admin.id);
      }
      await activityService.log({
        userId: user?.id || 'usr-superadmin-001',
        type: 'tenant_created',
        description: `Academia removida: ${deleteTarget.tenant.name}`,
      });
      toast.success(`Academia "${deleteTarget.tenant.name}" removida com sucesso.`);
      await loadTenants();
    } catch {
      toast.error('Erro ao excluir academia.');
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30">
              SuperAdmin SaaS
            </span>
          </div>
          <h1 className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
            Academias & Contas Admin (Tenants)
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            Gerencie as academias da plataforma, credenciais dos donos (Admin) e assentos utilizados
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl gradient-brand text-white text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-brand-500/25 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Nova Academia (Tenant)
        </button>
      </div>

      {/* Seat Licensing Overview Banner */}
      <div
        className="rounded-3xl p-5 border grid grid-cols-2 lg:grid-cols-4 gap-4"
        style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
      >
        <div className="p-3 rounded-2xl" style={{ background: 'var(--bg-tertiary)' }}>
          <p className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
            Academias Ativas
          </p>
          <p className="text-2xl font-black mt-1" style={{ color: 'var(--text-primary)' }}>
            {platformTotals.activeTenants}{' '}
            <span className="text-xs font-normal" style={{ color: 'var(--text-tertiary)' }}>
              / {platformTotals.totalTenants} total
            </span>
          </p>
        </div>

        <div className="p-3 rounded-2xl" style={{ background: 'var(--bg-tertiary)' }}>
          <p className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
            Total de Assentos Ativos
          </p>
          <p className="text-2xl font-black mt-1 text-emerald-500">
            {platformTotals.totalSeats}{' '}
            <span className="text-xs font-semibold">assentos</span>
          </p>
        </div>

        <div className="p-3 rounded-2xl" style={{ background: 'var(--bg-tertiary)' }}>
          <p className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
            Detalhamento de Assentos
          </p>
          <p className="text-sm font-bold mt-2" style={{ color: 'var(--text-primary)' }}>
            🏋️ {platformTotals.activePersonals} Personais • 🏃 {platformTotals.activeStudents} Alunos
          </p>
        </div>

        <div className="p-3 rounded-2xl" style={{ background: 'var(--bg-tertiary)' }}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
              Projeção Futura (Assentos)
            </p>
            <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-emerald-500/15 text-emerald-400">
              Fase Gratuita
            </span>
          </div>
          <p className="text-xl font-black mt-1 text-indigo-400">
            {(platformTotals.estimatedMonthlyCents / 100).toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            })}
            <span className="text-xs font-normal" style={{ color: 'var(--text-tertiary)' }}>
              /mês
            </span>
          </p>
        </div>
      </div>

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
            placeholder="Buscar por nome da academia, código (slug) ou administrador..."
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
          {(['all', 'active', 'suspended'] as const).map(f => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
                filter === f
                  ? 'bg-brand-500/15 text-brand-500 border-brand-500/30'
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
              {f === 'all' ? 'Todas' : f === 'active' ? 'Ativas' : 'Suspensas'}
            </button>
          ))}
        </div>
      </div>

      {/* Tenants Grid */}
      {loading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {[1, 2].map(i => (
            <div
              key={i}
              className="rounded-3xl p-6 border h-64 animate-pulse"
              style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
            />
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-5">
          {filtered.map(({ tenant, admin, usage }) => {
            const seatPercent =
              usage.maxSeats && usage.maxSeats > 0
                ? Math.min(100, Math.round((usage.usedSeats / usage.maxSeats) * 100))
                : 25;

            return (
              <div
                key={tenant.id}
                className="rounded-3xl p-5 sm:p-6 border card-hover flex flex-col justify-between gap-4"
                style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
              >
                <div className="space-y-4">
                  {/* Top Row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-md"
                        style={{ background: tenant.settings.primaryColor || 'var(--accent)' }}
                      >
                        <Building2 className="w-6 h-6" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3
                            className="font-bold text-base truncate"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {tenant.name}
                          </h3>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-slate-500/10 text-slate-400">
                            slug: {tenant.slug}
                          </span>
                        </div>
                        <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                          Admin: <strong style={{ color: 'var(--text-secondary)' }}>{admin?.name || 'Não vinculado'}</strong> ({admin?.email || tenant.email})
                        </p>
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1 flex-shrink-0 ${
                        tenant.active
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-red-500/15 text-red-400'
                      }`}
                    >
                      {tenant.active ? (
                        <>
                          <CheckCircle2 className="w-3 h-3" /> Ativa
                        </>
                      ) : (
                        <>
                          <Ban className="w-3 h-3" /> Suspensa
                        </>
                      )}
                    </span>
                  </div>

                  {/* Seat Usage Box */}
                  <div
                    className="p-4 rounded-2xl border space-y-2.5"
                    style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)' }}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                        <CreditCard className="w-3.5 h-3.5 text-brand-500" />
                        Ocupação de Assentos (Seats)
                      </span>
                      <span className="font-bold" style={{ color: 'var(--text-primary)' }}>
                        {usage.usedSeats} / {usage.maxSeats ?? 'Ilimitado'} assentos
                      </span>
                    </div>

                    {usage.maxSeats && (
                      <div className="w-full h-2 rounded-full bg-slate-500/20 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${seatPercent}%`,
                            background:
                              seatPercent >= 90
                                ? '#ef4444'
                                : seatPercent >= 75
                                ? '#f59e0b'
                                : tenant.settings.primaryColor || '#10b981',
                          }}
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                      <div className="p-2 rounded-xl bg-black/5 dark:bg-white/5">
                        <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                          Personais Ativos
                        </p>
                        <p className="text-sm font-extrabold flex items-center justify-center gap-1 mt-0.5" style={{ color: 'var(--text-primary)' }}>
                          <Award className="w-3.5 h-3.5 text-indigo-400" />
                          {usage.activePersonals}
                        </p>
                      </div>
                      <div className="p-2 rounded-xl bg-black/5 dark:bg-white/5">
                        <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                          Alunos Ativos
                        </p>
                        <p className="text-sm font-extrabold flex items-center justify-center gap-1 mt-0.5" style={{ color: 'var(--text-primary)' }}>
                          <Users className="w-3.5 h-3.5 text-emerald-400" />
                          {usage.activeStudents}
                        </p>
                      </div>
                      <div className="p-2 rounded-xl bg-black/5 dark:bg-white/5">
                        <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                          Valor / Assento
                        </p>
                        <p className="text-xs font-extrabold text-amber-400 mt-1">
                          {((tenant.licensing.pricePerSeatCents || 990) / 100).toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div
                  className="flex items-center gap-2 pt-3 border-t"
                  style={{ borderColor: 'var(--border-color)' }}
                >
                  <button
                    type="button"
                    onClick={() => setEditingItem({ tenant, admin, usage })}
                    className="flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all hover:opacity-90 cursor-pointer"
                    style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Editar Academia / Admin
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleActive({ tenant, admin, usage })}
                    className="py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    style={{
                      background: 'var(--bg-tertiary)',
                      color: tenant.active ? '#f59e0b' : '#10b981',
                    }}
                  >
                    {tenant.active ? 'Suspender' : 'Reativar'}
                  </button>
                  {tenant.id !== 'tenant-default' && (
                    <button
                      type="button"
                      onClick={() => setDeleteTarget({ tenant, admin, usage })}
                      className="p-2.5 rounded-xl text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                      style={{ background: 'var(--bg-tertiary)' }}
                      title="Excluir Academia"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      {(showCreateModal || editingItem) && (
        <TenantFormModal
          editing={editingItem}
          onClose={() => {
            setShowCreateModal(false);
            setEditingItem(null);
          }}
          onSaved={async () => {
            setShowCreateModal(false);
            setEditingItem(null);
            await loadTenants();
          }}
        />
      )}

      {/* Confirm Delete */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Excluir Academia (Tenant)"
        message={`Tem certeza que deseja remover a academia "${deleteTarget?.tenant.name}" e sua conta de administrador?`}
        confirmLabel="Sim, Excluir"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

// ============================================================
// Tenant + Admin Form Modal
// ============================================================
function TenantFormModal({
  editing,
  onClose,
  onSaved,
}: {
  editing: TenantWithDetails | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [tenantName, setTenantName] = useState(editing?.tenant.name || '');
  const [slug, setSlug] = useState(editing?.tenant.slug || '');
  const [document, setDocument] = useState(editing?.tenant.document || '');
  const [phone, setPhone] = useState(editing?.tenant.phone || '');
  const [maxSeats, setMaxSeats] = useState<string>(
    editing?.tenant.licensing.maxSeats !== undefined && editing?.tenant.licensing.maxSeats !== null
      ? String(editing.tenant.licensing.maxSeats)
      : '50'
  );
  const [priceReais, setPriceReais] = useState<string>(
    editing
      ? ((editing.tenant.licensing.pricePerSeatCents || 990) / 100).toFixed(2)
      : '9.90'
  );
  const [themePreset, setThemePreset] = useState<GymSettings['themePreset']>(
    editing?.tenant.settings.themePreset || 'emerald'
  );

  const [adminName, setAdminName] = useState(editing?.admin?.name || '');
  const [adminEmail, setAdminEmail] = useState(editing?.admin?.email || editing?.tenant.email || '');
  const [adminPassword, setAdminPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const handleTenantNameChange = (val: string) => {
    setTenantName(val);
    if (!editing) {
      setSlug(
        val
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '')
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const parsedMaxSeats = maxSeats.trim() === '' || Number(maxSeats) <= 0 ? null : Number(maxSeats);
    const parsedPriceCents = Math.max(0, Math.round( parseFloat(priceReais.replace(',', '.')) * 100 )) || 990;

    try {
      if (editing) {
        const presetColor = THEME_PRESETS[themePreset]?.primary || editing.tenant.settings.primaryColor;
        await tenantService.update(editing.tenant.id, {
          name: tenantName.trim(),
          slug: slug.trim().toLowerCase(),
          document: document.trim(),
          phone: phone.trim(),
          email: adminEmail.trim(),
          settings: {
            ...editing.tenant.settings,
            gymName: tenantName.trim(),
            themePreset,
            primaryColor: presetColor,
          },
          licensing: {
            ...editing.tenant.licensing,
            maxSeats: parsedMaxSeats,
            pricePerSeatCents: parsedPriceCents,
          },
        });

        if (editing.admin) {
          await userService.update(editing.admin.id, {
            name: adminName.trim(),
            email: adminEmail.trim(),
            phone: phone.trim(),
            ...(adminPassword.trim().length >= 6 ? { password: adminPassword.trim() } : {}),
          });
        }

        toast.success(`Academia "${tenantName}" atualizada com sucesso!`);
        onSaved();
      } else {
        if (adminPassword.length < 6) {
          toast.error('A senha do administrador deve ter pelo menos 6 caracteres.');
          setSaving(false);
          return;
        }

        const result = await tenantService.createTenantWithAdmin({
          tenantName,
          slug,
          document,
          phone,
          adminName,
          adminEmail,
          adminPassword,
          maxSeats: parsedMaxSeats,
          pricePerSeatCents: parsedPriceCents,
          themePreset,
        });

        if (!result.success) {
          toast.error(result.error || 'Erro ao cadastrar academia.');
          setSaving(false);
          return;
        }

        await activityService.log({
          userId: user?.id || 'usr-superadmin-001',
          type: 'tenant_created',
          description: `Nova academia credenciada: ${tenantName} (Admin: ${adminName})`,
        });

        toast.success(`Academia "${tenantName}" e conta Admin criadas com sucesso!`, 'Novo Tenant Criado');
        onSaved();
      }
    } catch {
      toast.error('Erro ao salvar dados da academia.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-3xl p-6 shadow-2xl border animate-scale-in max-h-[90vh] overflow-y-auto"
        style={{ background: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between mb-5 pb-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                {editing ? 'Editar Academia & Admin' : 'Nova Academia (Tenant) & Conta Admin'}
              </h2>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                Configuração multi-tenant e licenciamento por assento
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
          >
            <X className="w-5 h-5" style={{ color: 'var(--text-tertiary)' }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-xs font-bold uppercase tracking-wider text-brand-500 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" /> 1. Dados da Academia (Tenant)
          </p>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                Nome da Academia *
              </label>
              <input
                type="text"
                required
                value={tenantName}
                onChange={e => handleTenantNameChange(e.target.value)}
                placeholder="Ex: Iron Force VIP"
                className="w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none"
                style={{
                  background: 'var(--bg-tertiary)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                Código Identificador (Slug) *
              </label>
              <input
                type="text"
                required
                value={slug}
                onChange={e => setSlug(e.target.value)}
                placeholder="ex: iron-force"
                className="w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono focus:outline-none"
                style={{
                  background: 'var(--bg-tertiary)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                CNPJ / Documento
              </label>
              <input
                type="text"
                value={document}
                onChange={e => setDocument(e.target.value)}
                placeholder="00.000.000/0001-00"
                className="w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none"
                style={{
                  background: 'var(--bg-tertiary)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                <Phone className="w-3 h-3 inline mr-1" /> Telefone Comercial
              </label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="(11) 99999-9999"
                className="w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none"
                style={{
                  background: 'var(--bg-tertiary)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                Limite de Assentos
              </label>
              <input
                type="number"
                min="1"
                value={maxSeats}
                onChange={e => setMaxSeats(e.target.value)}
                placeholder="Ex: 50 (vazio = ilimitado)"
                className="w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none"
                style={{
                  background: 'var(--bg-tertiary)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                Valor/Assento (R$ futuro)
              </label>
              <input
                type="number"
                step="0.10"
                min="0"
                value={priceReais}
                onChange={e => setPriceReais(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none"
                style={{
                  background: 'var(--bg-tertiary)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                <Sparkles className="w-3 h-3 inline mr-1" /> Cor Padrão
              </label>
              <select
                value={themePreset}
                onChange={e => setThemePreset(e.target.value as GymSettings['themePreset'])}
                className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none"
                style={{
                  background: 'var(--bg-tertiary)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="emerald">Verde Esmeralda</option>
                <option value="indigo">Índigo Moderno</option>
                <option value="blue">Azul Oceano</option>
                <option value="crimson">Vermelho Crimson</option>
                <option value="amber">Dourado Âmbar</option>
                <option value="cyan">Ciano Neon</option>
              </select>
            </div>
          </div>

          <div className="pt-2 border-t" style={{ borderColor: 'var(--border-color)' }}>
            <p className="text-xs font-bold uppercase tracking-wider text-brand-500 mb-3 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> 2. Conta do Administrador (Dono da Academia)
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Nome do Administrador *
                </label>
                <input
                  type="text"
                  required
                  value={adminName}
                  onChange={e => setAdminName(e.target.value)}
                  placeholder="Nome completo do gestor"
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none"
                  style={{
                    background: 'var(--bg-tertiary)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                    <Mail className="w-3 h-3 inline mr-1" /> E-mail de Login (Admin) *
                  </label>
                  <input
                    type="email"
                    required
                    value={adminEmail}
                    onChange={e => setAdminEmail(e.target.value)}
                    placeholder="admin@academia.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none"
                    style={{
                      background: 'var(--bg-tertiary)',
                      borderColor: 'var(--border-color)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                    <Lock className="w-3 h-3 inline mr-1" />{' '}
                    {editing ? 'Nova Senha (opcional)' : 'Senha Inicial *'}
                  </label>
                  <input
                    type="password"
                    required={!editing}
                    minLength={6}
                    value={adminPassword}
                    onChange={e => setAdminPassword(e.target.value)}
                    placeholder={editing ? 'Manter atual' : 'Mín. 6 caracteres'}
                    className="w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none"
                    style={{
                      background: 'var(--bg-tertiary)',
                      borderColor: 'var(--border-color)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>
              </div>
            </div>
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
              {saving ? 'Salvando...' : editing ? 'Salvar Alterações' : 'Criar Academia & Admin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
