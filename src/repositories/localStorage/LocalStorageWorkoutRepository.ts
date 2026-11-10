import { v4 as uuidv4 } from 'uuid';
import type { Workout, WorkoutExercise } from '../../types';
import type { IWorkoutRepository } from '../interfaces/IWorkoutRepository';
import { matchesActiveTenant, resolveTenantId } from '../../utils/tenantContext';

const STORAGE_KEY = 'gymmanager-workouts';

export class LocalStorageWorkoutRepository implements IWorkoutRepository {
  private getStorageData(): Workout[] {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }

  private saveStorageData(workouts: Workout[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workouts));
  }

  async getAll(): Promise<Workout[]> {
    return this.getStorageData().filter(w => matchesActiveTenant(w.tenantId));
  }

  async getById(id: string): Promise<Workout | null> {
    const workout = this.getStorageData().find(w => w.id === id);
    return workout || null;
  }

  async getByStudentId(studentId: string): Promise<Workout[]> {
    return this.getStorageData().filter(w => w.studentId === studentId);
  }

  async getByInstructorId(instructorId: string): Promise<Workout[]> {
    return this.getStorageData().filter(w => w.instructorId === instructorId);
  }

  async getCommunityWorkouts(): Promise<Workout[]> {
    // Community workouts are either explicitly flagged isCommunity === true,
    // or unassigned templates (no studentId), or created by instructors/admin
    return this.getStorageData().filter(
      w => matchesActiveTenant(w.tenantId) && w.isCommunity !== false
    );
  }

  async cloneWorkout(
    workoutId: string,
    targetStudentId?: string,
    newName?: string
  ): Promise<Workout | null> {
    const original = await this.getById(workoutId);
    if (!original) return null;

    const cloned: Workout = {
      ...original,
      id: uuidv4(),
      tenantId: resolveTenantId(original.tenantId),
      name: newName || `${original.name} (Cópia)`,
      studentId: targetStudentId,
      isCommunity: !targetStudentId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const workouts = this.getStorageData();
    workouts.push(cloned);
    this.saveStorageData(workouts);
    return cloned;
  }

  async create(workout: Omit<Workout, 'id' | 'createdAt' | 'updatedAt'>): Promise<Workout> {
    const workouts = this.getStorageData();
    const newWorkout: Workout = {
      ...workout,
      tenantId: resolveTenantId(workout.tenantId),
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    workouts.push(newWorkout);
    this.saveStorageData(workouts);
    return newWorkout;
  }

  async update(id: string, data: Partial<Workout>): Promise<Workout | null> {
    const workouts = this.getStorageData();
    const index = workouts.findIndex(w => w.id === id);
    if (index === -1) return null;

    workouts[index] = {
      ...workouts[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    this.saveStorageData(workouts);
    return workouts[index];
  }

  async updateExercises(id: string, exercises: WorkoutExercise[]): Promise<Workout | null> {
    return this.update(id, { exercises });
  }

  async delete(id: string): Promise<boolean> {
    const workouts = this.getStorageData();
    const filtered = workouts.filter(w => w.id !== id);
    if (filtered.length === workouts.length) return false;
    this.saveStorageData(filtered);
    return true;
  }

  async deleteByStudentId(studentId: string): Promise<number> {
    const workouts = this.getStorageData();
    const remaining = workouts.filter(w => w.studentId !== studentId);
    const countDeleted = workouts.length - remaining.length;
    if (countDeleted > 0) {
      this.saveStorageData(remaining);
    }
    return countDeleted;
  }

  async getTotalCount(): Promise<number> {
    const all = await this.getAll();
    return all.length;
  }
}
