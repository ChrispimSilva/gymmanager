import type { User, UserRole } from '../types';
import { userRepository } from '../repositories';

export const userService = {
  async getAll(): Promise<User[]> {
    return userRepository.getAll();
  },

  async findById(id: string): Promise<User | null> {
    return userRepository.findById(id);
  },

  async findByEmail(email: string): Promise<User | null> {
    return userRepository.findByEmail(email);
  },

  async authenticate(email: string, password: string): Promise<User | null> {
    return userRepository.authenticate(email, password);
  },

  async register(data: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
  }): Promise<{ success: boolean; user?: User; error?: string }> {
    return userRepository.register(data);
  },

  async update(id: string, data: Partial<User>): Promise<User | null> {
    return userRepository.update(id, data);
  },
};
