import { api } from './client';
import type {
  ClientDailySummaryDto,
  TrainerClientDto,
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
