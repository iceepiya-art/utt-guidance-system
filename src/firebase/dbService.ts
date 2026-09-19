import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  writeBatch,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';
import {
  School,
  DocumentSubmission,
  Appointment,
  FieldTrip,
  Vehicle,
  Team,
  SystemSettings,
  ActivityLog,
  NotificationLog,
  UserProfile,
  ApprovalStatus,
} from '../types';
import {
  INITIAL_SCHOOLS,
  INITIAL_TEAMS,
  INITIAL_VEHICLES,
  INITIAL_SETTINGS,
  INITIAL_APPOINTMENTS,
  INITIAL_FIELD_TRIPS,
  INITIAL_SUBMISSIONS,
  INITIAL_USERS,
} from './seedData';
import { isTimeOverlapping } from '../utils/dateUtils';
import { compressImageFile, fileToDataUrl } from '../utils/imageCompressor';

// Helper to log activities
export async function logActivity(
  userId: string,
  userName: string,
  action: string,
  entityType: ActivityLog['entityType'],
  entityId: string,
  details?: string
) {
  try {
    const colRef = collection(db, 'activityLogs');
    await addDoc(colRef, {
      userId,
      userName,
      action,
      entityType,
      entityId,
      details: details || '',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Could not write to activityLogs:', err);
  }
}

// -------------------------------------------------------------
// Database Auto-Initialization / Seeding
// -------------------------------------------------------------
export async function ensureInitialDataSeeded(currentUser?: UserProfile | null) {
  if (currentUser?.role !== 'ADMIN') throw new Error('เฉพาะผู้ดูแลระบบเท่านั้น');
  try {
    const schoolsCol = collection(db, 'schools');
    const snap = await getDocs(query(schoolsCol));
    if (!snap.empty) {
      // Already seeded
      return;
    }

    console.log('Seeding initial data to Firestore...');
    const batch = writeBatch(db);

    // Seed Teams
    for (const team of INITIAL_TEAMS) {
      const tRef = doc(db, 'teams', team.id);
      batch.set(tRef, team);
    }

    // Seed Vehicles
    for (const vehicle of INITIAL_VEHICLES) {
      const vRef = doc(db, 'vehicles', vehicle.id);
      batch.set(vRef, vehicle);
    }

    // Seed Settings
    const sRef = doc(db, 'systemSettings', INITIAL_SETTINGS.id);
    batch.set(sRef, INITIAL_SETTINGS);

    // Seed Schools
    for (const school of INITIAL_SCHOOLS) {
      const schRef = doc(collection(db, 'schools'));
      batch.set(schRef, {
        ...school,
        id: schRef.id,
      });
    }

    await batch.commit();

    // Secondary seed for submissions & appointments
    for (const sub of INITIAL_SUBMISSIONS) {
      await addDoc(collection(db, 'documentSubmissions'), sub);
    }

    for (const appt of INITIAL_APPOINTMENTS) {
      await addDoc(collection(db, 'appointments'), appt);
    }

    for (const trip of INITIAL_FIELD_TRIPS) {
      await addDoc(collection(db, 'fieldTrips'), trip);
    }

    console.log('Initial data seeded successfully.');
  } catch (err: any) {
    if (err?.code === 'permission-denied' || err?.message?.includes('insufficient permissions')) {
      console.warn('Initial data seeding deferred: awaiting authenticated write session');
      return;
    }
    console.error('Error during initial data seeding:', err);
  }
}

export const seedInitialDataIfEmpty = ensureInitialDataSeeded;

// -------------------------------------------------------------
// Schools CRUD & Subscriptions
// -------------------------------------------------------------
export function subscribeSchools(callback: (schools: School[]) => void) {
  const colRef = collection(db, 'schools');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const schools: School[] = [];
      snapshot.forEach((docSnap) => {
        schools.push({ id: docSnap.id, ...docSnap.data() } as School);
      });
      schools.sort((a, b) => a.schoolName.localeCompare(b.schoolName, 'th'));
      callback(schools);
    },
    (err) => {
      console.warn('Real-time schools subscription waiting for authenticated session:', err?.message || err);
    }
  );
}

