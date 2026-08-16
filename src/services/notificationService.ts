import { v4 as uuidv4 } from 'uuid';
import type { AppNotification } from '../types';

const STORAGE_KEY = 'gymmanager-notifications';

const DEFAULT_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-seed-001',
    userId: 'all',
    title: '🎉 Bem-vindo ao GymManager',
    message: 'Seu app de academia completo. Agora você pode criar seus próprios treinos ou explorar a comunidade!',
    type: 'success',
    read: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'notif-seed-002',
    userId: 'all',
    title: '💪 Comunidade de Treinos Ativa',
    message: 'Confira os treinos criados pelos instrutores e adote para a sua rotina com um clique.',
    type: 'workout',
    read: false,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
];

export const notificationService = {
  getStorage(): AppNotification[] {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_NOTIFICATIONS));
      return DEFAULT_NOTIFICATIONS;
    }
    try {
      return JSON.parse(raw) as AppNotification[];
    } catch {
      return [];
    }
  },

  saveStorage(items: AppNotification[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  },

  async getAll(userId?: string): Promise<AppNotification[]> {
    const all = this.getStorage();
    if (!userId) return all;
    return all.filter(n => n.userId === 'all' || n.userId === userId);
  },

  async getUnreadCount(userId?: string): Promise<number> {
    const list = await this.getAll(userId);
    return list.filter(n => !n.read).length;
  },

  async add(
    notif: Omit<AppNotification, 'id' | 'createdAt' | 'read'>
  ): Promise<AppNotification> {
    const all = this.getStorage();
    const newNotif: AppNotification = {
      ...notif,
      id: uuidv4(),
      read: false,
      createdAt: new Date().toISOString(),
    };
    all.unshift(newNotif);
    this.saveStorage(all);
    return newNotif;
  },

  async markAsRead(id: string): Promise<void> {
    const all = this.getStorage();
    const updated = all.map(n => (n.id === id ? { ...n, read: true } : n));
    this.saveStorage(updated);
  },

  async markAllAsRead(userId?: string): Promise<void> {
    const all = this.getStorage();
    const updated = all.map(n => {
      if (!userId || n.userId === 'all' || n.userId === userId) {
        return { ...n, read: true };
      }
      return n;
    });
    this.saveStorage(updated);
  },

  async delete(id: string): Promise<void> {
    const all = this.getStorage();
    const filtered = all.filter(n => n.id !== id);
    this.saveStorage(filtered);
  },

  async clearAll(userId?: string): Promise<void> {
    const all = this.getStorage();
    if (!userId) {
      this.saveStorage([]);
      return;
    }
    const filtered = all.filter(n => n.userId !== 'all' && n.userId !== userId);
    this.saveStorage(filtered);
  },
};
