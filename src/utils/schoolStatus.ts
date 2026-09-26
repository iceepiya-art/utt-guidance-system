import { getSubmissionDisplayStatus } from './submissionUtils';
import { selectCurrentSchoolCycle } from './schoolWorkflowCycle';
import { School, DocumentSubmission, Appointment, FieldTrip, SchoolStatus } from '../types';

export const cleanSchoolName = (s: string) =>
  (s || '')
    .replace(/^(โรงเรียน|รร\.)\s*/, '')
    .replace(/\s+/g, '')
    .toLowerCase();

/** Resolve only stable document IDs or exact, unique legacy school codes. */
export function resolveSchoolRelation(id: string | undefined, schools: School[]): School | undefined {
  if (!id) return undefined;
  const direct = schools.find(s => s.id === id);
  if (direct) return direct;
  const matches = schools.filter(s => s.schoolId === id);
  return matches.length === 1 ? matches[0] : undefined;
}

export const SCHOOL_STATUS_LABELS: Record<SchoolStatus, string> = {
  NOT_STARTED: 'ยังไม่ได้ยื่นหนังสือแนะแนว', DOCUMENT_SUBMITTED: 'ยื่นหนังสือแล้ว',
  WAITING_APPOINTMENT: 'รอนัดหมาย', WAITING_CONTACT: 'รอติดต่อกลับ',
  APPOINTED: 'นัดหมายแล้ว', GUIDANCE_COMPLETED: 'แนะแนวเรียบร้อยแล้ว', CANCELLED: 'ยกเลิกนัดหมาย',
};

/** Shared read-only projection for Dashboard and school timeline. Never writes historical records. */
export function getSchoolWorkflow(
  school: School, submissions: DocumentSubmission[] = [], appointments: Appointment[] = [],
  fieldTrips: FieldTrip[] = [], schools?: School[]
) {
  // Without the complete catalog, document IDs remain safe but legacy-code uniqueness is unknown.
  const matches = (id?: string) => !!id && (schools
    ? resolveSchoolRelation(id, schools)?.id === school.id
    : id === school.id);
  const knownOtherSchool = (id?: string) => !!id && !!schools && !!resolveSchoolRelation(id, schools) && !matches(id);
  const schoolSubmissions = submissions.filter(s => matches(s.schoolId)).sort((a,b) =>
    (b.submissionDate || '').localeCompare(a.submissionDate || '') || (b.submissionTime || '').localeCompare(a.submissionTime || '') || b.id.localeCompare(a.id));
  const submissionIds = new Set(schoolSubmissions.map(s => s.id));
  const schoolAppointments = appointments.filter(a => matches(a.schoolId) ||
    (!knownOtherSchool(a.schoolId) && ((!!a.submissionId && submissionIds.has(a.submissionId)) || schoolSubmissions.some(s => s.appointmentId === a.id))))
    .sort((a,b) => (b.date || '').localeCompare(a.date || '') || b.id.localeCompare(a.id));
  const appointmentIds = new Set(schoolAppointments.map(a => a.id));
  const schoolTrips = fieldTrips.filter(t => {
    if (t.workType && !t.workType.includes('แนะแนว')) return false;
    if (t.schools?.some(s => matches(s.schoolId))) return true;
    // A trip's explicit school entries take priority over its parent link.
    if (t.schools?.some(s => schools ? !!resolveSchoolRelation(s.schoolId, schools) : !!s.schoolId)) return false;
    if (t.appointmentId) {
      const appt = appointments.find(a => a.id === t.appointmentId);
      if (appt) return appointmentIds.has(appt.id);
    }
    return (!!t.submissionId && submissionIds.has(t.submissionId)) || schoolSubmissions.some(s => s.fieldTripId === t.id);
  }).sort((a,b) => (b.date || '').localeCompare(a.date || '') || b.id.localeCompare(a.id));
  const completedAppointments = schoolAppointments.filter(a => a.status === 'COMPLETED');
  const activeAppointments = schoolAppointments.filter(a => ['PENDING', 'TENTATIVE', 'CONFIRMED', 'RESCHEDULED'].includes(a.status));
  const guidanceSubmissions = schoolSubmissions.filter(s => !getSubmissionDisplayStatus(s).isOtherActivity);
  const current = selectCurrentSchoolCycle(guidanceSubmissions, schoolAppointments, schoolTrips);
  const currentCompleted = current.appointments.filter(a => a.status === 'COMPLETED');
  const currentActive = current.appointments.filter(a => ['PENDING','TENTATIVE','CONFIRMED','RESCHEDULED'].includes(a.status));
  const latest = current.submissions[0];
  let status: SchoolStatus = 'NOT_STARTED';
  if (current.trips.length) status = 'GUIDANCE_COMPLETED';
  else if (currentActive.length || currentCompleted.length) status = 'APPOINTED';
  else if (current.appointments.some(a => a.status === 'CANCELLED')) status = 'CANCELLED';
  else if (latest) status = latest.status === 'WAITING_CONTACT' || latest.status === 'CALL_LATER' ? 'WAITING_CONTACT' : 'WAITING_APPOINTMENT';
  return { status, current, guidanceSubmissions, schoolSubmissions, schoolAppointments, schoolTrips, completedAppointments, activeAppointments,
    storedCompletionOnly: school.currentStatus === 'GUIDANCE_COMPLETED' && !schoolTrips.length && !completedAppointments.length };
}

