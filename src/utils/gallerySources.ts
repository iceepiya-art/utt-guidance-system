import type { School, DocumentSubmission, Appointment, FieldTrip, PhotoItem, TeamId } from '../types';
import { getSchoolWorkflow, resolveSchoolRelation, formatSchoolDisplayName } from './schoolStatus';

export interface GallerySourcePhoto extends PhotoItem {
  sourceType: 'SUBMISSION' | 'GUIDANCE' | 'LEGACY_APPOINTMENT';
  sourceId: string;
  sourceTitle: string;
  sourceDate: string;
  teamId: TeamId;
  activityTitle: string;
  category: 'submission' | 'guidance' | 'legacy';
  schoolIds: string[];
}

/** Preserve source ownership even when two records contain the same photo URL. */
export function buildGallerySources(schools: School[], submissions: DocumentSubmission[], appointments: Appointment[], trips: FieldTrip[]): GallerySourcePhoto[] {
  const workflows = schools.map(school => ({school, workflow: getSchoolWorkflow(school, submissions, appointments, trips, schools)}));
  const list: GallerySourcePhoto[] = [];
  const add = (photos: PhotoItem[] | undefined, meta: Omit<GallerySourcePhoto, keyof PhotoItem> & {schoolIds: string[]}) => {
    const seen = new Set<string>();
    for (const photo of photos || []) {
      if (!photo.url || seen.has(photo.url)) continue;
      seen.add(photo.url);
      const explicit = photo.schoolId ? resolveSchoolRelation(photo.schoolId, schools)?.id : undefined;
      // A school-specific photo cannot be silently assigned to another member.
      const schoolIds = photo.schoolId ? (explicit && meta.schoolIds.includes(explicit) ? [explicit] : []) : meta.schoolIds;
      list.push({...photo, ...meta, schoolIds});
    }
  };
  for (const sub of submissions) add(sub.photos, {
    sourceType: 'SUBMISSION', sourceId: sub.id, sourceTitle: formatSchoolDisplayName(sub.schoolName) || 'ยื่นหนังสือ',
    sourceDate: sub.submissionDate, teamId: sub.teamId, activityTitle: `ยื่นหนังสือ (${sub.documentNumber || 'มีหลักฐาน'})`, category: 'submission',
    schoolIds: workflows.filter(w => w.workflow.schoolSubmissions.some(s => s.id === sub.id)).map(w => w.school.id),
  });
  for (const trip of trips) add(trip.photos, {
    sourceType: 'GUIDANCE', sourceId: trip.id, sourceTitle: trip.schools?.map(s => formatSchoolDisplayName(s.schoolName)).join(', ') || 'กิจกรรมแนะแนว',
    sourceDate: trip.date, teamId: trip.teamId, activityTitle: trip.workType || 'ออกแนะแนว', category: 'guidance',
    schoolIds: workflows.filter(w => w.workflow.schoolTrips.some(t => t.id === trip.id)).map(w => w.school.id),
  });
  for (const appointment of appointments) add(appointment.photos, {
    sourceType: 'LEGACY_APPOINTMENT', sourceId: appointment.id, sourceTitle: formatSchoolDisplayName(appointment.schoolName) || 'นัดหมายย้อนหลัง',
    sourceDate: appointment.date, teamId: appointment.teamId, activityTitle: 'รูปนัดหมายเดิม (ย้อนหลัง)', category: 'legacy',
    schoolIds: workflows.filter(w => w.workflow.schoolAppointments.some(a => a.id === appointment.id)).map(w => w.school.id),
  });
  return list.sort((a,b) => (b.sourceDate || '').localeCompare(a.sourceDate || ''));
}