export async function addSchool(school: Omit<School, 'id'>, user?: UserProfile | null): Promise<string> {
  const colRef = collection(db, 'schools');
  const now = new Date().toISOString();
  const docRef = await addDoc(colRef, {
    ...school,
    createdAt: now,
    updatedAt: now,
    createdBy: user?.displayName || 'เจ้าหน้าที่',
  });

  await logActivity(
    user?.id || 'sys',
    user?.displayName || 'เจ้าหน้าที่',
    'เพิ่มโรงเรียนใหม่',
    'school',
    docRef.id,
    `เพิ่มข้อมูล ${school.schoolName}`
  );

  return docRef.id;
}

export async function updateSchool(
  id: string,
  data: Partial<School>,
  user?: UserProfile | null
): Promise<void> {
  const docRef = doc(db, 'schools', id);
  const now = new Date().toISOString();
  await updateDoc(docRef, {
    ...Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)),
    updatedAt: now,
    updatedBy: user?.displayName || 'เจ้าหน้าที่',
  });

  await logActivity(
    user?.id || 'sys',
    user?.displayName || 'เจ้าหน้าที่',
    'แก้ไขข้อมูลโรงเรียน',
    'school',
    id,
    `อัปเดตข้อมูล ${data.schoolName || id}`
  );
}

export async function deleteSchool(id: string, schoolName: string, user?: UserProfile | null): Promise<void> {
  await deleteDoc(doc(db, 'schools', id));
  await logActivity(
    user?.id || 'sys',
    user?.displayName || 'ผู้ดูแลระบบ',
    'ลบข้อมูลโรงเรียน',
    'school',
    id,
    `ลบโรงเรียน ${schoolName}`
  );
}

export async function batchImportSchools(
  schools: Omit<School, 'id'>[],
  user?: UserProfile | null
): Promise<{ count: number }> {
  if (!schools.length) return { count: 0 };
  const now = new Date().toISOString();
  const userName = user?.displayName || 'เจ้าหน้าที่';
  
  // Firestore writeBatch max is 500 ops per batch
  const batchSize = 400;
  let totalImported = 0;
  
  for (let i = 0; i < schools.length; i += batchSize) {
    const chunk = schools.slice(i, i + batchSize);
    const batch = writeBatch(db);
    
    for (const sch of chunk) {
      const schRef = doc(collection(db, 'schools'));
      batch.set(schRef, {
        ...sch,
        createdAt: now,
        updatedAt: now,
        createdBy: userName,
        currentStatus: sch.currentStatus || 'NOT_STARTED',
      });
    }
    
    await batch.commit();
    totalImported += chunk.length;
  }

  await logActivity(
    user?.id || 'sys',
    userName,
    'นำเข้าข้อมูลโรงเรียนจาก Excel',
    'school',
    'batch-import',
    `นำเข้าข้อมูลโรงเรียนสำเร็จ ${totalImported} รายการ`
  );

  return { count: totalImported };
}

// -------------------------------------------------------------
// Document Submissions CRUD
// -------------------------------------------------------------
export function subscribeDocumentSubmissions(callback: (submissions: DocumentSubmission[]) => void) {
  const colRef = collection(db, 'documentSubmissions');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: DocumentSubmission[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as DocumentSubmission);
      });
      list.sort((a, b) => (b.submissionDate + b.submissionTime).localeCompare(a.submissionDate + a.submissionTime));
      callback(list);
    },
    (err) => {
      console.warn('Real-time document submissions subscription waiting for session:', err?.message || err);
    }
  );
}

