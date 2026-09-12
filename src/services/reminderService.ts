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
  const now = new Date();
  const sentLogs: NotificationLog[] = [];
  let processed = 0;

  for (const appt of appointments) {
    if (appt.status === 'CANCELLED' || appt.status === 'COMPLETED') continue;

    const [year, month, day] = appt.date.split('-').map(Number);
    const [hours, minutes] = appt.startTime.split(':').map(Number);
    const appointmentTime = new Date(year, month - 1, day, hours, minutes);

    const diffMinutes = Math.round((appointmentTime.getTime() - now.getTime()) / (1000 * 60));

    // Check each configured reminder
    const reminders = appt.reminders || [{ type: 'email', minutesBefore: 1440, enabled: true }];

    for (const rem of reminders) {
      if (!rem.enabled) continue;

      // If within reminder window (e.g. 1 day = 1440 min, trigger if between 0 and 1440 min)
      if (diffMinutes <= rem.minutesBefore && diffMinutes >= -60) {
        // Query notificationLogs to check if already sent to prevent duplicate emails
        const logsCol = collection(db, 'notificationLogs');
        const q = query(
          logsCol,
          where('appointmentId', '==', appt.id),
          where('reminderMinutes', '==', rem.minutesBefore)
        );

        const snap = await getDocs(q);
        if (snap.empty) {
          // Send reminder!
          const recipientEmail = 'guidance@utt.ac.th';
          const teamName = appt.teamId === 'team1' ? 'สายที่ 1' : 'สายที่ 2';
          const subject = `แจ้งเตือนนัดหมายแนะแนว - ${appt.schoolName}`;

          const newLog: Omit<NotificationLog, 'id'> = {
            appointmentId: appt.id,
            schoolName: appt.schoolName,
            recipientEmail,
            sentAt: new Date().toISOString(),
            status: 'SENT',
            reminderMinutes: rem.minutesBefore,
            subject,
          };

          const docRef = await addDoc(logsCol, newLog);
          sentLogs.push({ id: docRef.id, ...newLog });
          processed++;
        }
      }
    }
  }

  return { processed, sentLogs };
}

/**
 * Direct Manual / Test Notification Trigger
 */
export async function sendManualNotificationTest(
  appt: Appointment,
  recipientEmail: string = 'guidance@utt.ac.th'
): Promise<NotificationLog> {
  const teamName = appt.teamId === 'team1' ? 'สายที่ 1' : 'สายที่ 2';
  const subject = `[ทดสอบ] แจ้งเตือนนัดหมายแนะแนว - ${appt.schoolName}`;

  const logsCol = collection(db, 'notificationLogs');
  const newLog: Omit<NotificationLog, 'id'> = {
    appointmentId: appt.id,
    schoolName: appt.schoolName,
    recipientEmail,
    sentAt: new Date().toISOString(),
    status: 'SENT',
    reminderMinutes: 1440,
    subject,
  };

  const docRef = await addDoc(logsCol, newLog);
  return { id: docRef.id, ...newLog };
}
