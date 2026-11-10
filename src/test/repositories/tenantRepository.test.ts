import { describe, it, expect, beforeEach } from 'vitest';
import { tenantService } from '../../services/tenantService';
import { studentService } from '../../services/studentService';
import { userService } from '../../services/userService';
import { DEFAULT_TENANT_ID } from '../../types';

describe('Multi-Tenant & Seat Licensing Service', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should initialize with default tenant', async () => {
    const tenants = await tenantService.getAll();
    expect(tenants.length).toBeGreaterThanOrEqual(1);
    expect(tenants[0].id).toBe(DEFAULT_TENANT_ID);
    expect(tenants[0].licensing.billingModel).toBe('per_seat');
    expect(tenants[0].licensing.isPaid).toBe(false);
  });

  it('should calculate seat usage combining active personals and active students', async () => {
    await studentService.create({
      name: 'Aluno Ativo 1',
      email: 'a1@gym.com',
      phone: '',
      birthDate: '',
      weight: 75,
      height: 175,
      goal: 'Hipertrofia',
      active: true,
      tenantId: DEFAULT_TENANT_ID,
    });

    await studentService.create({
      name: 'Aluno Inativo',
      email: 'inativo@gym.com',
      phone: '',
      birthDate: '',
      weight: 75,
      height: 175,
      goal: 'Hipertrofia',
      active: false,
      tenantId: DEFAULT_TENANT_ID,
    });

    const usage = await tenantService.getSeatUsage(DEFAULT_TENANT_ID);
    // 1 default active personal (Prof. Rafael) + 1 active student
    expect(usage.activePersonals).toBe(1);
    expect(usage.activeStudents).toBe(1);
    expect(usage.usedSeats).toBe(2);
  });

  it('should create a new tenant with its admin account and enforce seat limits', async () => {
    const created = await tenantService.createTenantWithAdmin({
      tenantName: 'Academia Alpha',
      slug: 'alpha-gym',
      adminName: 'Gestor Alpha',
      adminEmail: 'admin@alphagym.com',
      adminPassword: 'password123',
      maxSeats: 2,
      pricePerSeatCents: 1290,
    });

    expect(created.success).toBe(true);
    expect(created.tenant?.slug).toBe('alpha-gym');
    expect(created.admin?.role).toBe('admin');
    expect(created.admin?.tenantId).toBe(created.tenant?.id);

    const tenantId = created.tenant!.id;

    // Add 1 personal (seat 1/2)
    await userService.register({
      name: 'Personal Alpha',
      email: 'personal@alphagym.com',
      password: 'password123',
      role: 'personal',
      tenantId,
    });

    // Add 1 student (seat 2/2)
    await userService.register({
      name: 'Aluno Alpha',
      email: 'aluno1@alphagym.com',
      password: 'password123',
      role: 'aluno',
      tenantId,
    });

    const seatCheck = await tenantService.canAddSeat(tenantId);
    expect(seatCheck.allowed).toBe(false);
    expect(seatCheck.usage.usedSeats).toBe(2);
  });
});
