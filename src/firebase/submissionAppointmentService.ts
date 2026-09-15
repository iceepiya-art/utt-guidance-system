import { collection, doc, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import { checkAppointmentConflict } from './dbService';
import type { DocumentSubmission, UserProfile } from '../types';
export async function saveSubmissionAppointment(submission: Omit<DocumentSubmission, 'id'>, schedule: { date: string; startTime: string; endTime: string; note: string }, user: UserProfile) {
  if (!schedule.date || !schedule.startTime || !schedule.endTime || schedule.endTime <= schedule.startTime) throw new Error('กรุณาระบุวันนัดและเวลาสิ้นสุดให้หลังเวลาเริ่ม');
  const conflict = await checkAppointmentConflict(schedule.date, schedule.startTime, schedule.endTime, submission.teamId, user.id);
  if (conflict.hasConflict) throw new Error(conflict.reason || 'ช่วงเวลานี้มีนัดหมายแล้ว');
  const submissionRef = doc(collection(db, 'documentSubmissions'));
  const appointmentRef = doc(collection(db, 'appointments'));
  const batch = writeBatch(db);
  const now = new Date().toISOString();
  batch.set(submissionRef, { ...submission, status: 'APPOINTED', appointmentId: appointmentRef.id, appointmentDate: schedule.date, appointmentStartTime: schedule.startTime, appointmentEndTime: schedule.endTime, createdAt: now, updatedAt: now, createdBy: user.displayName });
  batch.set(appointmentRef, { ...schedule, schoolId: submission.schoolId, schoolName: submission.schoolName, teacherName: submission.teacherName, teacherPhone: submission.teacherPhone, teamId: submission.teamId, counselorId: user.id, counselorName: user.displayName, teamMemberNames: submission.submittedByNames?.join(', ') || submission.submittedByName, workType: 'แนะแนวการศึกษา', status: 'CONFIRMED', source: 'DOCUMENT_SUBMISSION', submissionId: submissionRef.id, reminders: [], createdAt: now, updatedAt: now, createdBy: user.displayName });
  batch.update(doc(db, 'schools', submission.schoolId), { currentStatus: 'APPOINTED', teacherName: submission.teacherName, teacherPhone: submission.teacherPhone, preferredContactTime: submission.preferredContactTime || '', updatedAt: now, updatedBy: user.displayName });
  batch.set(doc(collection(db, 'activityLogs')), { userId: user.id, userName: user.displayName, action: 'ยื่นหนังสือและนัดหมาย', entityType: 'document', entityId: submissionRef.id, details: `${submission.schoolName} ${schedule.date} ${schedule.startTime} - ${schedule.endTime}`, timestamp: now });
  await batch.commit();
}
