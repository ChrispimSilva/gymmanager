import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageUserRepository } from '../../repositories/localStorage/LocalStorageUserRepository';
import { LocalStorageStudentRepository } from '../../repositories/localStorage/LocalStorageStudentRepository';

describe('LocalStorageUserRepository', () => {
  let studentRepo: LocalStorageStudentRepository;
  let userRepo: LocalStorageUserRepository;

  beforeEach(() => {
    localStorage.clear();
    studentRepo = new LocalStorageStudentRepository();
    userRepo = new LocalStorageUserRepository(studentRepo);
  });

  it('should initialize with default demo users including superadmin, admin, personal and aluno', async () => {
    const users = await userRepo.getAll();
    expect(users.length).toBe(4);
    expect(users.map(u => u.email)).toContain('superadmin@gym.com');
    expect(users.map(u => u.email)).toContain('admin@gym.com');
    expect(users.map(u => u.email)).toContain('personal@gym.com');
    expect(users.map(u => u.email)).toContain('aluno@gym.com');
  });

  it('should authenticate user with valid credentials', async () => {
    const user = await userRepo.authenticate('admin@gym.com', 'admin123');
    expect(user).not.toBeNull();
    expect(user?.role).toBe('admin');

    const superUser = await userRepo.authenticate('superadmin@gym.com', 'super123');
    expect(superUser).not.toBeNull();
    expect(superUser?.role).toBe('superadmin');

    const personal = await userRepo.authenticate('personal@gym.com', 'personal123');
    expect(personal).not.toBeNull();
    expect(personal?.role).toBe('personal');
  });

  it('should reject authentication with wrong password', async () => {
    const user = await userRepo.authenticate('admin@gym.com', 'wrongpassword');
    expect(user).toBeNull();
  });

  it('should register a new user successfully and auto-create student record for role aluno', async () => {
    const result = await userRepo.register({
      name: 'Lucas Teste',
      email: 'lucas@teste.com',
      password: 'password123',
      role: 'aluno',
      tenantId: 'tenant-default',
    });

    expect(result.success).toBe(true);
    expect(result.user?.name).toBe('Lucas Teste');
    expect(result.user?.tenantId).toBe('tenant-default');

    // Verify student was auto-created
    const student = await studentRepo.getByUserId(result.user!.id);
    expect(student).not.toBeNull();
    expect(student?.name).toBe('Lucas Teste');
    expect(student?.email).toBe('lucas@teste.com');
    expect(student?.tenantId).toBe('tenant-default');
  });

  it('should reject registration if email already exists', async () => {
    const result = await userRepo.register({
      name: 'Admin Dup',
      email: 'admin@gym.com',
      password: 'password123',
      role: 'admin',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Este email já está cadastrado');
  });

  it('should update user profile and synchronize with linked student', async () => {
    const reg = await userRepo.register({
      name: 'Nome Antigo',
      email: 'antigo@gym.com',
      password: 'password123',
      role: 'aluno',
    });

    const updated = await userRepo.update(reg.user!.id, {
      name: 'Nome Novo',
      avatar: 'avatar-maromba-pro',
    });

    expect(updated?.name).toBe('Nome Novo');
    expect(updated?.avatar).toBe('avatar-maromba-pro');

    const student = await studentRepo.getByUserId(reg.user!.id);
    expect(student?.name).toBe('Nome Novo');
    expect(student?.photo).toBe('avatar-maromba-pro');
  });

  it('should accept legacy personal alias only while default demo password and email remain unchanged', async () => {
    // Unchanged default personal demo account supports both current and legacy demo credentials
    const current = await userRepo.authenticate('personal@gym.com', 'personal123');
    expect(current?.id).toBe('usr-inst-001');

    const legacy = await userRepo.authenticate('instrutor@gym.com', 'instrutor123');
    expect(legacy?.id).toBe('usr-inst-001');

    // Changing the password revokes both demo passwords
    await userRepo.update('usr-inst-001', { password: 'novaSenhaSegura99' });

    expect(await userRepo.authenticate('personal@gym.com', 'personal123')).toBeNull();
    expect(await userRepo.authenticate('personal@gym.com', 'instrutor123')).toBeNull();
    expect(await userRepo.authenticate('instrutor@gym.com', 'instrutor123')).toBeNull();
    expect(await userRepo.authenticate('instrutor@gym.com', 'personal123')).toBeNull();

    const updatedAuth = await userRepo.authenticate('personal@gym.com', 'novaSenhaSegura99');
    expect(updatedAuth?.id).toBe('usr-inst-001');
  });

  it('should not accept demo passwords for migrated legacy accounts with custom passwords or changed email', async () => {
    localStorage.setItem(
      'gymmanager-users',
      JSON.stringify([
        {
          id: 'usr-inst-001',
          name: 'Prof. Rafael',
          email: 'instrutor@gym.com',
          password: 'senhaCustomPreUpgrade',
          role: 'instrutor',
          active: true,
          createdAt: '2026-01-01T00:00:00Z',
        },
      ])
    );

    expect(await userRepo.authenticate('instrutor@gym.com', 'personal123')).toBeNull();
    expect(await userRepo.authenticate('instrutor@gym.com', 'instrutor123')).toBeNull();

    const migratedAuth = await userRepo.authenticate('instrutor@gym.com', 'senhaCustomPreUpgrade');
    expect(migratedAuth).not.toBeNull();
    expect(migratedAuth?.role).toBe('personal');

    // When usr-inst-001 email changes away from personal@gym.com, the legacy alias stops resolving it
    localStorage.clear();
    await userRepo.update('usr-inst-001', { email: 'rafael@academia.com' });
    expect(await userRepo.findByEmail('instrutor@gym.com')).toBeNull();
  });
});
