import { DEFAULT_TENANT_ID, type User, type UserRole } from '../types';

const AUTH_STORAGE_KEY = 'gymmanager-auth';

export function normalizeUserRole(role: string): UserRole {
  if (role === 'instrutor') return 'personal';
  if (role === 'superadmin' || role === 'admin' || role === 'personal' || role === 'aluno') {
    return role;
  }
  return 'aluno';
}

export function getActiveSessionUser(): User | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as User;
    if (parsed && parsed.role) {
      parsed.role = normalizeUserRole(parsed.role);
    }
    return parsed;
  } catch {
    return null;
  }
}

export function getActiveTenantId(): string | null {
  const user = getActiveSessionUser();
  if (!user || user.role === 'superadmin') {
    return null;
  }
  return user.tenantId || DEFAULT_TENANT_ID;
}

export function resolveTenantId(explicitTenantId?: string): string {
  return explicitTenantId || getActiveTenantId() || DEFAULT_TENANT_ID;
}

export function matchesActiveTenant(itemTenantId?: string, explicitTenantId?: string): boolean {
  const target = explicitTenantId ?? getActiveTenantId();
  if (!target) return true;
  return (itemTenantId || DEFAULT_TENANT_ID) === target;
}
