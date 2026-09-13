import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { Appointment, NotificationLog } from '../types';
import { formatThaiFullDate } from '../utils/dateUtils';

export interface EmailReminderPayload {
  to: string;
  subject: string;
  schoolName: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  teacherName: string;
  teacherPhone: string;
  teamName: string;
  counselorName: string;
  note?: string;
  appointmentId: string;
  minutesBefore: number;
}

/**
 * Builds the formal Thai email template matching requirements
 */
export function buildReminderEmailBody(payload: EmailReminderPayload): string {
  return `
เรียน อาจารย์ผู้รับผิดชอบและทีมงานแนะแนว

ระบบบริหารงานแนะแนวการศึกษา วิทยาลัยเทคโนโลยีอุตรดิตถ์ ขอแจ้งเตือนกำหนดการนัดหมาย:

========================================
แจ้งเตือนนัดหมายแนะแนวการศึกษา
========================================
โรงเรียน: ${payload.schoolName}
วันที่: ${formatThaiFullDate(payload.appointmentDate)}
เวลา: ${payload.startTime} - ${payload.endTime} น.
สายการปฏิบัติงาน: ${payload.teamName}
อาจารย์ผู้รับผิดชอบ: ${payload.counselorName}

ข้อมูลผู้ประสานงานโรงเรียน:
ครูแนะแนว: ${payload.teacherName}
เบอร์โทรศัพท์: ${payload.teacherPhone || 'ไม่ได้ระบุ'}
${payload.note ? `หมายเหตุเพิ่มเติม: ${payload.note}\n` : ''}
========================================
กรุณาเตรียมสื่อประชาสัมพันธ์ แผ่นพับ ใบสมัคร และตรวจสอบความพร้อมของยานพาหนะก่อนออกเดินทาง 30 นาที

งานแนะแนวและรับสมัครนักศึกษา
วิทยาลัยเทคโนโลยีอุตรดิตถ์ (Uttaradit Technological College)
โทร: 055-411-000
`.trim();
}

/**
 * Checks for upcoming appointments that need reminders
 * and logs the delivery to prevent duplicate emails.
 */
export async function processPendingReminders(appointments: Appointment[]): Promise<{
  processed: number;
  sentLogs: NotificationLog[];
}> {
  throw new Error('ยังไม่ได้เชื่อมต่อบริการส่งอีเมลฝั่งเซิร์ฟเวอร์');
}

/**
 * Direct Manual / Test Notification Trigger
 */
export async function sendManualNotificationTest(
  appt: Appointment,
  recipientEmail: string = 'guidance@utt.ac.th'
): Promise<NotificationLog> {
  throw new Error('ยังไม่ได้เชื่อมต่อบริการส่งอีเมลฝั่งเซิร์ฟเวอร์');
}
