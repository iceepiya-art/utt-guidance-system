import type {School, DocumentSubmission, Appointment, FieldTrip} from '../types';
import {getSubmissionDisplayStatus} from './submissionUtils';
import {getSchoolWorkflow} from './schoolStatus';
import {reportPeople} from './monthlyReport';
import {hasActualGuidance} from './actualGuidance';
export type SchoolHistoryTarget = {sourceType:'SUBMISSION'|'APPOINTMENT'|'GUIDANCE';sourceId:string};
export type SchoolActivityHistoryItem = SchoolHistoryTarget & {key:string;date:string;activityLabel:string;responsiblePeople:ReturnType<typeof reportPeople>;vehicleName:string};
export const submissionPeople = (s:DocumentSubmission) => reportPeople(s.submittedByNames?.length ? s.submittedByNames : [s.submittedByName || '']);
export const activityPeople = (s:Appointment|FieldTrip) => reportPeople([s.counselorName || '',s.teamMemberNames || ''],s.counselorId);
export function getSchoolActivityHistory(school:School, schools:School[], submissions:DocumentSubmission[], appointments:Appointment[], trips:FieldTrip[]):SchoolActivityHistoryItem[] {
  const w=getSchoolWorkflow(school,submissions,appointments,trips,schools);
  return [
    ...w.schoolSubmissions.map(s=>({key:`SUBMISSION:${s.id}`,sourceType:'SUBMISSION' as const,sourceId:s.id,date:s.submissionDate || '',activityLabel:getSubmissionDisplayStatus(s).isOtherActivity ? (s.otherActivityDetails || s.activities?.join(', ') || 'กิจกรรมอื่นๆ') : 'ยื่นหนังสือแนะแนว',responsiblePeople:submissionPeople(s),vehicleName:s.vehicleName || ''})),
    ...w.schoolAppointments.map(a=>({key:`APPOINTMENT:${a.id}`,sourceType:'APPOINTMENT' as const,sourceId:a.id,date:a.date || '',activityLabel:hasActualGuidance(a,w.schoolTrips)?'นัดหมายแนะแนว (ออกแนะแนวแล้ว)':a.status==='COMPLETED'?'นัดหมายแนะแนว (สถานะเดิม: เสร็จแล้ว)':a.status==='CANCELLED'?'นัดหมายแนะแนว (ยกเลิก)':'นัดหมายแนะแนว',responsiblePeople:activityPeople(a),vehicleName:a.vehicleName || ''})),
    ...w.schoolTrips.map(t=>({key:`GUIDANCE:${t.id}`,sourceType:'GUIDANCE' as const,sourceId:t.id,date:t.date || '',activityLabel:'ออกแนะแนว',responsiblePeople:activityPeople(t),vehicleName:t.vehicleName || ''})),
  ].sort((a,b)=>b.date.localeCompare(a.date)||a.key.localeCompare(b.key));
}
