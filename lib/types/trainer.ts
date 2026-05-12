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
