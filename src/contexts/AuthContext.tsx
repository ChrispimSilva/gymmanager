import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User, UserRole } from '../types';
import { userService } from '../services/userService';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (data: { name: string; email: string; password: string; role: UserRole }) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (data: Partial<User>) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => false,
  register: async () => ({ success: false }),
  updateProfile: async () => false,
  logout: () => {},
  isAuthenticated: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('gymmanager-auth');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('gymmanager-auth', JSON.stringify(user));
    } else {
      localStorage.removeItem('gymmanager-auth');
    }
  }, [user]);

  const login = async (email: string, password: string): Promise<boolean> => {
    const found = await userService.authenticate(email, password);
    if (found) {
      setUser(found);
      return true;
    }
    return false;
  };

  const register = async (data: { name: string; email: string; password: string; role: UserRole }): Promise<{ success: boolean; error?: string }> => {
    const result = await userService.register(data);
    if (result.success && result.user) {
      setUser(result.user);
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
    <AuthContext.Provider value={{ user, login, register, updateProfile, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
