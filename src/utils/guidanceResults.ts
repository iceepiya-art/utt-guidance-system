import type { Appointment, DocumentSubmission, FieldTrip, School } from '../types';

/** Guidance evidence consists only of actual field-trip source records. */
export function getGuidanceResults(fieldTrips: FieldTrip[], _appointments: Appointment[], _submissions: DocumentSubmission[], _schools: School[]): FieldTrip[] {
  return fieldTrips.filter(t => !t.workType || t.workType.includes('แนะแนว'))
    .sort((a,b) => (b.date || '').localeCompare(a.date || '') || a.id.localeCompare(b.id));
}
