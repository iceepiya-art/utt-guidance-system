import type { School, DocumentSubmission, Appointment, FieldTrip } from '../types';
import { resolveSchoolRelation, getSchoolWorkflow, formatSchoolDisplayName } from './schoolStatus';
import { validReportDate } from './monthlyReport';
import { isValidTimeRange } from './appointmentUtils';

export type ReviewType = 'SCHOOL' | 'SUBMISSION' | 'APPOINTMENT' | 'GUIDANCE';
export interface DataReviewTarget { type: ReviewType; id: string }
export interface DataReviewItem extends DataReviewTarget {
  label: string; date: string; missing: string[]; links: string[];
}
export const reviewTypeLabel = (type: ReviewType) => ({ SCHOOL: 'โรงเรียน', SUBMISSION: 'ยื่นหนังสือ', APPOINTMENT: 'นัดหมาย', GUIDANCE: 'ออกแนะแนว' })[type];
const hasText = (v: unknown) => typeof v === 'string' && !!v.trim();
const hasEvidence = (v: unknown) => Array.isArray(v) && v.some(p => hasText(p?.url));

export function auditDataCompleteness(schools: School[], submissions: DocumentSubmission[], appointments: Appointment[], trips: FieldTrip[]) {
  const items: DataReviewItem[] = [];
  const submissionsById = new Map(submissions.map(s => [s.id, s]));
  const appointmentsById = new Map(appointments.map(a => [a.id, a]));
  const tripsById = new Map(trips.map(t => [t.id, t]));
  const add = (type: ReviewType, id: string, label: string, date: string, missing: string[], links: string[]) => {
    if (missing.length || links.length) items.push({ type, id, label: formatSchoolDisplayName(label) || 'ยังไม่ระบุโรงเรียน', date, missing, links });
  };
  const teamIssue = (team: string) => team !== 'team1' && team !== 'team2' ? ['สายการปฏิบัติงาน'] : [];
  schools.forEach(s => {
    const missing = teamIssue(s.teamId);
    for (const [value,label] of [[s.schoolName,'ชื่อโรงเรียน'],[s.teacherName,'ชื่อผู้ประสานงาน'],[s.teacherPhone,'เบอร์ผู้ประสานงาน'],[s.schoolPhone,'เบอร์โรงเรียน (ถ้ามี)'],[s.province,'จังหวัด'],[s.district,'อำเภอ']]) if (!hasText(value)) missing.push(label);
    const workflow = getSchoolWorkflow(s, submissions, appointments, trips, schools);
    const links = workflow.storedCompletionOnly ? ['สถานะเดิมระบุว่าแนะแนวแล้ว แต่ไม่พบรายการต้นทางที่เชื่อมโยง'] : [];
    add('SCHOOL', s.id, s.schoolName, '', missing, links);
  });
  submissions.forEach(s => {
    const missing = teamIssue(s.teamId), links: string[] = [];
    if (!validReportDate(s.submissionDate)) missing.push('วันที่ยื่นหนังสือ');
    if (!hasText(s.documentNumber)) missing.push('เลขที่หนังสือ');
    if (!(s.submittedByNames?.some(hasText) || hasText(s.submittedByName))) missing.push('ผู้ยื่น');
    if (!hasText(s.vehicleName)) missing.push('รถที่ใช้');
    if (!hasEvidence(s.photos)) missing.push('รูปหลักฐาน');
    const school = resolveSchoolRelation(s.schoolId, schools);
    if (!school) links.push('ยังยืนยันโรงเรียนไม่ได้ กรุณาเลือกโรงเรียนจากรายการ');
    if (s.appointmentId && !appointmentsById.has(s.appointmentId)) links.push('ไม่พบรายการนัดหมายที่อ้างอิง');
    if (s.fieldTripId && !tripsById.has(s.fieldTripId)) links.push('ไม่พบผลออกแนะแนวที่อ้างอิง');
    add('SUBMISSION', s.id, school?.schoolName || s.schoolName, s.submissionDate, missing, links);
  });
  appointments.forEach(a => {
    const missing = teamIssue(a.teamId), links: string[] = [];
    if (!validReportDate(a.date)) missing.push('วันที่นัดหมาย');
    if (!isValidTimeRange(a.startTime, a.endTime)) missing.push('เวลาเริ่ม/สิ้นสุดที่ถูกต้อง');
    if (!hasText(a.counselorName)) missing.push('ผู้รับผิดชอบ');
    if (!hasText(a.vehicleName)) missing.push('รถที่ใช้');
    const school = resolveSchoolRelation(a.schoolId, schools);
    const sub = a.submissionId ? submissionsById.get(a.submissionId) : undefined;
    const subSchool = sub && resolveSchoolRelation(sub.schoolId, schools);
    if (!school) links.push('ยังยืนยันโรงเรียนของนัดหมายไม่ได้');
    if (a.submissionId && !sub) links.push('ไม่พบรายการยื่นหนังสือที่อ้างอิง');
    if (school && subSchool && school.id !== subSchool.id) links.push('โรงเรียนไม่ตรงกับรายการยื่นหนังสือ');
    if (a.status === 'COMPLETED' && !trips.some(t => t.appointmentId === a.id || (!t.appointmentId && !!a.submissionId && t.submissionId === a.submissionId))) links.push('นัดหมายระบุว่าเสร็จแล้ว แต่ไม่มีผลออกแนะแนวที่เชื่อมโยง (ไม่สร้างผลย้อนหลังอัตโนมัติ)');
    add('APPOINTMENT', a.id, school?.schoolName || a.schoolName, a.date, missing, links);
  });
  trips.forEach(t => {
    const missing = teamIssue(t.teamId), links: string[] = [];
    if (!validReportDate(t.date)) missing.push('วันที่ดำเนินการจริง');
    if (!hasText(t.counselorName)) missing.push('ผู้รับผิดชอบ');
    if (!hasText(t.vehicleName)) missing.push('รถที่ใช้');
    if (!hasText(t.workType)) missing.push('กิจกรรมที่ปฏิบัติ');
    if (!hasEvidence(t.photos)) missing.push('รูปกิจกรรม');
    if (!t.schools?.length || t.schools.some(s => !resolveSchoolRelation(s.schoolId, schools))) links.push('ยังยืนยันโรงเรียนบางรายการไม่ได้ กรุณาเลือกโรงเรียนจากรายการ');
    if (t.appointmentId && !appointmentsById.has(t.appointmentId)) links.push('ไม่พบนัดหมายที่อ้างอิง');
    if (t.submissionId && !submissionsById.has(t.submissionId)) links.push('ไม่พบรายการยื่นหนังสือที่อ้างอิง');
    add('GUIDANCE', t.id, t.schools?.map(s => formatSchoolDisplayName(resolveSchoolRelation(s.schoolId, schools)?.schoolName || s.schoolName)).join(', ') || '', t.date, missing, links);
  });
  return items.sort((a,b) => Number(!!b.links.length)-Number(!!a.links.length) || a.label.localeCompare(b.label, 'th') || a.id.localeCompare(b.id));
}

// Keep the name/phone pair from the same verified historical source. Do not
// attach a different teacher's phone to an existing school contact.
export function getSchoolContactSuggestion(school: School, schools: School[], submissions: DocumentSubmission[]) {
  return [...submissions].filter(s => resolveSchoolRelation(s.schoolId, schools)?.id === school.id &&
    hasText(s.teacherName) && hasText(s.teacherPhone) && validReportDate(s.submissionDate) &&
    (!hasText(school.teacherName) || school.teacherName.trim() === s.teacherName.trim()))
    .sort((a,b) => b.submissionDate.localeCompare(a.submissionDate) || (b.submissionTime || '').localeCompare(a.submissionTime || '') || a.id.localeCompare(b.id))[0];
}