export function getSchoolEffectiveStatus(
  school: School, submissions: DocumentSubmission[] = [], appointments: Appointment[] = [],
  fieldTrips: FieldTrip[] = [], schools?: School[]
): SchoolStatus {
  return getSchoolWorkflow(school, submissions, appointments, fieldTrips, schools).status;
}

/**
 * Formats school name for concise list/table presentation by removing the leading "โรงเรียน" or "รร." prefix.
 * Preserves the actual school name without modifying underlying database records.
 * Examples:
 * - "โรงเรียนทองแสนขันวิทยา" -> "ทองแสนขันวิทยา"
 * - "โรงเรียนบ้านวังดิน" -> "บ้านวังดิน"
 * - "โรงเรียนบ้านแพะ" -> "บ้านแพะ"
 * - "โรงเรียนเตรียมอุดมศึกษาน้อมเกล้า อุตรดิตถ์" -> "เตรียมอุดมศึกษาน้อมเกล้า อุตรดิตถ์"
 * - "โรงเรียนเทศบาลวัดหนองผา" -> "เทศบาลวัดหนองผา"
 */
export const formatSchoolDisplayName = (name?: string | null): string => {
  if (!name) return '';
  let cleaned = name.trim();
  while (/^(โรงเรียน|รร\.)\s*/.test(cleaned)) {
    cleaned = cleaned.replace(/^(โรงเรียน|รร\.)\s*/, '').trim();
  }
  return cleaned;
};

/**
 * Returns genuine user-facing school code (e.g. 10-digit MOE code or SCH-xxx).
 * Strips technical/database identifiers (Firestore document IDs, import prefixes, etc.).
 * Returns null if no genuine user-facing school code exists.
 */
export const getCleanSchoolCode = (rawCode?: string | null): string | null => {
  if (!rawCode) return null;
  const trimmed = rawCode.trim();
  if (!trimmed) return null;
  // Ignore internal technical IDs
  if (/^(import_|manual_|legacy_|sch_)/i.test(trimmed)) return null;
  // Ignore Firestore document IDs (typically 18-32 random alphanumeric characters)
  if (/^[a-zA-Z0-9_-]{18,32}$/.test(trimmed) && !/^\d+$/.test(trimmed) && !/^SCH-\d+/i.test(trimmed)) {
    return null;
  }
  // Allow official 6-12 digit MOE school code or standard SCH-xxx
  if (/^\d{6,12}$/.test(trimmed) || /^SCH-\d+/i.test(trimmed)) {
    return trimmed;
  }
  return null;
};

