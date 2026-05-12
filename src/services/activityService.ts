import { v4 as uuidv4 } from 'uuid';
import type { ActivityLog } from '../types';

const STORAGE_KEY = 'gymmanager-activity';

function getAll(): ActivityLog[] {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

function save(logs: ActivityLog[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
}

export const activityService = {
  getAll(): ActivityLog[] {
    return getAll().sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  },

  getRecent(count: number = 10): ActivityLog[] {
    return this.getAll().slice(0, count);
  },

  getRecentForStudent(studentName: string, count: number = 10): ActivityLog[] {
    return this.getAll()
      .filter(a => a.description.toLowerCase().includes(studentName.toLowerCase()))
      .slice(0, count);
  },

  log(entry: Omit<ActivityLog, 'id' | 'timestamp'>): ActivityLog {
    const logs = getAll();
    const newLog: ActivityLog = {
      ...entry,
      id: uuidv4(),
      timestamp: new Date().toISOString(),
    };
    logs.push(newLog);
    save(logs);
    return newLog;
  },
};
