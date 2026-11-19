import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import StudentsPage from '../../pages/StudentsPage';
import { AuthProvider } from '../../contexts/AuthContext';
import { ToastProvider } from '../../contexts/ToastContext';
import { studentService } from '../../services/studentService';
import { tenantService } from '../../services/tenantService';
import { userService } from '../../services/userService';
import { DEFAULT_TENANT_ID } from '../../types';

function renderStudentsPage() {
  localStorage.setItem(
    'gymmanager-auth',
    JSON.stringify({
      id: 'usr-admin-001',
      name: 'Carlos Admin',
      email: 'admin@gym.com',
      password: 'admin123',
      role: 'admin',
      tenantId: DEFAULT_TENANT_ID,
      active: true,
      createdAt: '2026-01-01T00:00:00Z',
    })
  );

  return render(
    <AuthProvider>
      <ToastProvider>
        <StudentsPage />
      </ToastProvider>
    </AuthProvider>
  );
}

describe('StudentsPage — Student login provisioning error handling', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should surface registration error and avoid creating an orphan student when email belongs to another academy', async () => {
    const otherTenant = await tenantService.createTenantWithAdmin({
      tenantName: 'Academia Externa',
      slug: 'externa-gym',
      adminName: 'Gestor Externo',
      adminEmail: 'gestor@externa.com',
      adminPassword: 'password123',
      maxSeats: 10,
    });
    await userService.register({
      name: 'Aluno Externo',
      email: 'duplicado@teste.com',
      password: 'password123',
      role: 'aluno',
      tenantId: otherTenant.tenant!.id,
    });

    renderStudentsPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Novo Aluno/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Novo Aluno/i }));

    const dialog = await screen.findByRole('dialog');
    const nameInput = dialog.querySelector('input[type="text"]') as HTMLInputElement;
    const emailInput = dialog.querySelector('input[type="email"]') as HTMLInputElement;
    const passwordInput = dialog.querySelector('input[type="password"]') as HTMLInputElement;

    fireEvent.change(nameInput, { target: { value: 'Novo Aluno Duplicado' } });
    fireEvent.change(emailInput, { target: { value: 'duplicado@teste.com' } });
    fireEvent.change(passwordInput, { target: { value: 'senha123' } });

    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar' }));

    await waitFor(() => {
      expect(screen.getByText('Este email já está cadastrado')).toBeInTheDocument();
    });

    // Modal stays open and no orphan student was created in DEFAULT_TENANT_ID
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(await studentService.getAll(DEFAULT_TENANT_ID)).toEqual([]);
  });

  it('should roll back newly created student and keep modal open if userService.register fails', async () => {
    vi.spyOn(userService, 'register').mockResolvedValueOnce({
      success: false,
      error: 'Falha ao provisionar conta',
    });

    renderStudentsPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Novo Aluno/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Novo Aluno/i }));

    const dialog = await screen.findByRole('dialog');
    const nameInput = dialog.querySelector('input[type="text"]') as HTMLInputElement;
    const emailInput = dialog.querySelector('input[type="email"]') as HTMLInputElement;
    const passwordInput = dialog.querySelector('input[type="password"]') as HTMLInputElement;

    fireEvent.change(nameInput, { target: { value: 'Aluno Rollback' } });
    fireEvent.change(emailInput, { target: { value: 'rollback@teste.com' } });
    fireEvent.change(passwordInput, { target: { value: 'senha123' } });

    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar' }));

    await waitFor(() => {
      expect(screen.getByText('Falha ao provisionar conta')).toBeInTheDocument();
    });

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(await studentService.getAll(DEFAULT_TENANT_ID)).toEqual([]);
  });

  it('should reject editing an existing student without userId when supplied login email belongs to another account', async () => {
    const otherTenant = await tenantService.createTenantWithAdmin({
      tenantName: 'Academia Externa 2',
      slug: 'externa-gym-2',
      adminName: 'Gestor Externo 2',
      adminEmail: 'gestor2@externa.com',
      adminPassword: 'password123',
      maxSeats: 10,
    });
    await userService.register({
      name: 'Conta Existente',
      email: 'ocupado@teste.com',
      password: 'password123',
      role: 'aluno',
      tenantId: otherTenant.tenant!.id,
    });

    const existingStudent = await studentService.create({
      name: 'Bruno Sem Acesso',
      email: 'bruno@teste.com',
      phone: '11999990000',
      birthDate: '',
      weight: 80,
      height: 180,
      goal: 'Hipertrofia',
      active: true,
      tenantId: DEFAULT_TENANT_ID,
    });

    renderStudentsPage();

    await waitFor(() => {
      expect(screen.getByText('Bruno Sem Acesso')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));

    const dialog = await screen.findByRole('dialog');
    const nameInput = dialog.querySelector('input[type="text"]') as HTMLInputElement;
    const emailInput = dialog.querySelector('input[type="email"]') as HTMLInputElement;
    const passwordInput = dialog.querySelector('input[type="password"]') as HTMLInputElement;

    fireEvent.change(nameInput, { target: { value: 'Bruno Alterado' } });
    fireEvent.change(emailInput, { target: { value: 'ocupado@teste.com' } });
    fireEvent.change(passwordInput, { target: { value: 'senha123' } });

    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => {
      expect(screen.getByText('Este email já está cadastrado')).toBeInTheDocument();
    });

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    const persisted = await studentService.getById(existingStudent.id);
    expect(persisted?.name).toBe('Bruno Sem Acesso');
    expect(persisted?.email).toBe('bruno@teste.com');
    expect(persisted?.userId).toBeUndefined();
  });

  it('should roll back existing student fields if userService.register fails while provisioning access', async () => {
    const existingStudent = await studentService.create({
      name: 'Camila Original',
      email: 'camila.orig@teste.com',
      phone: '11988887777',
      birthDate: '',
      weight: 60,
      height: 165,
      goal: 'Condicionamento',
      active: true,
      tenantId: DEFAULT_TENANT_ID,
    });

    vi.spyOn(userService, 'register').mockResolvedValueOnce({
      success: false,
      error: 'Erro simulado no registro',
    });

    renderStudentsPage();

    await waitFor(() => {
      expect(screen.getByText('Camila Original')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));

    const dialog = await screen.findByRole('dialog');
    const nameInput = dialog.querySelector('input[type="text"]') as HTMLInputElement;
    const emailInput = dialog.querySelector('input[type="email"]') as HTMLInputElement;
    const passwordInput = dialog.querySelector('input[type="password"]') as HTMLInputElement;

    fireEvent.change(nameInput, { target: { value: 'Camila Alterada' } });
    fireEvent.change(emailInput, { target: { value: 'camila.nova@teste.com' } });
    fireEvent.change(passwordInput, { target: { value: 'senha123' } });

    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => {
      expect(screen.getByText('Erro simulado no registro')).toBeInTheDocument();
    });

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    const persisted = await studentService.getById(existingStudent.id);
    expect(persisted?.name).toBe('Camila Original');
    expect(persisted?.email).toBe('camila.orig@teste.com');
    expect(persisted?.userId).toBeUndefined();
  });

  it('should create student, provision linked user account, close modal and show success toast on happy path', async () => {
    renderStudentsPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Novo Aluno/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Novo Aluno/i }));

    const dialog = await screen.findByRole('dialog');
    const nameInput = dialog.querySelector('input[type="text"]') as HTMLInputElement;
    const emailInput = dialog.querySelector('input[type="email"]') as HTMLInputElement;
    const passwordInput = dialog.querySelector('input[type="password"]') as HTMLInputElement;

    fireEvent.change(nameInput, { target: { value: 'Aluno Acesso OK' } });
    fireEvent.change(emailInput, { target: { value: 'ok@teste.com' } });
    fireEvent.change(passwordInput, { target: { value: 'senha123' } });

    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Aluno cadastrado')).toBeInTheDocument();

    const students = await studentService.getAll(DEFAULT_TENANT_ID);
    const createdUser = await userService.findByEmail('ok@teste.com');
    expect(students).toHaveLength(1);
    expect(createdUser).not.toBeNull();
    expect(createdUser?.role).toBe('aluno');
    expect(createdUser?.tenantId).toBe(DEFAULT_TENANT_ID);
    expect(students[0].userId).toBe(createdUser?.id);
  });
});
