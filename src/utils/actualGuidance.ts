import type {Appointment, FieldTrip} from '../types';

/** A legacy appointment status alone is never a saved result. */
export function hasActualGuidance(appointment: Appointment, trips: FieldTrip[]) {
  return trips.some(trip => (!trip.workType || trip.workType.includes('แนะแนว')) &&
    (trip.appointmentId === appointment.id || (!trip.appointmentId && !!appointment.submissionId && trip.submissionId === appointment.submissionId)));
}
