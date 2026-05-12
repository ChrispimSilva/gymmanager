import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User, UserRole } from '../types';
import { userService } from '../services/userService';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => boolean;
  register: (data: { name: string; email: string; password: string; role: UserRole }) => { success: boolean; error?: string };
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: () => false,
  register: () => ({ success: false }),
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

  const login = (email: string, password: string): boolean => {
    const found = userService.authenticate(email, password);
    if (found) {
      setUser(found);
      return true;
    }
    return false;
  };

  const register = (data: { name: string; email: string; password: string; role: UserRole }): { success: boolean; error?: string } => {
    const result = userService.register(data);
    if (result.success && result.user) {
      setUser(result.user);
    }
    return { success: result.success, error: result.error };
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