export async function createDocumentSubmission(
  submission: Omit<DocumentSubmission, 'id'>,
  user?: UserProfile | null
): Promise<string> {
  const colRef = collection(db, 'documentSubmissions');
  const now = new Date().toISOString();
  const cleanSubmission = Object.fromEntries(
    Object.entries(submission).filter(([, value]) => value !== undefined)
  );
  const docRef = await addDoc(colRef, {
    ...cleanSubmission,
    createdAt: now,
    updatedAt: now,
    createdBy: user?.displayName || submission.submittedByName,
  });

  // Automatically update the school's teacher contact information & status!
  // Prevents duplicate data entry as required by prompt
  if (submission.schoolId) {
    const schoolRef = doc(db, 'schools', submission.schoolId);
    const updatePayload: Partial<School> = {
      updatedAt: now,
      updatedBy: user?.displayName || submission.submittedByName,
    };

    if (submission.teacherName) updatePayload.teacherName = submission.teacherName;
    if (submission.teacherPosition) updatePayload.teacherPosition = submission.teacherPosition;
    if (submission.teacherPhone) updatePayload.teacherPhone = submission.teacherPhone;
    if (submission.teacherLine) updatePayload.teacherLine = submission.teacherLine;
    if (submission.preferredContactTime) updatePayload.preferredContactTime = submission.preferredContactTime;

    // Map status
    if (submission.status === 'APPOINTED') {
      updatePayload.currentStatus = 'APPOINTED';
    } else if (submission.status === 'WAITING_APPOINTMENT') {
      updatePayload.currentStatus = 'WAITING_APPOINTMENT';
    } else if (submission.status === 'WAITING_CONTACT' || submission.status === 'CALL_LATER') {
      updatePayload.currentStatus = 'WAITING_CONTACT';
    } else {
      updatePayload.currentStatus = 'DOCUMENT_SUBMITTED';
    }

    await updateDoc(schoolRef, updatePayload);
  }

  await logActivity(
    user?.id || 'sys',
    user?.displayName || submission.submittedByName,
    'บันทึกการยื่นหนังสือ',
    'document',
    docRef.id,
    `ยื่นหนังสือ ${submission.schoolName} (เลขที่: ${submission.documentNumber})`
  );

  return docRef.id;
}

export async function updateDocumentSubmission(
  id: string,
  data: Partial<DocumentSubmission>,
  user?: UserProfile | null
): Promise<void> {
  const docRef = doc(db, 'documentSubmissions', id);
  const now = new Date().toISOString();
  await updateDoc(docRef, {
    ...Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)),
    updatedAt: now,
    updatedBy: user?.displayName || 'เจ้าหน้าที่',
  });
}

// -------------------------------------------------------------
// Appointments & Real-Time Conflict Detection
// -------------------------------------------------------------
export function subscribeAppointments(callback: (appointments: Appointment[]) => void) {
  const colRef = collection(db, 'appointments');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: Appointment[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as Appointment);
      });
      list.sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
      callback(list);
    },
    (err) => {
      console.warn('Real-time appointments subscription waiting for session:', err?.message || err);
    }
  );
}

/**
 * Strict Server-Side / Firestore Conflict Checker
 * Queries Firestore directly for all active appointments on the given date
 * to guarantee no overlapping times for the same Team or Counselor.
 */
export async function checkAppointmentConflict(
  date: string,
  startTime: string,
  endTime: string,
  teamId: string,
  counselorId: string,
  vehicleId?: string,
  excludeAppointmentId?: string
): Promise<{ hasConflict: boolean; conflictingAppointment?: Appointment; reason?: string }> {
  const colRef = collection(db, 'appointments');
  const q = query(colRef, where('date', '==', date));
  const snap = await getDocs(q);

  for (const docSnap of snap.docs) {
    if (docSnap.id === excludeAppointmentId) continue;
    const appt = { id: docSnap.id, ...docSnap.data() } as Appointment;
    
    // Ignore cancelled appointments
    if (appt.status === 'CANCELLED') continue;

    // Check time overlap
    if (isTimeOverlapping(startTime, endTime, appt.startTime, appt.endTime)) {
      if (appt.teamId === teamId) {
        return {
          hasConflict: true,
          conflictingAppointment: appt,
          reason: `สายที่ ${teamId === 'team1' ? '1' : '2'} มีนัดหมายแล้วที่ "${appt.schoolName}" เวลา ${appt.startTime} - ${appt.endTime} น.`,
        };
      }
      if (counselorId && appt.counselorId === counselorId) {
        return {
          hasConflict: true,
          conflictingAppointment: appt,
          reason: `${appt.counselorName} ติดนัดหมายที่ "${appt.schoolName}" เวลา ${appt.startTime} - ${appt.endTime} น.`,
        };
      }
      if (vehicleId && vehicleId !== 'veh_personal' && appt.vehicleId === vehicleId) {
        return {
          hasConflict: true,
          conflictingAppointment: appt,
          reason: `ยานพาหนะ "${appt.vehicleName || vehicleId}" มีกำหนดใช้งานแล้วที่ "${appt.schoolName}" เวลา ${appt.startTime} - ${appt.endTime} น.`,
        };
      }
    }
  }

  return { hasConflict: false };
}

