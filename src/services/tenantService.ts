import { DEFAULT_TENANT_ID, type GymSettings, type Tenant, type TenantSeatUsage, type User } from '../types';
import {
  customExerciseRepository,
  equipmentRepository,
  progressRepository,
  sessionRepository,
  studentRepository,
  tenantRepository,
  userRepository,
  workoutRepository,
} from '../repositories';
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
    const tenant = await tenantRepository.getById(id);
    const deleted = await tenantRepository.delete(id);
    if (!deleted) return false;

    // Remove all member user accounts belonging to this tenant (admin, personals, alunos)
    const members = await userRepository.getAll(id);
    for (const member of members) {
      await userRepository.delete(member.id);
    }

    if (tenant?.ownerUserId && tenant.ownerUserId !== 'pending') {
      const owner = await userRepository.findById(tenant.ownerUserId);
      if (owner && owner.role !== 'superadmin') {
        await userRepository.delete(owner.id);
      }
    }

    // Remove all students belonging to this tenant (cascades student workouts, progress and sessions)
    const students = await studentRepository.getAll(id);
    for (const student of students) {
      await studentRepository.delete(student.id);
    }

    // Remove any remaining tenant-scoped workouts (e.g. community templates), progress, sessions, equipments and custom exercises
    const [allWorkouts, allProgress, allSessions, allEquipments, allCustomExercises] = await Promise.all([
      workoutRepository.getAll(),
      progressRepository.getAll(),
      sessionRepository.getAll(),
      equipmentRepository.getAll(),
      customExerciseRepository.getAll(),
    ]);

    for (const workout of allWorkouts) {
      if ((workout.tenantId || DEFAULT_TENANT_ID) === id) {
        await workoutRepository.delete(workout.id);
      }
    }
    for (const record of allProgress) {
      if ((record.tenantId || DEFAULT_TENANT_ID) === id) {
        await progressRepository.delete(record.id);
      }
    }
    for (const session of allSessions) {
      if ((session.tenantId || DEFAULT_TENANT_ID) === id) {
        await sessionRepository.delete(session.id);
      }
    }
    for (const eq of allEquipments) {
      if ((eq.tenantId || DEFAULT_TENANT_ID) === id) {
        await equipmentRepository.delete(eq.id);
      }
    }
    for (const ex of allCustomExercises) {
      if ((ex.tenantId || DEFAULT_TENANT_ID) === id) {
        await customExerciseRepository.delete(ex.id);
      }
    }

    return true;
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

    if (!tenant) {
      return {
        allowed: false,
        reason: 'Esta academia não foi encontrada na plataforma.',
        usage,
      };
    }

    if (!tenant.active) {
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
