import { studentService } from '../services/studentService';
import { workoutService } from '../services/workoutService';
import { progressService } from '../services/progressService';
import { activityService } from '../services/activityService';

const SEED_KEY = 'gymmanager-seeded';

export function seedData() {
  if (localStorage.getItem(SEED_KEY)) return;

  // Create demo students
  const students = [
    {
      name: 'Ana Silva',
      email: 'ana@email.com',
      phone: '(11) 98765-4321',
      birthDate: '1995-03-15',
      weight: 62,
      height: 165,
      goal: 'Emagrecimento',
      active: true,
      photo: '',
      userId: 'usr-aluno-001',
    },
    {
      name: 'Pedro Santos',
      email: 'pedro@email.com',
      phone: '(11) 91234-5678',
      birthDate: '1990-07-22',
      weight: 85,
      height: 178,
      goal: 'Hipertrofia',
      active: true,
      photo: '',
    },
    {
      name: 'Mariana Costa',
      email: 'mariana@email.com',
      phone: '(21) 99876-5432',
      birthDate: '1998-11-08',
      weight: 55,
      height: 160,
      goal: 'Condicionamento',
      active: true,
      photo: '',
    },
    {
      name: 'Lucas Oliveira',
      email: 'lucas@email.com',
      phone: '(31) 98765-1234',
      birthDate: '1988-01-30',
      weight: 92,
      height: 182,
      goal: 'Hipertrofia',
      active: true,
      photo: '',
    },
    {
      name: 'Julia Ferreira',
      email: 'julia@email.com',
      phone: '(41) 91234-8765',
      birthDate: '2000-05-12',
      weight: 58,
      height: 170,
      goal: 'Definição',
      active: false,
      photo: '',
    },
  ];

  const createdStudents = students.map(s => studentService.create(s));

  // Create demo workouts
  const workouts = [
    {
      studentId: createdStudents[0].id,
      instructorId: 'usr-inst-001',
      name: 'Treino A - Superior',
      description: 'Foco em peito e tríceps',
      muscleGroup: 'Peito / Tríceps',
      exercises: [
        { exerciseId: 65, sets: 4, repetitions: 12, weight: 20, notes: 'Controlar descida', order: 1 },
        { exerciseId: 66, sets: 3, repetitions: 15, weight: 15, notes: '', order: 2 },
        { exerciseId: 100, sets: 3, repetitions: 12, weight: 10, notes: 'Foco na contração', order: 3 },
        { exerciseId: 165, sets: 4, repetitions: 10, weight: 12, notes: '', order: 4 },
      ],
    },
    {
      studentId: createdStudents[0].id,
      instructorId: 'usr-inst-001',
      name: 'Treino B - Inferior',
      description: 'Foco em pernas e glúteos',
      muscleGroup: 'Pernas / Glúteos',
      exercises: [
        { exerciseId: 250, sets: 4, repetitions: 12, weight: 40, notes: 'Agachamento profundo', order: 1 },
        { exerciseId: 72, sets: 3, repetitions: 15, weight: 30, notes: '', order: 2 },
        { exerciseId: 73, sets: 3, repetitions: 12, weight: 25, notes: '', order: 3 },
      ],
    },
    {
      studentId: createdStudents[1].id,
      instructorId: 'usr-inst-001',
      name: 'Treino A - Peito/Ombro',
      description: 'Treino de empurrar',
      muscleGroup: 'Peito / Ombros',
      exercises: [
        { exerciseId: 65, sets: 4, repetitions: 10, weight: 40, notes: 'Pesado', order: 1 },
        { exerciseId: 220, sets: 4, repetitions: 8, weight: 30, notes: '', order: 2 },
        { exerciseId: 100, sets: 3, repetitions: 12, weight: 18, notes: '', order: 3 },
      ],
    },
    {
      studentId: createdStudents[2].id,
      instructorId: 'usr-inst-001',
      name: 'Treino Full Body',
      description: 'Treino completo para condicionamento',
      muscleGroup: 'Corpo Inteiro',
      exercises: [
        { exerciseId: 250, sets: 3, repetitions: 15, weight: 20, notes: '', order: 1 },
        { exerciseId: 65, sets: 3, repetitions: 12, weight: 12, notes: '', order: 2 },
        { exerciseId: 165, sets: 3, repetitions: 15, weight: 8, notes: '', order: 3 },
      ],
    },
  ];

  workouts.forEach(w => workoutService.create(w));

  // Create demo physical progress
  const progressData = [
    // Ana Silva - 6 months of progress
    { studentId: createdStudents[0].id, weight: 65, bodyFat: 28, muscleMass: 24, recordedAt: '2025-12-01T10:00:00Z' },
    { studentId: createdStudents[0].id, weight: 64, bodyFat: 27, muscleMass: 24.5, recordedAt: '2026-01-01T10:00:00Z' },
    { studentId: createdStudents[0].id, weight: 63, bodyFat: 26, muscleMass: 25, recordedAt: '2026-02-01T10:00:00Z' },
    { studentId: createdStudents[0].id, weight: 62.5, bodyFat: 25, muscleMass: 25.5, recordedAt: '2026-03-01T10:00:00Z' },
    { studentId: createdStudents[0].id, weight: 62, bodyFat: 24, muscleMass: 26, recordedAt: '2026-04-01T10:00:00Z' },
    { studentId: createdStudents[0].id, weight: 61, bodyFat: 23, muscleMass: 26.5, recordedAt: '2026-05-01T10:00:00Z' },
    // Pedro Santos
    { studentId: createdStudents[1].id, weight: 82, bodyFat: 18, muscleMass: 38, recordedAt: '2025-12-01T10:00:00Z' },
    { studentId: createdStudents[1].id, weight: 83, bodyFat: 17, muscleMass: 39, recordedAt: '2026-01-01T10:00:00Z' },
    { studentId: createdStudents[1].id, weight: 84, bodyFat: 16.5, muscleMass: 40, recordedAt: '2026-02-01T10:00:00Z' },
    { studentId: createdStudents[1].id, weight: 85, bodyFat: 16, muscleMass: 41, recordedAt: '2026-03-01T10:00:00Z' },
    { studentId: createdStudents[1].id, weight: 85, bodyFat: 15.5, muscleMass: 41.5, recordedAt: '2026-04-01T10:00:00Z' },
    // Mariana Costa
    { studentId: createdStudents[2].id, weight: 57, bodyFat: 25, muscleMass: 22, recordedAt: '2026-02-01T10:00:00Z' },
    { studentId: createdStudents[2].id, weight: 56, bodyFat: 24, muscleMass: 22.5, recordedAt: '2026-03-01T10:00:00Z' },
    { studentId: createdStudents[2].id, weight: 55, bodyFat: 23, muscleMass: 23, recordedAt: '2026-04-01T10:00:00Z' },
  ];

  progressData.forEach(p => {
    const student = createdStudents.find(s => s.id === p.studentId);
    progressService.create(p, student?.height || 170);
  });

  // Create activity logs
  const activities = [
    { userId: 'usr-inst-001', type: 'student_added' as const, description: 'Novo aluno cadastrado: Ana Silva' },
    { userId: 'usr-inst-001', type: 'student_added' as const, description: 'Novo aluno cadastrado: Pedro Santos' },
    { userId: 'usr-inst-001', type: 'workout_created' as const, description: 'Treino criado: Treino A - Superior para Ana Silva' },
    { userId: 'usr-inst-001', type: 'workout_created' as const, description: 'Treino criado: Treino B - Inferior para Ana Silva' },
    { userId: 'usr-inst-001', type: 'progress_recorded' as const, description: 'Medidas registradas para Ana Silva' },
    { userId: 'usr-inst-001', type: 'workout_created' as const, description: 'Treino criado: Treino A - Peito/Ombro para Pedro Santos' },
  ];

  activities.forEach(a => activityService.log(a));

  localStorage.setItem(SEED_KEY, 'true');
}