export async function createAppointment(
  appointment: Omit<Appointment, 'id'>,
  user?: UserProfile | null
): Promise<string> {
  // 1. Conflict Check
  const conflict = await checkAppointmentConflict(
    appointment.date,
    appointment.startTime,
    appointment.endTime,
    appointment.teamId,
    appointment.counselorId,
    appointment.vehicleId
  );

  if (conflict.hasConflict) {
    throw new Error(conflict.reason || 'ช่วงเวลานี้มีนัดหมายแล้ว กรุณาเลือกเวลาอื่น');
  }

  // 2. Insert into Firestore
  const colRef = collection(db, 'appointments');
  const now = new Date().toISOString();
  const docRef = await addDoc(colRef, {
    ...appointment,
    approvalStatus: appointment.approvalStatus || (user?.role === 'ADMIN' || user?.role === 'MANAGER' ? 'APPROVED' : 'PENDING_APPROVAL'),
    createdAt: now,
    updatedAt: now,
    createdBy: user?.displayName || 'เจ้าหน้าที่',
  });

  // 3. Automate School Status to APPOINTED
  if (appointment.schoolId) {
    const schoolRef = doc(db, 'schools', appointment.schoolId);
    await updateDoc(schoolRef, {
      currentStatus: 'APPOINTED',
      updatedAt: now,
      updatedBy: user?.displayName || 'เจ้าหน้าที่',
    });
  }

  if (appointment.submissionId) {
    try {
      await updateDoc(doc(db, 'documentSubmissions', appointment.submissionId), {
        status: 'APPOINTED',
        appointmentId: docRef.id,
        appointmentDate: appointment.date,
        appointmentStartTime: appointment.startTime,
        appointmentEndTime: appointment.endTime,
        appointmentNote: appointment.note || '',
        vehicleId: appointment.vehicleId || '',
        vehicleName: appointment.vehicleName || '',
        updatedAt: now,
        updatedBy: user?.displayName || 'เจ้าหน้าที่',
      });
    } catch (e) {
      console.warn('Could not link appointment to document submission for', appointment.submissionId, e);
    }
  }

  await logActivity(
    user?.id || 'sys',
    user?.displayName || 'เจ้าหน้าที่',
    'สร้างนัดหมายแนะแนว',
    'appointment',
    docRef.id,
    `นัดหมาย ${appointment.schoolName} วันที่ ${appointment.date} (${appointment.startTime} - ${appointment.endTime})`
  );

  return docRef.id;
}

