import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { DEFAULT_TENANT_ID, type User, type UserRole } from '../types';
import { userService } from '../services/userService';
import { tenantService } from '../services/tenantService';
import { settingsService } from '../services/settingsService';
import { normalizeUserRole } from '../utils/tenantContext';

const ROLE_LABELS: Record<UserRole, string> = {
  superadmin: 'SuperAdmin (Plataforma)',
  admin: 'Admin (Academia)',
  personal: 'Personal',
  aluno: 'Aluno',
};

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  loginWithRole: (
    email: string,
    password: string,
    expectedRole: UserRole
  ) => Promise<{ success: boolean; error?: string; actualRole?: UserRole }>;
  register: (data: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    tenantId?: string;
    phone?: string;
    specialty?: string;
    cref?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (data: Partial<User>) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => false,
  loginWithRole: async () => ({ success: false }),
  register: async () => ({ success: false }),
  updateProfile: async () => false,
  logout: () => {},
  isAuthenticated: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('gymmanager-auth');
    if (!saved) return null;
    try {
      const parsed = JSON.parse(saved) as User;
      if (parsed && parsed.role) {
        parsed.role = normalizeUserRole(parsed.role);
        if (parsed.role !== 'superadmin' && !parsed.tenantId) {
          parsed.tenantId = DEFAULT_TENANT_ID;
        }
      }
      return parsed;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('gymmanager-auth', JSON.stringify(user));
    } else {
      localStorage.removeItem('gymmanager-auth');
    }
  }, [user]);

  const syncTenantBranding = async (loggedUser: User) => {
    if (loggedUser.role !== 'superadmin' && loggedUser.tenantId) {
      const tenant = await tenantService.getById(loggedUser.tenantId);
      if (tenant?.settings) {
        settingsService.saveSettings(tenant.settings);
      }
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    const found = await userService.authenticate(email, password);
    if (found && found.active !== false) {
      setUser(found);
      await syncTenantBranding(found);
      return true;
    }
    return false;
  };

  const loginWithRole = async (
    email: string,
    password: string,
    expectedRole: UserRole
  ): Promise<{ success: boolean; error?: string; actualRole?: UserRole }> => {
    const found = await userService.authenticate(email, password);
    if (!found) {
      return { success: false, error: 'Email ou senha incorretos' };
    }

    const normalizedRole = normalizeUserRole(found.role);
    if (normalizedRole !== expectedRole) {
      return {
        success: false,
        actualRole: normalizedRole,
        error: `Esta conta pertence ao perfil "${ROLE_LABELS[normalizedRole]}". Selecione o perfil correto acima para entrar.`,
      };
    }

    if (found.active === false) {
      return {
        success: false,
        error: 'Sua conta está desativada. Entre em contato com o administrador da academia.',
      };
    }

    if (normalizedRole !== 'superadmin') {
      const tenantId = found.tenantId || DEFAULT_TENANT_ID;
      const tenant = await tenantService.getById(tenantId);
      if (tenant && !tenant.active) {
        return {
          success: false,
          error: `A academia "${tenant.name}" está temporariamente suspensa na plataforma.`,
        };
      }
    }

    setUser(found);
    await syncTenantBranding(found);
    return { success: true };
  };

  const register = async (data: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    tenantId?: string;
    phone?: string;
    specialty?: string;
    cref?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    const targetTenantId = data.tenantId || DEFAULT_TENANT_ID;

    if (data.role === 'aluno' || data.role === 'personal') {
      const seatCheck = await tenantService.canAddSeat(targetTenantId);
      if (!seatCheck.allowed) {
        return { success: false, error: seatCheck.reason };
      }
    }

    const result = await userService.register({
      ...data,
      tenantId: targetTenantId,
    });
    if (result.success && result.user) {
      setUser(result.user);
      await syncTenantBranding(result.user);
    }
    return { success: result.success, error: result.error };
  };

  const updateProfile = async (data: Partial<User>): Promise<boolean> => {
    if (!user) return false;
    try {
      const updated = await userService.update(user.id, data);
      if (updated) {
        setUser(updated);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        loginWithRole,
        register,
        updateProfile,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
