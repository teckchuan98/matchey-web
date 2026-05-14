export type ScheduleStatus = 'APPROVED' | 'PENDING' | 'CANCELLED';

export interface TrainerScheduleDto {
  id: number;
  scheduleDate: string;
  startTime: string;
  endTime: string;
  agenda: string | null;
  isUnavailable: boolean;
  clientId: string | null;
  clientName: string | null;
  clientLabel: string | null;
  trainerId: string;
  trainerName: string | null;
  status: ScheduleStatus | string;
  requestedByClientId: string | null;
  requestedByClientName: string | null;
  createdAt: string;
}

export interface ClientDailySummaryDto {
  clientId: string;
  clientName: string;
  photoUrl: string | null;
  mealCount: number;
  workoutLogged: boolean;
  planAssigned: boolean;
  offDay: boolean;
  sessionsLeft: number | null;
}

export interface TrainerClientDto {
  id: string;
  email: string | null;
  name: string | null;
  goals: string | null;
  photoUrl: string | null;
  phone: string | null;
  onboardingComplete: boolean;
  totalSessions: number | null;
  sessionsLeft: number | null;
}

export interface TrainerDto {
  id: string;
  email: string | null;
  name: string | null;
  specialty: string | null;
  phone: string | null;
  photoUrl: string | null;
  onboardingComplete: boolean;
}

export interface TrainerLibraryExerciseDto {
  id: string;
  name: string;
  category: string | null;
  exerciseRef: string | null; // "db:xxxx" | "custom:uuid" | null
  gifUrl: string | null;
  instructions: string[] | null;
  defaultSets: number;
  defaultReps: number;
  defaultWeight: number | null;
  weightUnit: string; // "kg" | "lb"
  sequentialWeight: boolean;
  perSetWeights: number[] | null;
  perSetReps: number[] | null;
  position: number;
}

export interface TrainerLibraryExerciseRequest {
  name: string;
  category?: string | null;
  exerciseRef?: string | null;
  gifUrl?: string | null;
  instructions?: string[];
  defaultSets: number;
  defaultReps: number;
  defaultWeight?: number | null;
  weightUnit: string;
  sequentialWeight: boolean;
  perSetReps?: number[] | null;
  perSetWeights?: (number | null)[] | null;
}

// Returned by GET /exercise-library — id is already "db:{id}" prefixed
export interface ExerciseLibraryItemDto {
  id: string;        // "db:xxxx"
  name: string;
  bodyPart: string | null;
  target: string | null;
  equipment: string | null;
  mediaUrl: string | null;
  instructions: string[];
}

export interface ExerciseLibraryPageDto {
  items: ExerciseLibraryItemDto[];
  hasNextPage: boolean;
  nextCursor: string | null;
}
