import { describe, it, expect, beforeEach } from 'vitest';
import { tenantService } from '../../services/tenantService';
import { studentService } from '../../services/studentService';
import { userService } from '../../services/userService';
import { workoutService } from '../../services/workoutService';
import { sessionService } from '../../services/sessionService';
import { equipmentService } from '../../services/equipmentService';
import { customExerciseService } from '../../services/customExerciseService';
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

  it('should cascade delete all member accounts and tenant-scoped resources when deleting a tenant', async () => {
    const created = await tenantService.createTenantWithAdmin({
      tenantName: 'Academia Beta',
      slug: 'beta-gym',
      adminName: 'Gestor Beta',
      adminEmail: 'admin@betagym.com',
      adminPassword: 'password123',
      maxSeats: 10,
    });

    const tenantId = created.tenant!.id;

    const personalBeta = await userService.register({
      name: 'Personal Beta',
      email: 'personal@betagym.com',
      password: 'password123',
      role: 'personal',
      tenantId,
    });

    await userService.register({
      name: 'Aluno Beta',
      email: 'aluno@betagym.com',
      password: 'password123',
      role: 'aluno',
      tenantId,
    });

    const communityWorkout = await workoutService.create({
      tenantId,
      instructorId: personalBeta.user!.id,
      name: 'Template Beta',
      description: 'Treino comunitário Beta',
      muscleGroup: 'Peito',
      isCommunity: true,
      exercises: [],
    });

    const orphanSession = await sessionService.create({
      tenantId,
      workoutId: communityWorkout.id,
      workoutName: communityWorkout.name,
      studentId: 'non-existent-student',
      startedAt: '2026-08-15T10:00:00Z',
      endedAt: '2026-08-15T10:30:00Z',
      durationSeconds: 1800,
      totalVolumeKg: 1000,
      completedSetsCount: 6,
      totalSetsCount: 6,
      exercises: [],
    });

    const equipment = await equipmentService.create({
      tenantId,
      name: 'Supino Beta',
      location: 'Sala 1',
      status: 'ativo',
    });

    const customExercise = await customExerciseService.create({
      tenantId,
      nome: 'Exercício Beta',
      musculos: 'Peitoral',
      category: 'Peito',
      equipamento: 'Barra',
      descricao: 'Custom Beta',
      gif: '',
    });

    const deleted = await tenantService.delete(tenantId);
    expect(deleted).toBe(true);

    expect(await tenantService.getById(tenantId)).toBeNull();
    expect(await userService.getAll(tenantId)).toEqual([]);
    expect(await userService.findByEmail('admin@betagym.com')).toBeNull();
    expect(await userService.findByEmail('personal@betagym.com')).toBeNull();
    expect(await userService.findByEmail('aluno@betagym.com')).toBeNull();
    expect(await studentService.getAll(tenantId)).toEqual([]);

    expect(await workoutService.getById(communityWorkout.id)).toBeNull();
    expect(await sessionService.getById(orphanSession.id)).toBeNull();
    expect(await equipmentService.getById(equipment.id)).toBeNull();
    expect(await customExerciseService.getById(customExercise.id)).toBeNull();

    const seatCheck = await tenantService.canAddSeat(tenantId);
    expect(seatCheck.allowed).toBe(false);

    // Default tenant and its resources remain intact
    expect(await tenantService.getById(DEFAULT_TENANT_ID)).not.toBeNull();
    expect(await userService.findByEmail('admin@gym.com')).not.toBeNull();
    expect((await equipmentService.getAll()).length).toBeGreaterThanOrEqual(4);
  });

  it('should enforce seat capacity when reactivating an inactive student via update or toggleActive', async () => {
    const created = await tenantService.createTenantWithAdmin({
      tenantName: 'Academia Gamma',
      slug: 'gamma-gym',
      adminName: 'Gestor Gamma',
      adminEmail: 'admin@gammagym.com',
      adminPassword: 'password123',
      maxSeats: 1,
    });

    const tenantId = created.tenant!.id;

    const activeStudent = await studentService.create({
      name: 'Aluno Ativo',
      email: 'ativo@gammagym.com',
      phone: '',
      birthDate: '',
      weight: 75,
      height: 175,
      goal: 'Hipertrofia',
      active: true,
      tenantId,
    });

    const inactiveStudent = await studentService.create({
      name: 'Aluno Inativo',
      email: 'inativo@gammagym.com',
      phone: '',
      birthDate: '',
      weight: 70,
      height: 170,
      goal: 'Emagrecimento',
      active: false,
      tenantId,
    });

    // Editing fields without reactivating or keeping active continues working at capacity
    const updatedInactive = await studentService.update(inactiveStudent.id, {
      name: 'Novo Nome',
      active: false,
    });
    expect(updatedInactive?.name).toBe('Novo Nome');

    const updatedActive = await studentService.update(activeStudent.id, {
      name: 'Ativo Editado',
      active: true,
    });
    expect(updatedActive?.name).toBe('Ativo Editado');

    // Reactivating inactive student at seat limit must fail in both update and toggleActive
    await expect(
      studentService.update(inactiveStudent.id, { active: true })
    ).rejects.toThrow(/Limite de assentos/i);
    expect((await studentService.getById(inactiveStudent.id))?.active).toBe(false);

    await expect(studentService.toggleActive(inactiveStudent.id)).rejects.toThrow(
      /Limite de assentos/i
    );
    expect((await studentService.getById(inactiveStudent.id))?.active).toBe(false);

    // Freeing a seat allows reactivation
    await studentService.update(activeStudent.id, { active: false });
    const reactivated = await studentService.update(inactiveStudent.id, { active: true });
    expect(reactivated?.active).toBe(true);
  });
});
