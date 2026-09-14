import { collection, doc, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import type { DocumentSubmission, FieldTrip, UserProfile } from '../types';
export async function saveSubmissionWithGuidance(submission: Omit<DocumentSubmission, 'id'>, trip: Omit<FieldTrip, 'id'>, user: UserProfile) {
  if (!trip.schools.some(s => s.schoolId === submission.schoolId)) throw new Error('กรุณาระบุโรงเรียนที่ยื่นหนังสือในรายการแนะแนว');
  if (trip.date !== submission.submissionDate) throw new Error('การยื่นหนังสือพร้อมแนะแนวต้องเป็นวันเดียวกัน');
  const submissionRef = doc(collection(db, 'documentSubmissions'));
  const tripRef = doc(collection(db, 'fieldTrips'));
  const batch = writeBatch(db);
  const now = new Date().toISOString();
  batch.set(submissionRef, { ...submission, sameDayGuidance: true, fieldTripId: tripRef.id, createdAt: now, updatedAt: now, createdBy: user.displayName });
  batch.set(tripRef, { ...trip, submissionId: submissionRef.id, createdAt: now, updatedAt: now, createdBy: user.displayName });
  for (const school of trip.schools) {
    if (!school.schoolId) throw new Error('กรุณาเลือกโรงเรียนให้ครบ');
    const contact = school.schoolId === submission.schoolId ? {
      teacherName: submission.teacherName, teacherPhone: submission.teacherPhone,
      preferredContactTime: submission.preferredContactTime || '',
    } : {};
    batch.update(doc(db, 'schools', school.schoolId), { ...contact, currentStatus: 'GUIDANCE_COMPLETED', updatedAt: now, updatedBy: user.displayName });
  }
  batch.set(doc(collection(db, 'activityLogs')), { userId: user.id, userName: user.displayName, action: 'ยื่นหนังสือ + แนะแนว', entityType: 'document', entityId: submissionRef.id, details: submission.schoolName, timestamp: now });
  await batch.commit();
}
