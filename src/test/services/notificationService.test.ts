import { describe, it, expect, beforeEach } from 'vitest';
import { notificationService } from '../../services/notificationService';

describe('notificationService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should initialize with default notifications', async () => {
    const list = await notificationService.getAll();
    expect(list.length).toBeGreaterThanOrEqual(1);
    const unread = await notificationService.getUnreadCount();
    expect(unread).toBeGreaterThanOrEqual(1);
  });

  it('should add new notification and mark it as read', async () => {
    const created = await notificationService.add({
      userId: 'usr-aluno-001',
      title: 'Treino A Prescrito',
      message: 'Seu treino foi atualizado pelo instrutor.',
      type: 'workout',
    });

    expect(created.id).toBeDefined();
    expect(created.read).toBe(false);

    await notificationService.markAsRead(created.id);
    const updatedList = await notificationService.getAll('usr-aluno-001');
    const found = updatedList.find(n => n.id === created.id);
    expect(found?.read).toBe(true);
  });

  it('should mark all notifications as read', async () => {
    await notificationService.markAllAsRead();
    const unread = await notificationService.getUnreadCount();
    expect(unread).toBe(0);
  });

  it('should delete a notification', async () => {
    const created = await notificationService.add({
      userId: 'all',
      title: 'Aviso Temporário',
      message: 'Aviso teste',
      type: 'info',
    });

    await notificationService.delete(created.id);
    const list = await notificationService.getAll();
    expect(list.find(n => n.id === created.id)).toBeUndefined();
  });
});