export async function updateAppointment(
  id: string,
  data: Partial<Appointment>,
  user?: UserProfile | null
): Promise<void> {
  // If date/time/team is changed, perform conflict check
  if (data.date && data.startTime && data.endTime && data.teamId) {
    const conflict = await checkAppointmentConflict(
      data.date,
      data.startTime,
      data.endTime,
      data.teamId,
      data.counselorId || '',
      data.vehicleId,
      id
    );
    if (conflict.hasConflict) {
      throw new Error(conflict.reason || 'ช่วงเวลานี้มีนัดหมายแล้ว กรุณาเลือกเวลาอื่น');
    }
  }

  const docRef = doc(db, 'appointments', id);
  const now = new Date().toISOString();
  await updateDoc(docRef, {
    ...Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)),
    updatedAt: now,
    updatedBy: user?.displayName || 'เจ้าหน้าที่',
  });

  if (data.submissionId) {
    try {
      await updateDoc(doc(db, 'documentSubmissions', data.submissionId), {
        status: data.status === 'COMPLETED' ? 'GUIDANCE_COMPLETED' : 'APPOINTED',
        appointmentId: id,
        appointmentDate: data.date,
        appointmentStartTime: data.startTime,
        appointmentEndTime: data.endTime,
        appointmentNote: data.note || '',
        vehicleId: data.vehicleId || '',
        vehicleName: data.vehicleName || '',
        updatedAt: now,
        updatedBy: user?.displayName || 'เจ้าหน้าที่',
      });
    } catch (e) {
      console.warn('Could not update linked document submission for appointment', id, e);
    }
  }

  await logActivity(
    user?.id || 'sys',
    user?.displayName || 'เจ้าหน้าที่',
    'แก้ไขนัดหมาย',
    'appointment',
    id,
    `อัปเดตนัดหมายสถานะ: ${data.status || 'ปกติ'}`
  );
}

export async function updateAppointmentApproval(
  appointmentId: string,
  approvalStatus: ApprovalStatus,
  user: UserProfile | null,
  approvalNote?: string
): Promise<void> {
  const docRef = doc(db, 'appointments', appointmentId);
  const now = new Date().toISOString();
  await updateDoc(docRef, {
    approvalStatus,
    approvedBy: user?.id || 'sys',
    approvedByName: user?.displayName || 'ผู้บริหาร',
    approvedAt: now,
    approvalNote: approvalNote || '',
    updatedAt: now,
    updatedBy: user?.displayName || 'ผู้บริหาร',
  });

  const label = approvalStatus === 'APPROVED' ? 'อนุมัตินัดหมาย' : approvalStatus === 'REVISION_REQUESTED' ? 'ส่งกลับแก้ไขนัดหมาย' : 'ปรับสถานะการอนุมัติ';
  await logActivity(
    user?.id || 'sys',
    user?.displayName || 'ผู้บริหาร',
    label,
    'appointment',
    appointmentId,
    `ผลการพิจารณา: ${approvalStatus} ${approvalNote ? `(${approvalNote})` : ''}`
  );
}

export async function updateFieldTripApproval(
  tripId: string,
  approvalStatus: ApprovalStatus,
  user: UserProfile | null,
  approvalNote?: string
): Promise<void> {
  const docRef = doc(db, 'fieldTrips', tripId);
  const now = new Date().toISOString();
  await updateDoc(docRef, {
    approvalStatus,
    approvedBy: user?.id || 'sys',
    approvedByName: user?.displayName || 'ผู้บริหาร',
    approvedAt: now,
    approvalNote: approvalNote || '',
    updatedAt: now,
    updatedBy: user?.displayName || 'ผู้บริหาร',
  });

  const label = approvalStatus === 'APPROVED' ? 'อนุมัติการออกปฏิบัติงาน' : approvalStatus === 'REVISION_REQUESTED' ? 'ส่งกลับแก้ไขการออกปฏิบัติงาน' : 'ปรับสถานะการอนุมัติ';
  await logActivity(
    user?.id || 'sys',
    user?.displayName || 'ผู้บริหาร',
    label,
    'fieldTrip',
    tripId,
    `ผลการพิจารณา: ${approvalStatus} ${approvalNote ? `(${approvalNote})` : ''}`
  );
}

export async function deleteAppointment(id: string, schoolName: string, user?: UserProfile | null): Promise<void> {
  await deleteDoc(doc(db, 'appointments', id));
  await logActivity(
    user?.id || 'sys',
    user?.displayName || 'เจ้าหน้าที่',
    'ลบนัดหมาย',
    'appointment',
    id,
    `ลบนัดหมาย ${schoolName}`
  );
}

