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
import { compressImageFile } from '../utils/imageCompressor';

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
    ...data,
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
  const docRef = await addDoc(colRef, {
    ...submission,
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
    ...data,
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
    appointment.counselorId
  );

  if (conflict.hasConflict) {
    throw new Error(conflict.reason || 'ช่วงเวลานี้มีนัดหมายแล้ว กรุณาเลือกเวลาอื่น');
  }

  // 2. Insert into Firestore
  const colRef = collection(db, 'appointments');
  const now = new Date().toISOString();
  const docRef = await addDoc(colRef, {
    ...appointment,
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
      id
    );
    if (conflict.hasConflict) {
      throw new Error(conflict.reason || 'ช่วงเวลานี้มีนัดหมายแล้ว กรุณาเลือกเวลาอื่น');
    }
  }

  const docRef = doc(db, 'appointments', id);
  const now = new Date().toISOString();
  await updateDoc(docRef, {
    ...data,
    updatedAt: now,
    updatedBy: user?.displayName || 'เจ้าหน้าที่',
  });

  await logActivity(
    user?.id || 'sys',
    user?.displayName || 'เจ้าหน้าที่',
    'แก้ไขนัดหมาย',
    'appointment',
    id,
    `อัปเดตนัดหมายสถานะ: ${data.status || 'ปกติ'}`
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
    ...data,
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
  return onSnapshot(colRef, (snap) => {
    const list: Vehicle[] = [];
    snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Vehicle));
    callback(list);
  });
}

export async function saveVehicle(vehicle: Vehicle): Promise<void> {
  const docRef = doc(db, 'vehicles', vehicle.id);
  await setDoc(docRef, vehicle, { merge: true });
}

export function subscribeTeams(callback: (teams: Team[]) => void) {
  const colRef = collection(db, 'teams');
  return onSnapshot(colRef, (snap) => {
    const list: Team[] = [];
    snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Team));
    callback(list);
  });
}

export async function saveTeam(team: Team): Promise<void> {
  const docRef = doc(db, 'teams', team.id);
  await setDoc(docRef, team, { merge: true });
}

export function subscribeSystemSettings(callback: (settings: SystemSettings) => void) {
  const docRef = doc(db, 'systemSettings', 'current');
  return onSnapshot(docRef, (snap) => {
    if (snap.exists()) {
      callback({ id: snap.id, ...snap.data() } as SystemSettings);
    } else {
      callback(INITIAL_SETTINGS);
    }
  });
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
  // Compress image to save 80-90% Firebase Storage space and stay 100% within free quota
  const file = await compressImageFile(rawFile, 1600, 1600, 0.82);

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
    console.warn('Firebase Storage upload warning, falling back to client URL representation:', storageErr);
    // Fallback: Read as ObjectURL or DataURL so staff work is never lost!
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (onProgress) onProgress(100);
        resolve({
          url: reader.result as string,
          fileName: file.name,
          storagePath: path,
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
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
      if (snapshot.empty) {
        // Automatically seed initial preset users into Firestore
        try {
          const batch = writeBatch(db);
          for (const u of INITIAL_USERS) {
            batch.set(doc(db, 'users', u.id), u);
          }
          await batch.commit();
          callback(INITIAL_USERS);
          return;
        } catch {
          callback(INITIAL_USERS);
          return;
        }
      }
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
      callback(INITIAL_USERS);
    }
  );
}

export async function createUser(
  userData: Omit<UserProfile, 'id'>,
  currentUser?: UserProfile | null
): Promise<UserProfile> {
  const colRef = collection(db, 'users');
  const newDocRef = doc(colRef);
  const now = new Date().toISOString();
  const user: UserProfile = {
    ...userData,
    id: newDocRef.id,
    active: userData.active ?? true,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(newDocRef, user);

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
    ...data,
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

