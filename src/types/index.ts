// ============================================================
// GymManager — Type Definitions
// ============================================================

export type UserRole = 'admin' | 'instrutor' | 'aluno';

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  avatar?: string;
  createdAt: string;
}

export interface Student {
  id: string;
  userId?: string;
  name: string;
  email: string;
  phone: string;
  birthDate: string;
  weight: number;
  height: number;
  goal: string;
  active: boolean;
  createdAt: string;
  photo?: string;
}

export interface Exercise {
  nome: string;
  musculos: string;
  equipamento: string;
  gif: string;
  descricao: string;
}

export interface NormalizedExercise extends Exercise {
  id: number;
  category: string;
}

export interface WorkoutExercise {
  exerciseId: number;
  sets: number;
  repetitions: number;
  weight: number;
  notes: string;
  order: number;
}

export interface Workout {
  id: string;
  studentId: string;
  instructorId: string;
  name: string;
  description: string;
  muscleGroup: string;
  exercises: WorkoutExercise[];
  createdAt: string;
  updatedAt: string;
}

export interface PhysicalProgress {
  id: string;
  studentId: string;
  weight: number;
  bodyFat?: number;
  muscleMass?: number;
  bmi: number;
  recordedAt: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  type: 'workout_created' | 'workout_completed' | 'student_added' | 'progress_recorded' | 'workout_updated';
  description: string;
  timestamp: string;
  relatedId?: string;
}

// Muscle group categories for normalization
export const MUSCLE_CATEGORIES: Record<string, string[]> = {
  'Peito': ['peito', 'peitoral'],
  'Costas': ['costas', 'latíssimo', 'dorso', 'asa'],
  'Ombros': ['ombro', 'deltóide'],
  'Bíceps': ['bíceps'],
  'Tríceps': ['tríceps'],
  'Pernas': ['perna', 'quadríceps', 'isquiotibiais', 'quadril'],
  'Abdominais': ['abdomin', 'abdômen', 'core'],
  'Panturrilha': ['panturrilha'],
  'Antebraço': ['antebraço'],
  'Trapézio': ['trapézio'],
  'Lombar': ['eretor', 'lombar', 'espinha'],
  'Pescoço': ['pescoço'],
  'Cardio': ['cardio'],
  'Corpo Inteiro': ['corpo inteiro'],
};

export function normalizeMuscleGroup(musculos: string): string {
  const lower = musculos.toLowerCase();
  for (const [category, keywords] of Object.entries(MUSCLE_CATEGORIES)) {
    if (keywords.some(kw => lower.includes(kw))) {
      return category;
    }
  }
  return 'Outros';
}

// Equipment categories
export const EQUIPMENT_TYPES = [
  'Barra',
  'Halteres',
  'Cabo',
  'Máquina',
  'Kettlebell',
  'Banco  sem',
  'Banco completo ginásio',
  'Placa de ginásio completa',
] as const;
