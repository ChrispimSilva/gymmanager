import { LocalStorageWorkoutRepository } from './localStorage/LocalStorageWorkoutRepository';
import { LocalStorageProgressRepository } from './localStorage/LocalStorageProgressRepository';
import { LocalStorageStudentRepository } from './localStorage/LocalStorageStudentRepository';
import { LocalStorageUserRepository } from './localStorage/LocalStorageUserRepository';
import { LocalStorageActivityRepository } from './localStorage/LocalStorageActivityRepository';
import { LocalStorageWorkoutSessionRepository } from './localStorage/LocalStorageWorkoutSessionRepository';
import { LocalStorageCustomExerciseRepository } from './localStorage/LocalStorageCustomExerciseRepository';
import { LocalStorageEquipmentRepository } from './localStorage/LocalStorageEquipmentRepository';
import { LocalStorageTenantRepository } from './localStorage/LocalStorageTenantRepository';

export * from './interfaces/IUserRepository';
export * from './interfaces/IStudentRepository';
export * from './interfaces/IWorkoutRepository';
export * from './interfaces/IProgressRepository';
export * from './interfaces/IActivityRepository';
export * from './interfaces/IWorkoutSessionRepository';
export * from './interfaces/ICustomExerciseRepository';
export * from './interfaces/IEquipmentRepository';
export * from './interfaces/ITenantRepository';

export * from './localStorage/LocalStorageUserRepository';
export * from './localStorage/LocalStorageStudentRepository';
export * from './localStorage/LocalStorageWorkoutRepository';
export * from './localStorage/LocalStorageProgressRepository';
export * from './localStorage/LocalStorageActivityRepository';
export * from './localStorage/LocalStorageWorkoutSessionRepository';
export * from './localStorage/LocalStorageCustomExerciseRepository';
export * from './localStorage/LocalStorageEquipmentRepository';
export * from './localStorage/LocalStorageTenantRepository';

// Instantiated repository singletons with referential dependencies
export const tenantRepository = new LocalStorageTenantRepository();
export const workoutRepository = new LocalStorageWorkoutRepository();
export const progressRepository = new LocalStorageProgressRepository();
export const sessionRepository = new LocalStorageWorkoutSessionRepository();
export const customExerciseRepository = new LocalStorageCustomExerciseRepository();
export const equipmentRepository = new LocalStorageEquipmentRepository();
export const studentRepository = new LocalStorageStudentRepository(
  workoutRepository,
  progressRepository,
  sessionRepository
);
export const userRepository = new LocalStorageUserRepository(studentRepository);
export const activityRepository = new LocalStorageActivityRepository();
