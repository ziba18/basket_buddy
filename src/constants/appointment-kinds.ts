import { AppointmentKind } from '@/types/shopping';

export interface AppointmentKindMeta {
  id: AppointmentKind;
  label: string;
  emoji: string;
  color: string;
}

export const APPOINTMENT_KINDS: AppointmentKindMeta[] = [
  { id: 'date', label: 'Date', emoji: '❤️', color: '#E91E63' },
  { id: 'health', label: 'Doctor', emoji: '🩺', color: '#26A69A' },
  { id: 'reminder', label: 'Reminder', emoji: '📌', color: '#FFA000' },
  { id: 'other', label: 'Other', emoji: '📅', color: '#7E57C2' },
];

export const APPOINTMENT_KIND_BY_ID: Record<AppointmentKind, AppointmentKindMeta> = Object.fromEntries(
  APPOINTMENT_KINDS.map((kind) => [kind.id, kind])
) as Record<AppointmentKind, AppointmentKindMeta>;

export function resolveAppointmentKind(raw: unknown): AppointmentKind {
  return typeof raw === 'string' && raw in APPOINTMENT_KIND_BY_ID ? (raw as AppointmentKind) : 'other';
}
