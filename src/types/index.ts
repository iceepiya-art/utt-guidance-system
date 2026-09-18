export type UserRole = 'ADMIN' | 'MANAGER' | 'STAFF' | 'VIEWER';

export type TeamId = 'team1' | 'team2';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  teamId?: TeamId;
  phone?: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type SchoolStatus = 
  | 'NOT_STARTED'          // ยังไม่ดำเนินการ
  | 'DOCUMENT_SUBMITTED'    // ยื่นหนังสือแล้ว
  | 'WAITING_CONTACT'       // รอติดต่อกลับ
  | 'WAITING_APPOINTMENT'   // รอนัดหมาย
  | 'APPOINTED'             // นัดหมายแล้ว
  | 'GUIDANCE_COMPLETED'    // ออกแนะแนวแล้ว
  | 'CANCELLED';            // ยกเลิก

export interface School {
  id: string;
  schoolId: string; // เช่น SCH-001
  schoolName: string;
  region?: string;
  subdistrict?: string;
  schoolType?: string;
  areaName?: string;
  schoolSize?: string;
  totalStudents?: number;
  postalCode?: string;
  importSource?: string;
  educationLevels: string; // เช่น ม.1 - ม.3 หรือ ม.1 - ม.6
  studentM3: number;
  studentM6: number;
  schoolPhone: string;
  teacherName: string;
  teacherPosition: string;
  teacherPhone: string;
  teacherLine: string;
  preferredContactTime: string;
  district: string; // อำเภอ เช่น เมืองอุตรดิตถ์, ลับแล, พิชัย
  province: string; // จังหวัด เช่น อุตรดิตถ์
  teamId: TeamId;
  currentStatus: SchoolStatus;
  note: string;
  academicYear?: string; // เช่น 2569
  createdAt: string;
  createdBy?: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface PhotoItem {
  id: string;
  url: string;
  storagePath?: string;
  fileName: string;
  uploadedBy?: string;
  uploadedAt: string;
  schoolId?: string;
  activityType?: string;
}

export type PostSubmissionStatus = 
  | 'DOCUMENT_SUBMITTED'   // ยื่นหนังสือแล้ว
  | 'OTHER_ACTIVITY'       // กิจกรรมอื่นๆ
  | 'WAITING_CONTACT'      // รอติดต่อกลับ
  | 'CALL_LATER'           // ขอให้ติดต่อภายหลัง
  | 'WAITING_APPOINTMENT'  // รอนัดหมาย
  | 'APPOINTED'            // นัดหมายแล้ว
  | 'NOT_READY';           // โรงเรียนยังไม่พร้อม

export interface DocumentSubmission {
  vehicleId?: string;
  vehicleName?: string;
  appointmentId?: string;
  appointmentDate?: string;
  appointmentNote?: string;
  appointmentStartTime?: string;
  appointmentEndTime?: string;
  sameDayGuidance?: boolean;
  activities?: string[];
  otherActivityDetails?: string;
  fieldTripId?: string;
  id: string;
  schoolId: string;
  schoolName: string;
  documentNumber: string;
  submissionDate: string; // YYYY-MM-DD
  submissionTime: string; // HH:mm
  teamId: TeamId;
  submittedById: string;
  submittedByName: string;
  submittedByNames?: string[];
  teacherName: string;
  teacherPosition?: string;
  teacherPhone: string;
  teacherLine?: string;
  preferredContactTime?: string;
  status: PostSubmissionStatus;
  note: string;
  photos: PhotoItem[];
  academicYear?: string;
  createdAt: string;
  createdBy?: string;
  updatedAt: string;
  updatedBy?: string;
}

export type AppointmentStatus = 
  | 'PENDING'       // รอยืนยัน
  | 'TENTATIVE'     // รอยืนยัน
  | 'CONFIRMED'     // ยืนยันแล้ว
  | 'COMPLETED'     // เสร็จสิ้น / ออกแนะแนวแล้ว
  | 'RESCHEDULED'   // เลื่อนนัด
  | 'CANCELLED';    // ยกเลิก

export type ApprovalStatus =
  | 'DRAFT'               // ร่าง
  | 'PENDING_APPROVAL'   // ขออนุมัติ
  | 'APPROVED'           // อนุมัติแล้ว
  | 'REVISION_REQUESTED'; // ส่งกลับแก้ไข

export interface ReminderConfig {
  type: 'email' | 'system';
  minutesBefore: number; // e.g. 1440 (1 day), 60 (1 hour)
  enabled: boolean;
  sent?: boolean;
  sentAt?: string;
}

export interface Appointment {
  submissionId?: string;
  id: string;
  schoolId: string;
  schoolName: string;
  teacherName: string;
  teacherPhone: string;
  teacherLine?: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm เช่น 09:00
  endTime: string;   // HH:mm เช่น 10:30
  teamId: TeamId;
  counselorId: string;
  counselorName: string;
  teamMemberNames?: string;
  vehicleId?: string;
  vehicleName?: string;
  workType: string; // เช่น 'แนะแนว', 'ยื่นหนังสือ', 'ติดต่อโรงเรียน'
  status: AppointmentStatus;
  approvalStatus?: ApprovalStatus;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  approvalNote?: string;
  academicYear?: string;
  source: 'DOCUMENT_SUBMISSION' | 'MANUAL' | 'FOLLOW_UP';
  note: string;
  reminders: ReminderConfig[];
  createdAt: string;
  createdBy?: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface FieldTripSchool {
  schoolId: string;
  schoolName: string;
  timeSlot?: string;
  studentCount?: number;
  note?: string;
  notes?: string;
}

export interface FieldTrip {
  submissionId?: string;
  id: string;
  date: string; // YYYY-MM-DD
  departureTime?: string;
  returnTime?: string;
  teamId: TeamId;
  vehicleId: string;
  vehicleName: string; // เช่น MITSU ขน 6738
  workType: string; // เช่น ยื่นหนังสือ, แนะแนว
  counselorId: string;
  counselorName: string;
  teamMemberNames?: string;
  schools: FieldTripSchool[];
  photos: PhotoItem[];
  summary?: string;
  issues?: string;
  note?: string;
  approvalStatus?: ApprovalStatus;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  approvalNote?: string;
  academicYear?: string;
  budgetAllowance?: number; // เบี้ยเลี้ยง (บาท)
  budgetFuel?: number;      // ค่าน้ำมัน/พาหนะ (บาท)
  createdAt: string;
  createdBy?: string;
  updatedAt: string;
  updatedBy?: string;
}

export type VehicleStatus = 'AVAILABLE' | 'MAINTENANCE' | 'IN_USE';

export interface Vehicle {
  id: string;
  vehicleName: string;
  registrationNumber: string; // e.g. ขน 6738 อต
  vehicleType?: 'VAN' | 'PICKUP' | 'BUS' | 'SEDAN' | 'PERSONAL';
  capacity?: number;
  status?: VehicleStatus;
  active: boolean;
  notes?: string;
}

export interface Team {
  id: TeamId;
  teamName: string; // สายที่ 1, สายที่ 2
  color: string;
  lightColor: string;
  active: boolean;
  leaderName?: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  action: string; // เพิ่มโรงเรียน, ยื่นหนังสือ, สร้างนัดหมาย, etc.
  entityType: 'school' | 'document' | 'appointment' | 'fieldTrip' | 'photo' | 'user' | 'vehicle' | 'setting';
  entityId: string;
  details?: string;
  timestamp: string;
}

export interface NotificationLog {
  id: string;
  appointmentId: string;
  schoolName: string;
  recipientEmail: string;
  sentAt: string;
  status: 'SENT' | 'FAILED';
  reminderMinutes: number;
  subject: string;
}

export interface SystemSettings {
  id: string;
  collegeName: string;
  collegeNameEn: string;
  academicYear: string; // e.g. 2569
  defaultDurationMinutes: number; // e.g. 90
  defaultReminderMinutes: number; // e.g. 1440 (1 day before)
  guidanceSeasonStart?: string;
  guidanceSeasonEnd?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'APPOINTMENT_REMINDER' | 'APPROVAL_REQUEST' | 'FOLLOW_UP_DUE' | 'SYSTEM';
  timestamp: string;
  read: boolean;
  targetTab?: 'appointments' | 'calendar' | 'fieldTrips' | 'schools' | 'submissions';
  priority?: 'high' | 'normal';
}
