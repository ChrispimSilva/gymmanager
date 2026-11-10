import type { GymSettings, Tenant, TenantSeatUsage, User } from '../types';
import { studentRepository, tenantRepository, userRepository } from '../repositories';
import { THEME_PRESETS } from './settingsService';

export const tenantService = {
  async getAll(): Promise<Tenant[]> {
    return tenantRepository.getAll();
  },

  async getActiveTenants(): Promise<Tenant[]> {
    const all = await tenantRepository.getAll();
    return all.filter(t => t.active);
  },

  async getById(id: string): Promise<Tenant | null> {
    return tenantRepository.getById(id);
  },

  async getBySlug(slug: string): Promise<Tenant | null> {
    return tenantRepository.getBySlug(slug);
  },

  async create(data: Omit<Tenant, 'id' | 'createdAt'> & { id?: string }): Promise<Tenant> {
    return tenantRepository.create(data);
  },

  async update(id: string, data: Partial<Tenant>): Promise<Tenant | null> {
    return tenantRepository.update(id, data);
  },

  async toggleActive(id: string): Promise<Tenant | null> {
    return tenantRepository.toggleActive(id);
  },

  async delete(id: string): Promise<boolean> {
    return tenantRepository.delete(id);
  },

  async getSeatUsage(tenantId: string): Promise<TenantSeatUsage> {
    const [tenant, personals, students] = await Promise.all([
      tenantRepository.getById(tenantId),
      userRepository.getByRole('personal', tenantId),
      studentRepository.getAll(tenantId),
    ]);

    const activePersonals = personals.filter(p => p.active !== false).length;
    const totalPersonals = personals.length;
    const activeStudents = students.filter(s => s.active).length;
    const totalStudents = students.length;
    const usedSeats = activePersonals + activeStudents;
    const maxSeats = tenant?.licensing.maxSeats ?? null;
    const pricePerSeatCents = tenant?.licensing.pricePerSeatCents ?? 990;

    return {
      tenantId,
      activePersonals,
      totalPersonals,
      activeStudents,
      totalStudents,
      usedSeats,
      maxSeats,
      estimatedMonthlyCents: usedSeats * pricePerSeatCents,
    };
  },

  async canAddSeat(tenantId: string): Promise<{
    allowed: boolean;
    reason?: string;
    usage: TenantSeatUsage;
  }> {
    const [tenant, usage] = await Promise.all([
      tenantRepository.getById(tenantId),
      this.getSeatUsage(tenantId),
    ]);

    if (tenant && !tenant.active) {
      return {
        allowed: false,
        reason: 'Esta academia encontra-se suspensa no momento.',
        usage,
      };
    }

    if (usage.maxSeats !== null && usage.usedSeats >= usage.maxSeats) {
      return {
        allowed: false,
        reason: `Limite de assentos da academia atingido (${usage.usedSeats}/${usage.maxSeats} assentos ocupados).`,
        usage,
      };
    }

    return { allowed: true, usage };
  },

  async createTenantWithAdmin(params: {
    tenantName: string;
    slug: string;
    document?: string;
    phone?: string;
    adminName: string;
    adminEmail: string;
    adminPassword: string;
    maxSeats: number | null;
    pricePerSeatCents?: number;
    themePreset?: GymSettings['themePreset'];
  }): Promise<{ success: boolean; tenant?: Tenant; admin?: User; error?: string }> {
    const cleanSlug = params.slug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, '-');

    const existingSlug = await tenantRepository.getBySlug(cleanSlug);
    if (existingSlug) {
      return { success: false, error: 'Este código (slug) de academia já está em uso.' };
    }

    const existingUser = await userRepository.findByEmail(params.adminEmail);
    if (existingUser) {
      return { success: false, error: 'Este e-mail de administrador já está cadastrado.' };
    }

    const preset = params.themePreset || 'emerald';
    const primaryColor = THEME_PRESETS[preset]?.primary || '#10b981';

    const tenant = await tenantRepository.create({
      slug: cleanSlug,
      name: params.tenantName.trim(),
      ownerUserId: 'pending',
      document: params.document?.trim() || '',
      email: params.adminEmail.trim(),
      phone: params.phone?.trim() || '',
      active: true,
      settings: {
        gymName: params.tenantName.trim(),
        logoUrl: '',
        primaryColor,
        themePreset: preset,
      },
      licensing: {
        billingModel: 'per_seat',
        isPaid: false,
        pricePerSeatCents: params.pricePerSeatCents ?? 990,
        maxSeats: params.maxSeats,
        billingStatus: 'free',
      },
    });

    const adminResult = await userRepository.register({
      name: params.adminName.trim(),
      email: params.adminEmail.trim(),
      password: params.adminPassword,
      role: 'admin',
      tenantId: tenant.id,
      phone: params.phone?.trim(),
      active: true,
    });

    if (!adminResult.success || !adminResult.user) {
      await tenantRepository.delete(tenant.id);
      return { success: false, error: adminResult.error || 'Erro ao criar conta Admin.' };
    }

    const updatedTenant = await tenantRepository.update(tenant.id, {
      ownerUserId: adminResult.user.id,
    });

    return {
      success: true,
      tenant: updatedTenant || tenant,
      admin: adminResult.user,
    };
  },
};
