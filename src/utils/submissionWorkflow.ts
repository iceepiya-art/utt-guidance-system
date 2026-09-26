import type {Appointment, DocumentSubmission, FieldTrip} from '../types';
import {getSubmissionDisplayStatus} from './submissionUtils';
import {formatThaiShortDate} from './dateUtils';
import {formatAppointmentTime, ACTIVE_APPOINTMENT_STATUSES} from './appointmentUtils';

// Link each letter to its own workflow; school/date similarity is not a link.
export function getSubmissionWorkflow(sub: DocumentSubmission, appointments: Appointment[], results: FieldTrip[]) {
  const linked = appointments.filter(a => a.submissionId === sub.id || (!a.submissionId && sub.appointmentId === a.id));
  const ids = new Set(linked.map(a => a.id));
  const result = results.find(t => t.submissionId === sub.id || (!t.submissionId && (!!t.appointmentId ? ids.has(t.appointmentId) : sub.fieldTripId === t.id)));
  const completed = linked.find(a => a.status === 'COMPLETED');
  const appointment = [...linked].filter(a => ['PENDING','TENTATIVE','CONFIRMED','RESCHEDULED'].includes(a.status)).sort((a,b) => (b.date || '').localeCompare(a.date || '') || a.id.localeCompare(b.id))[0];
  const base = getSubmissionDisplayStatus(sub);
  if (base.isOtherActivity) return {display:base, result:undefined, appointment:undefined};
  if (result) return {display:base,result,appointment:completed};
  if (appointment || completed) return {display:base,result:undefined,appointment:appointment || completed};
  return {display:{...base,label:base.label === 'ยื่นแล้ว' ? 'ยื่นหนังสือแล้ว' : base.label},result:undefined,appointment:undefined};
}

export function getSubmissionWorkflowNote(sub: DocumentSubmission, appointments: Appointment[], results: FieldTrip[]): string {
  const base = getSubmissionDisplayStatus(sub);
  const note = sub.note?.trim() || '';
  if (base.isOtherActivity) return note || sub.otherActivityDetails || sub.activities?.join(', ') || '';
  const workflow = getSubmissionWorkflow(sub, appointments, results);
  if (workflow.result) return 'แนะแนวเรียบร้อยแล้ว';
  if (workflow.appointment && ACTIVE_APPOINTMENT_STATUSES.includes(workflow.appointment.status)) {
    const a = workflow.appointment;
    const schedule = `นัดหมายแล้ว ${formatThaiShortDate(a.date)} เวลา ${formatAppointmentTime(a.startTime, a.endTime)}`;
    return note && !['ยื่นหนังสือแนะแนว', 'ยื่นหนังสือ', 'รอนัดหมาย', 'รอติดต่อกลับ'].includes(note)
      ? `${schedule} · ${note}` : schedule;
  }
  if (note && !['ยื่นหนังสือแนะแนว', 'ยื่นหนังสือ', 'รอนัดหมาย'].includes(note)) return sub.note!;
  if (sub.status === 'CALL_LATER') return 'ขอให้ติดต่อภายหลัง';
  if (sub.status === 'NOT_READY') return 'โรงเรียนยังไม่พร้อม';
  return 'รอติดต่อกลับ';
}
