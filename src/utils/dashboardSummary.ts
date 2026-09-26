import type { School, DocumentSubmission, Appointment, FieldTrip } from '../types';
import { getSchoolWorkflow } from './schoolStatus';

/** Submission/completion history is cumulative; appointments count the current workflow. */
export function getDashboardSummary(schools: School[], submissions: DocumentSubmission[], appointments: Appointment[], trips: FieldTrip[]) {
  const entries = schools.map(school => ({school, workflow: getSchoolWorkflow(school, submissions, appointments, trips, schools)}));
  const count = (items: typeof entries) => ({
    total: items.length,
    submitted: items.filter(e => e.workflow.guidanceSubmissions.length > 0).length,
    appointed: items.filter(e => e.workflow.status === 'APPOINTED').length,
    completed: items.filter(e => e.workflow.schoolTrips.length > 0).length,
    pending: items.filter(e => ['NOT_STARTED', 'WAITING_CONTACT', 'WAITING_APPOINTMENT', 'CANCELLED'].includes(e.workflow.status)).length,
  });
  return {all: count(entries), team1: count(entries.filter(e => e.school.teamId === 'team1')), team2: count(entries.filter(e => e.school.teamId === 'team2'))};
}