// -------------------------------------------------------------
// Field Trips / Guidance Field Work CRUD
// -------------------------------------------------------------
export function subscribeFieldTrips(callback: (trips: FieldTrip[]) => void) {
  const colRef = collection(db, 'fieldTrips');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: FieldTrip[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as FieldTrip);
      });
      list.sort((a, b) => b.date.localeCompare(a.date));
      callback(list);
    },
    (err) => {
      console.warn('Real-time field trips subscription waiting for session:', err?.message || err);
    }
  );
}

export async function createFieldTrip(
  trip: Omit<FieldTrip, 'id'>,
  user?: UserProfile | null
): Promise<string> {
  const colRef = collection(db, 'fieldTrips');
  const now = new Date().toISOString();
  const docRef = await addDoc(colRef, {
    ...trip,
    createdAt: now,
    updatedAt: now,
    createdBy: user?.displayName || trip.counselorName,
  });

  // Automatically update visited schools to GUIDANCE_COMPLETED if workType is guidance
  if (trip.workType.includes('แนะแนว') && trip.schools && trip.schools.length > 0) {
    for (const sch of trip.schools) {
      if (sch.schoolId) {
        try {
          const schRef = doc(db, 'schools', sch.schoolId);
          await updateDoc(schRef, {
            currentStatus: 'GUIDANCE_COMPLETED',
            updatedAt: now,
            updatedBy: user?.displayName || trip.counselorName,
          });
        } catch (e) {
          console.warn('Could not auto-update school status for', sch.schoolId, e);
        }
      }
    }
  }

  if (trip.appointmentId) {
    try {
      await updateDoc(doc(db, 'appointments', trip.appointmentId), {
        status: 'COMPLETED',
        updatedAt: now,
        updatedBy: user?.displayName || trip.counselorName,
      });
    } catch (e) {
      console.warn('Could not auto-update appointment status for', trip.appointmentId, e);
    }
  }

  if (trip.submissionId) {
    try {
      await updateDoc(doc(db, 'documentSubmissions', trip.submissionId), {
        status: 'GUIDANCE_COMPLETED',
        fieldTripId: docRef.id,
        updatedAt: now,
        updatedBy: user?.displayName || trip.counselorName,
      });
    } catch (e) {
      console.warn('Could not link document submission to field trip for', trip.submissionId, e);
    }
  }

  await logActivity(
    user?.id || 'sys',
    user?.displayName || trip.counselorName,
    'บันทึกการออกปฏิบัติงานแนะแนว',
    'fieldTrip',
    docRef.id,
    `ออกปฏิบัติงาน ${trip.workType} วันที่ ${trip.date} (${trip.schools.map((s) => s.schoolName).join(', ')})`
  );

  return docRef.id;
}

export async function updateFieldTrip(
  id: string,
  data: Partial<FieldTrip>,
  user?: UserProfile | null
): Promise<void> {
  const docRef = doc(db, 'fieldTrips', id);
  const now = new Date().toISOString();
  await updateDoc(docRef, {
    ...Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)),
    updatedAt: now,
    updatedBy: user?.displayName || 'เจ้าหน้าที่',
  });
}

export async function deleteFieldTrip(id: string, user?: UserProfile | null): Promise<void> {
  await deleteDoc(doc(db, 'fieldTrips', id));
  await logActivity(
    user?.id || 'sys',
    user?.displayName || 'ผู้ดูแลระบบ',
    'ลบการออกปฏิบัติงาน',
    'fieldTrip',
    id,
    'ลบรายการออกปฏิบัติงาน'
  );
}

// -------------------------------------------------------------
// Vehicles & Teams & Settings
// -------------------------------------------------------------
export function subscribeVehicles(callback: (vehicles: Vehicle[]) => void) {
  const colRef = collection(db, 'vehicles');
  return onSnapshot(
    colRef,
    (snap) => {
      const list: Vehicle[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Vehicle));
      callback(list.length > 0 ? list : INITIAL_VEHICLES);
    },
    (err) => {
      console.warn('Vehicles subscription notice:', err?.message || err);
      callback(INITIAL_VEHICLES);
    }
  );
}

