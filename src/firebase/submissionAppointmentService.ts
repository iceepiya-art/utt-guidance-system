import { collection, doc, getDoc, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import { checkAppointmentConflict } from './dbService';
import type { DocumentSubmission, UserProfile } from '../types';
export async function saveSubmissionAppointment(submission: Omit<DocumentSubmission, 'id'>, schedule: { date: string; startTime: string; endTime: string; note: string }, user: UserProfile, existingSubmission?: DocumentSubmission) {
  if (!schedule.date || !schedule.startTime || !schedule.endTime || schedule.endTime <= schedule.startTime) throw new Error('กรุณาระบุวันนัดและเวลาสิ้นสุดให้หลังเวลาเริ่ม');
  const previous = existingSubmission?.appointmentId ? (await getDoc(doc(db, 'appointments', existingSubmission.appointmentId))).data() : undefined;
  const conflict = await checkAppointmentConflict(
    schedule.date,
    schedule.startTime,
    schedule.endTime,
    submission.teamId,
    previous?.counselorId || user.id,
    previous?.vehicleId,
    existingSubmission?.appointmentId
  );
  if (conflict.hasConflict) throw new Error(conflict.reason || 'ช่วงเวลานี้มีนัดหมายแล้ว');
  const submissionRef = existingSubmission ? doc(db, 'documentSubmissions', existingSubmission.id) : doc(collection(db, 'documentSubmissions'));
  const appointmentRef = existingSubmission?.appointmentId ? doc(db, 'appointments', existingSubmission.appointmentId) : doc(collection(db, 'appointments'));
  const batch = writeBatch(db);
  const now = new Date().toISOString();
  batch.set(submissionRef, { ...submission, status: 'APPOINTED', appointmentId: appointmentRef.id, appointmentNote: schedule.note || previous?.note || '', appointmentDate: schedule.date, appointmentStartTime: schedule.startTime, appointmentEndTime: schedule.endTime, createdAt: existingSubmission?.createdAt || now, updatedAt: now, updatedBy: user.displayName, createdBy: existingSubmission?.createdBy || user.displayName }, { merge: true });
  batch.set(appointmentRef, { ...previous, ...schedule, note: schedule.note || previous?.note || '', schoolId: submission.schoolId, schoolName: submission.schoolName, teacherName: submission.teacherName, teacherPhone: submission.teacherPhone, teamId: submission.teamId, counselorId: previous?.counselorId || user.id, counselorName: previous?.counselorName || user.displayName, teamMemberNames: submission.submittedByNames?.join(', ') || submission.submittedByName, vehicleId: submission.vehicleId || previous?.vehicleId || '', vehicleName: submission.vehicleName || previous?.vehicleName || '', workType: 'แนะแนวการศึกษา', status: previous?.status === 'COMPLETED' ? 'COMPLETED' : 'CONFIRMED', source: 'DOCUMENT_SUBMISSION', submissionId: submissionRef.id, reminders: previous?.reminders || [], createdAt: previous?.createdAt || now, updatedAt: now, updatedBy: user.displayName, createdBy: previous?.createdBy || user.displayName }, { merge: true });
  batch.update(doc(db, 'schools', submission.schoolId), { currentStatus: 'APPOINTED', teacherName: submission.teacherName, teacherPhone: submission.teacherPhone, preferredContactTime: submission.preferredContactTime || '', updatedAt: now, updatedBy: user.displayName });
  batch.set(doc(collection(db, 'activityLogs')), { userId: user.id, userName: user.displayName, action: 'ยื่นหนังสือและนัดหมาย', entityType: 'document', entityId: submissionRef.id, details: `${submission.schoolName} ${schedule.date} ${schedule.startTime} - ${schedule.endTime}`, timestamp: now });
  await batch.commit();
}
