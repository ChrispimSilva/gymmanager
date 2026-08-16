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

  it('should initialize with default demo users', async () => {
    const users = await userRepo.getAll();
    expect(users.length).toBe(3);
    expect(users.map(u => u.email)).toContain('admin@gym.com');
  });

  it('should authenticate user with valid credentials', async () => {
    const user = await userRepo.authenticate('admin@gym.com', 'admin123');
    expect(user).not.toBeNull();
    expect(user?.role).toBe('admin');
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
    });

    expect(result.success).toBe(true);
    expect(result.user?.name).toBe('Lucas Teste');

    // Verify student was auto-created
    const student = await studentRepo.getByUserId(result.user!.id);
    expect(student).not.toBeNull();
    expect(student?.name).toBe('Lucas Teste');
    expect(student?.email).toBe('lucas@teste.com');
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
});