export async function saveVehicle(vehicle: Vehicle): Promise<void> {
  const docRef = doc(db, 'vehicles', vehicle.id);
  await setDoc(docRef, vehicle, { merge: true });
}

export async function addVehicle(
  vehicle: Omit<Vehicle, 'id'>,
  user?: UserProfile | null
): Promise<string> {
  const colRef = collection(db, 'vehicles');
  const docRef = await addDoc(colRef, {
    ...vehicle,
    active: vehicle.active ?? true,
    status: vehicle.status || 'AVAILABLE',
  });

  await logActivity(
    user?.id || 'sys',
    user?.displayName || 'ผู้ดูแลระบบ',
    'เพิ่มยานพาหนะใหม่',
    'vehicle',
    docRef.id,
    `เพิ่มยานพาหนะ ${vehicle.vehicleName} (${vehicle.registrationNumber})`
  );
  return docRef.id;
}

export async function updateVehicle(
  id: string,
  data: Partial<Vehicle>,
  user?: UserProfile | null
): Promise<void> {
  const docRef = doc(db, 'vehicles', id);
  await updateDoc(docRef, data);

  await logActivity(
    user?.id || 'sys',
    user?.displayName || 'ผู้ดูแลระบบ',
    'แก้ไขข้อมูลยานพาหนะ',
    'vehicle',
    id,
    `อัปเดตข้อมูลยานพาหนะ ${data.vehicleName || id}`
  );
}

export async function deleteVehicle(
  id: string,
  vehicleName: string,
  user?: UserProfile | null
): Promise<void> {
  const docRef = doc(db, 'vehicles', id);
  await deleteDoc(docRef);

  await logActivity(
    user?.id || 'sys',
    user?.displayName || 'ผู้ดูแลระบบ',
    'ลบข้อมูลยานพาหนะ',
    'vehicle',
    id,
    `ลบยานพาหนะ ${vehicleName}`
  );
}

export function subscribeTeams(callback: (teams: Team[]) => void) {
  const colRef = collection(db, 'teams');
  return onSnapshot(
    colRef,
    (snap) => {
      const list: Team[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Team));
      callback(list.length > 0 ? list : INITIAL_TEAMS);
    },
    (err) => {
      console.warn('Teams subscription notice:', err?.message || err);
      callback(INITIAL_TEAMS);
    }
  );
}

export async function saveTeam(team: Team): Promise<void> {
  const docRef = doc(db, 'teams', team.id);
  await setDoc(docRef, team, { merge: true });
}

export function subscribeSystemSettings(callback: (settings: SystemSettings) => void) {
  const docRef = doc(db, 'systemSettings', 'current');
  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        callback({ id: snap.id, ...snap.data() } as SystemSettings);
      } else {
        callback(INITIAL_SETTINGS);
      }
    },
    (err) => {
      console.warn('System settings subscription notice:', err?.message || err);
      callback(INITIAL_SETTINGS);
    }
  );
}

export async function updateSystemSettings(settings: Partial<SystemSettings>): Promise<void> {
  const docRef = doc(db, 'systemSettings', 'current');
  await setDoc(docRef, settings, { merge: true });
}

