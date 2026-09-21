import { Appointment, AppointmentStatus, FieldTrip } from '../types';

/**
 * Valid active workflow statuses in the Appointment management pipeline.
 */
export const ACTIVE_APPOINTMENT_STATUSES: AppointmentStatus[] = [
  'PENDING',
  'TENTATIVE',
  'CONFIRMED',
  'RESCHEDULED',
];

/**
 * Determines whether an appointment has completed the guidance phase.
 *
 * Business Rules:
 * 1. Stable Relation: A FieldTrip explicitly references this appointment via fieldTrip.appointmentId === appointment.id.
 * 2. Explicit Status: The appointment record status is 'COMPLETED'.
 * 3. Stable relation only: NEVER use schoolName or fuzzy matching alone.
 * 4. CONFIRMED appointment without a matching FieldTrip is ACTIVE (CONFIRMED != GUIDANCE COMPLETED).
 */
export const isAppointmentGuidanceCompleted = (
  appt: Appointment,
  fieldTrips: FieldTrip[] = []
): boolean => {
  // 1. Explicit COMPLETED status
  if (appt.status === 'COMPLETED') {
    return true;
  }

  if (fieldTrips && fieldTrips.length > 0) {
    // Priority A: Direct appointmentId match
    if (fieldTrips.some((ft) => ft.appointmentId && ft.appointmentId === appt.id)) {
      return true;
    }

    // Priority B: Direct non-empty submissionId match (only when no appointmentId conflict)
    if (appt.submissionId && appt.submissionId.trim() !== '') {
      const matchSub = fieldTrips.find(
        (ft) => ft.submissionId && ft.submissionId.trim() === appt.submissionId?.trim()
      );
      if (matchSub) {
        // Priority conflict: if fieldTrip has an appointmentId pointing to another appointment, RELATION_CONFLICT: do NOT hide!
        if (matchSub.appointmentId && matchSub.appointmentId !== appt.id) {
          return false;
        }
        return true;
      }
    }
  }

  return false;
};

/**
 * Returns strictly the active appointments that still need action.
 * Excludes cancelled and guidance-completed appointments.
 */
export const filterActiveAppointments = (
  appointments: Appointment[],
  fieldTrips: FieldTrip[] = []
): Appointment[] => {
  return appointments.filter(
    (appt) =>
      appt.status !== 'CANCELLED' &&
      ACTIVE_APPOINTMENT_STATUSES.includes(appt.status) &&
      !isAppointmentGuidanceCompleted(appt, fieldTrips)
  );
};

/**
 * Formats vehicle string for concise list display (e.g. "VIGO กข 9914" instead of "VIGO กข 9914 (กระบะ 4 ประตู)").
 * Preserves the base model and registration while removing extraneous parenthesized descriptions.
 */
export const formatVehicleDisplay = (rawVehicleName?: string | null): string => {
  if (!rawVehicleName || !rawVehicleName.trim()) {
    return 'ไม่ระบุ';
  }
  // Strip parenthesized suffixes like "(กระบะ 4 ประตู)", "(ตู้แนะแนว)", "(กระบะแค็บ)", etc.
  const cleaned = rawVehicleName.replace(/\s*\([^)]*\)/g, '').trim();
  return cleaned || 'ไม่ระบุ';
};

/**
 * Validates that both startTime and endTime are non-empty valid HH:mm strings
 * and endTime is strictly after startTime.
 * Returns false if either is missing, not parseable, or endTime <= startTime.
 */
export const isValidTimeRange = (
  startTime?: string | null,
  endTime?: string | null
): boolean => {
  if (!startTime || !endTime) return false;
  const s = startTime.trim();
  const e = endTime.trim();
  if (!s || !e) return false;

  const timeRegex = /^([01]?\d|2[0-3]):[0-5]\d$/;
  if (!timeRegex.test(s) || !timeRegex.test(e)) {
    return false;
  }

  const padTime = (t: string) => (t.length === 4 ? `0${t}` : t);
  return padTime(e) > padTime(s);
};

/**
 * Validates that endTime is strictly after startTime (HH:mm format).
 * Backward-compatible alias for isValidTimeRange.
 */
export const isTimeRangeValid = (
  startTime?: string | null,
  endTime?: string | null
): boolean => {
  return isValidTimeRange(startTime, endTime);
};

export interface FormatTimeOptions {
  suffix?: boolean; // default true (' น.')
  showNoteIfInvalid?: boolean; // default false
}

/**
 * Formats appointment time safely without displaying invalid legacy ranges (e.g. 13:00 - 12:00).
 * - If range is valid (endTime > startTime): "09:20 - 12:00 น."
 * - If range is invalid (endTime <= startTime): "13:00 น." (or "13:00 น. (ไม่ระบุเวลาสิ้นสุด)")
 * - If only startTime: "13:00 น."
 * - If neither: "-"
 */
export const formatAppointmentTime = (
  startTime?: string | null,
  endTime?: string | null,
  options?: FormatTimeOptions
): string => {
  const s = startTime?.trim();
  const e = endTime?.trim();
  const suffix = options?.suffix !== false ? ' น.' : '';

  if (!s && !e) return '-';
  if (!s && e) return `${e}${suffix}`;

  if (s && e && isValidTimeRange(s, e)) {
    return `${s} - ${e}${suffix}`;
  }

  if (s) {
    if (e && !isValidTimeRange(s, e) && options?.showNoteIfInvalid) {
      return `${s}${suffix} (ไม่ระบุเวลาสิ้นสุด)`;
    }
    return `${s}${suffix}`;
  }

  return '-';
};


