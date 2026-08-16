import type { Workout, WorkoutExercise } from '../types';
import { workoutRepository, studentRepository } from '../repositories';
import { notificationService } from './notificationService';
import { activityService } from './activityService';

export const workoutService = {
  async getAll(): Promise<Workout[]> {
    return workoutRepository.getAll();
  },

  async getById(id: string): Promise<Workout | null> {
    return workoutRepository.getById(id);
  },

  async getByStudentId(studentId: string): Promise<Workout[]> {
    return workoutRepository.getByStudentId(studentId);
  },

  async getByInstructorId(instructorId: string): Promise<Workout[]> {
    return workoutRepository.getByInstructorId(instructorId);
  },

  async getCommunityWorkouts(): Promise<Workout[]> {
    return workoutRepository.getCommunityWorkouts();
  },

  async create(workout: Omit<Workout, 'id' | 'createdAt' | 'updatedAt'>): Promise<Workout> {
    const created = await workoutRepository.create(workout);
    
    // If assigned to a student, send them a notification
    if (workout.studentId) {
      const student = await studentRepository.getById(workout.studentId);
      if (student?.userId) {
        await notificationService.add({
          userId: student.userId,
          title: '📋 Novo Treino Prescrito',
          message: `O treino "${workout.name}" foi adicionado à sua rotina.`,
          type: 'workout',
        });
      }
    }

    await activityService.log({
      userId: workout.instructorId || 'usr-inst-001',
      type: 'workout_created',
      description: `Treino "${workout.name}" criado.`,
      relatedId: created.id,
    });

    return created;
  },

  async cloneWorkout(
    workoutId: string,
    targetStudentId?: string,
    newName?: string
  ): Promise<Workout | null> {
    return workoutRepository.cloneWorkout(workoutId, targetStudentId, newName);
  },

  async prescribeToStudent(
    workoutId: string,
    studentId: string,
    instructorId?: string
  ): Promise<Workout | null> {
    const original = await this.getById(workoutId);
    if (!original) return null;

    const student = await studentRepository.getById(studentId);
    if (!student) return null;

    // Clone workout to the student
    const prescribed = await workoutRepository.cloneWorkout(
      workoutId,
      studentId,
      original.name
    );

    if (prescribed) {
      if (instructorId) {
        await workoutRepository.update(prescribed.id, { instructorId });
      }

      // Notify student
      if (student.userId) {
        await notificationService.add({
          userId: student.userId,
          title: '🎯 Novo Treino Prescrito pelo Instrutor',
          message: `O treino "${original.name}" foi atribuído ao seu perfil. Bora treinar!`,
          type: 'workout',
        });
      }

      await activityService.log({
        userId: instructorId || 'usr-inst-001',
        type: 'workout_updated',
        description: `Treino "${original.name}" prescrito para o aluno ${student.name}.`,
        relatedId: student.id,
      });
    }

    return prescribed;
  },

  async update(id: string, data: Partial<Workout>): Promise<Workout | null> {
    return workoutRepository.update(id, data);
  },

  async updateExercises(id: string, exercises: WorkoutExercise[]): Promise<Workout | null> {
    return workoutRepository.updateExercises(id, exercises);
  },

  async delete(id: string): Promise<boolean> {
    return workoutRepository.delete(id);
  },

  async getTotalCount(): Promise<number> {
    return workoutRepository.getTotalCount();
  },
};
