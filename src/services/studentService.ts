import { v4 as uuidv4 } from 'uuid';
import type { Student } from '../types';

const STORAGE_KEY = 'gymmanager-students';

function getAll(): Student[] {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

function save(students: Student[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(students));
}

export const studentService = {
  getAll(): Student[] {
    return getAll();
  },

  getById(id: string): Student | undefined {
    return getAll().find(s => s.id === id);
  },

  getByUserId(userId: string): Student | undefined {
    return getAll().find(s => s.userId === userId);
  },

  create(student: Omit<Student, 'id' | 'createdAt'>): Student {
    const students = getAll();
    const newStudent: Student = {
      ...student,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
    };
    students.push(newStudent);
    save(students);
    return newStudent;
  },

  update(id: string, data: Partial<Student>): Student | null {
    const students = getAll();
    const index = students.findIndex(s => s.id === id);
    if (index === -1) return null;
    students[index] = { ...students[index], ...data };
    save(students);
    return students[index];
  },

  delete(id: string): boolean {
    const students = getAll();
    const filtered = students.filter(s => s.id !== id);
    if (filtered.length === students.length) return false;
    save(filtered);
    return true;
  },

  toggleActive(id: string): Student | null {
    const students = getAll();
    const index = students.findIndex(s => s.id === id);
    if (index === -1) return null;
    students[index].active = !students[index].active;
    save(students);
    return students[index];
  },

  search(query: string): Student[] {
    const lower = query.toLowerCase();
    return getAll().filter(s =>
      s.name.toLowerCase().includes(lower) ||
      s.email.toLowerCase().includes(lower) ||
      s.phone.includes(query)
    );
  },

  getActiveCount(): number {
    return getAll().filter(s => s.active).length;
  },

  getTotalCount(): number {
    return getAll().length;
  },
};
