import { useEffect } from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';
import { ToastProvider } from '../../contexts/ToastContext';
import { SettingsProvider } from '../../contexts/SettingsContext';
import { ThemeProvider } from '../../contexts/ThemeContext';
import Header from '../../components/layout/Header';
import { BackupManagementModal } from '../../components/admin/BackupManagementModal';

interface AuthBridge {
  login: ReturnType<typeof useAuth>['login'];
  loginWithRole: ReturnType<typeof useAuth>['loginWithRole'];
}

function AuthConsumer({ onAuth }: { onAuth: (auth: AuthBridge) => void }) {
  const auth = useAuth();
  useEffect(() => {
    onAuth({
      login: auth.login,
      loginWithRole: auth.loginWithRole,
    });
  }, [auth.login, auth.loginWithRole, onAuth]);
  return <div data-testid="auth-user">{auth.user?.email || 'anonymous'}</div>;
}

describe('AuthContext & Backup Access Restrictions', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should reject login when referenced tenant no longer exists and persist valid logins synchronously', async () => {
    localStorage.setItem(
      'gymmanager-users',
      JSON.stringify([
        {
          id: 'usr-orphan-001',
          name: 'Personal Órfão',
          email: 'orfao@academiadeletada.com',
          password: 'password123',
          role: 'personal',
          tenantId: 'tenant-inexistente',
          active: true,
          createdAt: '2026-01-01T00:00:00Z',
        },
        {
          id: 'usr-admin-001',
          name: 'Carlos Admin',
          email: 'admin@gym.com',
          password: 'admin123',
          role: 'admin',
          tenantId: 'tenant-default',
          active: true,
          createdAt: '2026-01-01T00:00:00Z',
        },
      ])
    );

    let bridge: AuthBridge | null = null;
    const handleAuth = (next: AuthBridge) => {
      bridge = next;
    };

    render(
      <SettingsProvider>
        <AuthProvider>
          <AuthConsumer onAuth={handleAuth} />
        </AuthProvider>
      </SettingsProvider>
    );

    let roleRes: Awaited<ReturnType<AuthBridge['loginWithRole']>> | undefined;
    await act(async () => {
      roleRes = await bridge!.loginWithRole(
        'orfao@academiadeletada.com',
        'password123',
        'personal'
      );
    });

    expect(roleRes).toEqual({
      success: false,
      error: 'A academia vinculada a esta conta não existe mais na plataforma.',
    });
    expect(localStorage.getItem('gymmanager-auth')).toBeNull();

    let directRes = true;
    await act(async () => {
      directRes = await bridge!.login('orfao@academiadeletada.com', 'password123');
    });
    expect(directRes).toBe(false);
    expect(localStorage.getItem('gymmanager-auth')).toBeNull();

    // Valid login persists gymmanager-auth synchronously before children read active tenant
    let validRes: Awaited<ReturnType<AuthBridge['loginWithRole']>> | undefined;
    let storedRightAfterPromise: string | null = null;
    await act(async () => {
      validRes = await bridge!.loginWithRole('admin@gym.com', 'admin123', 'admin');
      storedRightAfterPromise = localStorage.getItem('gymmanager-auth');
    });

    expect(validRes).toEqual({ success: true });
    expect(storedRightAfterPromise).not.toBeNull();
    expect(JSON.parse(storedRightAfterPromise!).email).toBe('admin@gym.com');
  });

  it('should hide Header backup menu and BackupManagementModal from academy admins', async () => {
    localStorage.setItem(
      'gymmanager-auth',
      JSON.stringify({
        id: 'usr-admin-001',
        name: 'Carlos Admin',
        email: 'admin@gym.com',
        password: 'admin123',
        role: 'admin',
        tenantId: 'tenant-default',
        active: true,
        createdAt: '2026-01-01T00:00:00Z',
      })
    );

    render(
      <SettingsProvider>
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              <Header />
              <BackupManagementModal isOpen={true} onClose={() => {}} />
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </SettingsProvider>
    );

    const menuBtn = document.getElementById('user-menu-btn')!;
    await act(async () => {
      fireEvent.click(menuBtn);
    });

    await waitFor(() => {
      expect(screen.getByText('Meu Perfil & Avatar')).toBeInTheDocument();
    });

    expect(screen.queryByText('Backup & Gestão de Dados')).not.toBeInTheDocument();
    expect(screen.queryByText('Backup & Segurança de Dados')).not.toBeInTheDocument();
  });

  it('should expose Header backup menu and BackupManagementModal to superadmins', async () => {
    localStorage.setItem(
      'gymmanager-auth',
      JSON.stringify({
        id: 'usr-superadmin-001',
        name: 'Master SuperAdmin',
        email: 'superadmin@gym.com',
        password: 'super123',
        role: 'superadmin',
        active: true,
        createdAt: '2026-01-01T00:00:00Z',
      })
    );

    render(
      <SettingsProvider>
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              <Header />
              <BackupManagementModal isOpen={true} onClose={() => {}} />
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </SettingsProvider>
    );

    const menuBtn = document.getElementById('user-menu-btn')!;
    await act(async () => {
      fireEvent.click(menuBtn);
    });

    await waitFor(() => {
      expect(screen.getByText('Backup & Gestão de Dados')).toBeInTheDocument();
    });

    expect(screen.getByText('Backup & Segurança de Dados')).toBeInTheDocument();
  });
});