// -------------------------------------------------------------
// Image Upload Service (Storage with resilient fallback)
// -------------------------------------------------------------
export async function uploadImageFile(
  rawFile: File,
  folder: 'document-submissions' | 'guidance-activities' | string = 'document-submissions',
  schoolId: string = 'general',
  onProgress?: (progress: number) => void
): Promise<{ url: string; fileName: string; storagePath: string }> {
  // Compress image to optimize responsiveness, save quota, and fit storage budgets
  const file = await compressImageFile(rawFile, 1280, 1280, 0.75);

  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${folder}/${new Date().getFullYear()}/${new Date().getMonth() + 1}/${schoolId}/${timestamp}_${safeName}`;

  try {
    const storageRef = ref(storage, path);
    // Simulate initial progress
    if (onProgress) onProgress(30);

    const snapshot = await uploadBytes(storageRef, file);
    if (onProgress) onProgress(80);

    const downloadUrl = await getDownloadURL(snapshot.ref);
    if (onProgress) onProgress(100);

    return {
      url: downloadUrl,
      fileName: file.name,
      storagePath: path,
    };
  } catch (storageErr) {
    console.warn(
      '[Storage Fallback] Firebase Storage is not available or not yet enabled in Firebase Console. Activating resilient inline fallback:',
      storageErr
    );

    try {
      if (onProgress) onProgress(70);
      const dataUrl = await fileToDataUrl(file);
      if (onProgress) onProgress(100);

      return {
        url: dataUrl,
        fileName: file.name,
        storagePath: `inline-fallback/${timestamp}_${safeName}`,
      };
    } catch (fallbackErr) {
      console.error('Image fallback conversion failed:', fallbackErr);
      throw new Error('ไม่สามารถประมวลผลรูปภาพได้ กรุณาตรวจสอบไฟล์รูปภาพแล้วลองใหม่อีกครั้ง');
    }
  }
}

// -------------------------------------------------------------
// Users Management & Subscriptions
// -------------------------------------------------------------
export function subscribeUsers(callback: (users: UserProfile[]) => void) {
  const colRef = collection(db, 'users');
  return onSnapshot(
    colRef,
    async (snapshot) => {
      const list: UserProfile[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as UserProfile);
      });
      // Sort users by role priority: ADMIN -> MANAGER -> STAFF -> VIEWER
      const roleWeight = { ADMIN: 1, MANAGER: 2, STAFF: 3, VIEWER: 4 };
      list.sort((a, b) => (roleWeight[a.role] || 5) - (roleWeight[b.role] || 5));
      callback(list);
    },
    (err) => {
      console.warn('Error listening to users collection, using fallback:', err);
      callback([]);
    }
  );
}

export async function createUser(
  userData: Omit<UserProfile, 'id'>,
  currentUser?: UserProfile | null,
  authUid?: string
): Promise<UserProfile> {
  const colRef = collection(db, 'users');
  if (!authUid || authUid.includes('/')) throw new Error('กรุณาระบุ Firebase Authentication UID ที่ถูกต้อง');
  const newDocRef = doc(colRef, authUid);
  if ((await getDoc(newDocRef)).exists()) throw new Error('UID นี้มีสิทธิ์ในระบบแล้ว');
  const now = new Date().toISOString();
  const user: UserProfile = {
    ...userData,
    id: newDocRef.id,
    active: userData.active ?? true,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(newDocRef, Object.fromEntries(Object.entries(user).filter(([, value]) => value !== undefined)));

  if (currentUser) {
    await logActivity(
      currentUser.id,
      currentUser.displayName,
      `เพิ่มผู้ใช้งานใหม่: ${user.displayName} (${user.role})`,
      'school', // entity category
      user.id,
      `อีเมล: ${user.email}, สิทธิ์: ${user.role}, สายงาน: ${user.teamId || 'ไม่ระบุ'}`
    );
  }

  return user;
}

export async function updateUser(
  userId: string,
  data: Partial<UserProfile>,
  currentUser?: UserProfile | null
): Promise<void> {
  const userRef = doc(db, 'users', userId);
  const now = new Date().toISOString();
  await updateDoc(userRef, {
    ...Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)),
    updatedAt: now,
  });

  if (currentUser) {
    await logActivity(
      currentUser.id,
      currentUser.displayName,
      `แก้ไขข้อมูลผู้ใช้งาน: ${data.displayName || userId}`,
      'school',
      userId,
      `อัปเดตสิทธิ์หรือข้อมูล: ${JSON.stringify(data)}`
    );
  }
}

export async function deleteUser(
  userId: string,
  userName: string,
  currentUser?: UserProfile | null
): Promise<void> {
  const userRef = doc(db, 'users', userId);
  await deleteDoc(userRef);

  if (currentUser) {
    await logActivity(
      currentUser.id,
      currentUser.displayName,
      `ลบผู้ใช้งาน: ${userName}`,
      'school',
      userId,
      `ลบบัญชีผู้ใช้งานออกจากระบบ`
    );
  }
}

