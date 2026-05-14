import { api } from './client';
import type {
  ClientDailySummaryDto,
  ExerciseLibraryItemDto,
  ExerciseLibraryPageDto,
  TrainerClientDto,
  TrainerLibraryExerciseDto,
  TrainerLibraryExerciseRequest,
  TrainerScheduleDto,
} from '@/lib/types/trainer';

export function listSchedules(): Promise<TrainerScheduleDto[]> {
  return api<TrainerScheduleDto[]>('/trainers/me/schedules');
}

export function getClientDailySummary(date: string): Promise<ClientDailySummaryDto[]> {
  const qs = new URLSearchParams({ date });
  return api<ClientDailySummaryDto[]>(`/trainers/me/clients/daily-summary?${qs}`);
}

export function listTrainerClients(): Promise<TrainerClientDto[]> {
  return api<TrainerClientDto[]>('/trainers/me/clients');
}

export interface CreateScheduleRequest {
  scheduleDate: string;
  startTime: string;
  endTime: string;
  agenda?: string | null;
  isUnavailable: boolean;
  clientId?: string | null;
  clientLabel?: string | null;
}

export function createSchedule(req: CreateScheduleRequest): Promise<TrainerScheduleDto> {
  return api<TrainerScheduleDto>('/trainers/me/schedules', {
    method: 'POST',
    json: req as unknown as Record<string, unknown>,
  });
}

export function approveSchedule(id: number): Promise<TrainerScheduleDto> {
  return api<TrainerScheduleDto>(`/trainers/me/schedules/${id}/approve`, { method: 'PATCH' });
}

export function deleteSchedule(id: number): Promise<void> {
  return api<void>(`/trainers/me/schedules/${id}`, { method: 'DELETE' });
}

// ── Trainer exercise library ──────────────────────────────────────────────────

export function listTrainerLibrary(): Promise<TrainerLibraryExerciseDto[]> {
  return api<TrainerLibraryExerciseDto[]>('/trainers/me/library');
}

export function addTrainerLibraryExercise(
  req: TrainerLibraryExerciseRequest,
): Promise<TrainerLibraryExerciseDto> {
  return api<TrainerLibraryExerciseDto>('/trainers/me/library', {
    method: 'POST',
    json: req as unknown as Record<string, unknown>,
  });
}

export function updateTrainerLibraryExercise(
  id: string,
  req: TrainerLibraryExerciseRequest,
): Promise<TrainerLibraryExerciseDto> {
  return api<TrainerLibraryExerciseDto>(`/trainers/me/library/${id}`, {
    method: 'PUT',
    json: req as unknown as Record<string, unknown>,
  });
}

export function deleteTrainerLibraryExercise(id: string): Promise<void> {
  return api<void>(`/trainers/me/library/${id}`, { method: 'DELETE' });
}

// ── Global ExerciseDB search ──────────────────────────────────────────────────

export function searchExerciseLibrary(params: {
  query?: string;
  bodyPart?: string;
  cursor?: string;
}): Promise<ExerciseLibraryPageDto> {
  const qs = new URLSearchParams();
  if (params.query?.trim()) qs.set('search', params.query.trim());
  if (params.bodyPart) qs.set('bodyPart', params.bodyPart);
  if (params.cursor) qs.set('cursor', params.cursor);
  return api<ExerciseLibraryPageDto>(`/exercise-library?${qs}`);
}
