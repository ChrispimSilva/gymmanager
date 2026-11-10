// ============================================================
// GymManager — Type Definitions
// ============================================================

export type UserRole = 'superadmin' | 'admin' | 'personal' | 'aluno';

export const DEFAULT_TENANT_ID = 'tenant-default';

export type BillingStatus = 'free' | 'trial' | 'active' | 'past_due' | 'suspended';

export interface TenantLicensing {
  billingModel: 'per_seat';
  isPaid: boolean;
  pricePerSeatCents: number;
  maxSeats: number | null;
  billingStatus: BillingStatus;
}

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  ownerUserId: string;
  document?: string;
  email: string;
  phone?: string;
  active: boolean;
  settings: GymSettings;
  licensing: TenantLicensing;
  createdAt: string;
}

export interface TenantSeatUsage {
  tenantId: string;
  activePersonals: number;
  totalPersonals: number;
  activeStudents: number;
  totalStudents: number;
  usedSeats: number; // activePersonals + activeStudents
  maxSeats: number | null;
  estimatedMonthlyCents: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  tenantId?: string;
  active?: boolean;
  phone?: string;
  specialty?: string;
  cref?: string;
  avatar?: string;
  createdAt: string;
}

export interface Student {
  id: string;
  userId?: string;
  tenantId?: string;
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
  tenantId?: string;
  category: string;
  isCustom: true;
  createdAt: string;
}

export interface EquipmentItem {
  id: string;
  tenantId?: string;
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
  tenantId?: string;
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
  tenantId?: string;
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
  tenantId?: string;
  studentId: string;
  weight: number;
  bodyFat?: number;
  muscleMass?: number;
  bmi: number;
  recordedAt: string;
}

export interface ActivityLog {
  id: string;
  tenantId?: string;
  userId: string;
  type:
    | 'workout_created'
    | 'workout_completed'
    | 'workout_shared'
    | 'student_added'
    | 'progress_recorded'
    | 'workout_updated'
    | 'exercise_created'
    | 'equipment_added'
    | 'personal_added'
    | 'tenant_created';
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
