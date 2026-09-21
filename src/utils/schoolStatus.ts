import { School, DocumentSubmission, Appointment, FieldTrip, SchoolStatus } from '../types';

export const cleanSchoolName = (s: string) =>
  (s || '')
    .replace(/^(โรงเรียน|รร\.)\s*/, '')
    .replace(/\s+/g, '')
    .toLowerCase();

/**
 * Dynamically compute the unified, interconnected status of a school
 * by checking linked appointments, field trips, and letter submissions.
 */
export function getSchoolEffectiveStatus(
  school: School,
  submissions: DocumentSubmission[] = [],
  appointments: Appointment[] = [],
  fieldTrips: FieldTrip[] = []
): SchoolStatus {
  const schoolClean = cleanSchoolName(school.schoolName);

  // 1. Check if Guidance is Completed
  const hasCompletedAppt = appointments.some((a) => {
    const aClean = cleanSchoolName(a.schoolName);
    const isMatch =
      a.schoolId === school.id ||
      aClean === schoolClean ||
      (aClean && schoolClean && (aClean.includes(schoolClean) || schoolClean.includes(aClean)));
    return (
      isMatch &&
      (a.status === 'COMPLETED' ||
        (a.photos && a.photos.length > 0) ||
        (a.note && a.note.includes('แนะแนวแล้ว')))
    );
  });

  const hasFieldTrip = fieldTrips.some((ft) => {
    return ft.schools?.some((s) => {
      const sClean = cleanSchoolName(s.schoolName);
      return (
        s.schoolId === school.id ||
        sClean === schoolClean ||
        (sClean && schoolClean && (sClean.includes(schoolClean) || schoolClean.includes(sClean)))
      );
    });
  });

  if (hasCompletedAppt || hasFieldTrip || school.currentStatus === 'GUIDANCE_COMPLETED') {
    return 'GUIDANCE_COMPLETED';
  }

  // 2. Check if Scheduled / Appointed (upcoming active appointment)
  const hasActiveAppt = appointments.some((a) => {
    const aClean = cleanSchoolName(a.schoolName);
    const isMatch =
      a.schoolId === school.id ||
      aClean === schoolClean ||
      (aClean && schoolClean && (aClean.includes(schoolClean) || schoolClean.includes(aClean)));
    return isMatch && a.status !== 'CANCELLED';
  });

  if (hasActiveAppt || school.currentStatus === 'APPOINTED') {
    return 'APPOINTED';
  }

  // 3. Check if Document Submitted
  const matchedSubmissions = submissions.filter((sub) => {
    const subClean = cleanSchoolName(sub.schoolName);
    return (
      sub.schoolId === school.id ||
      subClean === schoolClean ||
      (subClean && schoolClean && (subClean.includes(schoolClean) || schoolClean.includes(subClean)))
    );
  });

  if (matchedSubmissions.length > 0) {
    const latest = matchedSubmissions[0];
    if (latest.status === 'WAITING_CONTACT' || latest.status === 'CALL_LATER') {
      return 'WAITING_CONTACT';
    }
    if (latest.status === 'WAITING_APPOINTMENT') {
      return 'WAITING_APPOINTMENT';
    }
    return 'DOCUMENT_SUBMITTED';
  }

  if (school.currentStatus === 'WAITING_CONTACT') return 'WAITING_CONTACT';
  if (school.currentStatus === 'WAITING_APPOINTMENT') return 'WAITING_APPOINTMENT';
  if (school.currentStatus === 'DOCUMENT_SUBMITTED') return 'DOCUMENT_SUBMITTED';
  if (school.currentStatus === 'CANCELLED') return 'CANCELLED';

  return 'NOT_STARTED';
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

