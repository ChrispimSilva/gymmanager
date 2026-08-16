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
  id: number | string;
  category: string;
  isCustom?: boolean;
}

export interface CustomExercise extends Exercise {
  id: string;
  category: string;
  isCustom: true;
  createdAt: string;
}

export interface EquipmentItem {
  id: string;
  name: string;
  brand?: string;
  model?: string;
  location: string; // e.g. "Piso 1", "Andar 2", "Área Maromba", "Setor Cardio"
  status: 'ativo' | 'manutencao' | 'inativo';
  notes?: string;
  createdAt: string;
}

export interface WorkoutExercise {
  exerciseId: number | string;
  sets: number;
  repetitions: number;
  weight: number;
  notes: string;
  order: number;
}

export interface Workout {
  id: string;
  studentId?: string;
  instructorId: string;
  name: string;
  description: string;
  muscleGroup: string;
  exercises: WorkoutExercise[];
  isCommunity?: boolean;
  authorName?: string;
  authorRole?: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'workout';
  read: boolean;
  createdAt: string;
  link?: string;
}

export interface GymAvatar {
  id: string;
  name: string;
  iconEmoji: string;
  bgGradient: string;
  label: string;
}

export interface CompletedSet {
  setNumber: number;
  repetitions: number;
  weight: number;
  completed: boolean;
}

export interface CompletedExercise {
  exerciseId: number | string;
  exerciseName: string;
  sets: CompletedSet[];
}

export interface WorkoutSession {
  id: string;
  workoutId: string;
  workoutName: string;
  studentId: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  totalVolumeKg: number;
  completedSetsCount: number;
  totalSetsCount: number;
  exercises: CompletedExercise[];
  notes?: string;
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
  type:
    | 'workout_created'
    | 'workout_completed'
    | 'workout_shared'
    | 'student_added'
    | 'progress_recorded'
    | 'workout_updated'
    | 'exercise_created'
    | 'equipment_added';
  description: string;
  timestamp: string;
  relatedId?: string;
}

export interface GymSettings {
  gymName: string;
  logoUrl?: string;
  primaryColor: string; // Hex color code, e.g. '#10b981'
  themePreset: 'emerald' | 'indigo' | 'blue' | 'crimson' | 'amber' | 'pink' | 'cyan' | 'custom';
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
  'Peso Corporal',
  'Elástico',
] as const;
