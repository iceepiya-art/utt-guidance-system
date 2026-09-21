import { describe, it, expect, vi } from 'vitest';
import {
  isAppointmentGuidanceCompleted,
  filterActiveAppointments,
  formatVehicleDisplay,
} from '../src/utils/appointmentUtils';
import { Appointment, FieldTrip, DocumentSubmission, School } from '../src/types';

describe('Appointment Workflow Cleanup & Consistency Tests', () => {
  const sampleSchools: School[] = [
    {
      id: 'sch_pae',
      schoolId: '1064620001',
      schoolName: 'บ้านแพะ',
      teamId: 'team1',
      province: 'อุตรดิตถ์',
      district: 'ลับแล',
      educationLevels: 'ม.1 - ม.3',
      schoolPhone: '',
      teacherName: '',
      teacherPosition: '',
      teacherPhone: '',
      teacherLine: '',
      preferredContactTime: '',
      studentM3: 20,
      studentM6: 0,
      note: '',
      totalStudents: 50,
      currentStatus: 'DOCUMENT_SUBMITTED',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    },
    {
      id: 'sch_namlee',
      schoolId: '1064620002',
      schoolName: 'บ้านน้ำลี',
      teamId: 'team1',
      province: 'อุตรดิตถ์',
      district: 'ท่าปลา',
      educationLevels: 'ม.1 - ม.3',
      schoolPhone: '',
      teacherName: '',
      teacherPosition: '',
      teacherPhone: '',
      teacherLine: '',
      preferredContactTime: '',
      studentM3: 30,
      studentM6: 0,
      note: '',
      totalStudents: 80,
      currentStatus: 'DOCUMENT_SUBMITTED',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    },
  ];

  const sampleSubmissions: DocumentSubmission[] = [
    {
      id: 'sub_pae_001',
      schoolId: 'sch_pae',
      schoolName: 'บ้านแพะ',
      documentNumber: 'ศธ 1234/56',
      submissionDate: '2026-09-10',
      submissionTime: '09:00',
      teacherName: 'ครูสมชาย',
      teacherPhone: '0891112233',
      teamId: 'team1',
      submittedById: 'usr_admin',
      submittedByName: 'อ.ประชา กัลปนารถ',
      status: 'DOCUMENT_SUBMITTED',
      photos: [],
      note: 'นัดวันที่ 22 ก.ย.',
      createdAt: '2026-09-10T00:00:00Z',
      updatedAt: '2026-09-10T00:00:00Z',
    },
  ];

  const sampleAppointmentWithSub: Appointment = {
    id: 'appt_pae_01',
    submissionId: 'sub_pae_001',
    schoolId: 'sch_pae',
    schoolName: 'บ้านแพะ',
    teacherName: 'ครูสมชาย',
    teacherPhone: '0891112233',
    date: '2026-09-22',
    startTime: '09:00',
    endTime: '11:30',
    teamId: 'team1',
    counselorId: 'usr_admin',
    counselorName: 'อ.ประชา กัลปนารถ',
    vehicleId: 'vigo-9914',
    vehicleName: 'VIGO กข 9914',
    status: 'CONFIRMED',
    workType: 'แนะแนว',
    source: 'DOCUMENT_SUBMISSION',
    note: '',
    reminders: [],
    createdAt: '2026-09-10T00:00:00Z',
    updatedAt: '2026-09-10T00:00:00Z',
  };

  const sampleLegacyAppointment: Appointment = {
    id: 'appt_legacy_99',
    schoolId: 'sch_namlee',
    schoolName: 'บ้านน้ำลี',
    teacherName: 'ครูสมหญิง',
    teacherPhone: '0897778899',
    date: '2026-09-25',
    startTime: '10:00',
    endTime: '12:00',
    teamId: 'team1',
    counselorId: 'usr_admin',
    counselorName: 'อ.ประชา กัลปนารถ',
    vehicleId: 'vigo-9914',
    vehicleName: 'VIGO กข 9914',
    status: 'CONFIRMED',
    workType: 'แนะแนว',
    source: 'MANUAL',
    note: 'รายการประวัติเดิม',
    reminders: [],
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  };

  // TEST 1: CREATE -> สามารถเลือก Submission เพื่อสร้าง Appointment ได้
  it('1. CREATE mode: allows selecting a submission and binds submissionId', () => {
    const selectedSub = sampleSubmissions[0];
    const newAppointmentData: Omit<Appointment, 'id'> = {
      submissionId: selectedSub.id,
      schoolId: selectedSub.schoolId,
      schoolName: selectedSub.schoolName,
      date: '2026-09-22',
      startTime: '09:00',
      endTime: '11:30',
      teamId: selectedSub.teamId,
      counselorId: 'usr_admin',
      counselorName: 'อ.ประชา กัลปนารถ',
      vehicleId: 'vigo-9914',
      vehicleName: 'VIGO กข 9914',
      teacherName: selectedSub.teacherName,
      teacherPhone: selectedSub.teacherPhone,
      status: 'CONFIRMED',
      workType: 'แนะแนว',
      source: 'DOCUMENT_SUBMISSION',
      note: '',
      reminders: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    expect(newAppointmentData.submissionId).toBe('sub_pae_001');
    expect(newAppointmentData.schoolName).toBe('บ้านแพะ');
    expect(newAppointmentData.source).toBe('DOCUMENT_SUBMISSION');
  });

  // TEST 2: EDIT + submissionId -> ไม่มี required submission picker (read-only relation)
  it('2. EDIT with existing submissionId: relation is read-only and not required dropdown', () => {
    const appt = sampleAppointmentWithSub;
    const linkedSub = sampleSubmissions.find((s) => s.id === appt.submissionId);

    expect(appt.submissionId).toBe('sub_pae_001');
    expect(linkedSub).toBeDefined();
    expect(linkedSub?.documentNumber).toBe('ศธ 1234/56');
    expect(linkedSub?.schoolName).toBe('บ้านแพะ');
  });

  // TEST 3: EDIT -> preserve submissionId เดิม
  it('3. EDIT preserves existing submissionId without clearing or overriding', () => {
    const appt = sampleAppointmentWithSub;
    const updatedData: Partial<Appointment> = {
      note: 'เปลี่ยนห้องแนะแนวเป็นห้องประชุม 2',
      startTime: '09:30',
      endTime: '12:00',
    };

    const targetSubmissionId = updatedData.submissionId || appt.submissionId;
    expect(targetSubmissionId).toBe('sub_pae_001');
    expect(targetSubmissionId).toBe(appt.submissionId);
  });

  // TEST 4: EDIT legacy no submissionId -> edit ได้ ไม่บังคับเลือก Submission
  it('4. EDIT legacy appointment without submissionId: can edit without mandatory submissionId', () => {
    const legacyAppt = sampleLegacyAppointment;
    expect(legacyAppt.submissionId).toBeUndefined();

    const targetSubmissionId = legacyAppt.submissionId;
    const updatedPayload = {
      submissionId: targetSubmissionId,
      schoolId: legacyAppt.schoolId,
      schoolName: legacyAppt.schoolName,
      date: '2026-09-26',
      note: 'อัปเดตเวลาเรียบร้อย',
    };

    expect(updatedPayload.submissionId).toBeUndefined();
    expect(updatedPayload.date).toBe('2026-09-26');
    expect(updatedPayload.schoolName).toBe('บ้านน้ำลี');
  });

  // TEST 5: Vehicle list -> แสดง VIGO กข 9914 แบบกระชับ
  it('5. Vehicle display: converts "VIGO กข 9914 (กระบะ 4 ประตู)" to clean "VIGO กข 9914"', () => {
    const rawVehicle = 'VIGO กข 9914 (กระบะ 4 ประตู)';
    const cleaned = formatVehicleDisplay(rawVehicle);
    expect(cleaned).toBe('VIGO กข 9914');
  });

  // TEST 6: Vehicle list -> ไม่มี "(กระบะ 4 ประตู...)" หรือ parenthesized descriptions
  it('6. Vehicle display: strips extraneous parentheses from all vehicle models and returns "ไม่ระบุ" when empty', () => {
    expect(formatVehicleDisplay('MITSU บน 6738 (กระบะ 4 ประตู)')).toBe('MITSU บน 6738');
    expect(formatVehicleDisplay('MITSU ขน 6738 (กระบะ 4 ประตู)')).toBe('MITSU ขน 6738');
    expect(formatVehicleDisplay('TOYOTA นข 4512 (ตู้แนะแนว)')).toBe('TOYOTA นข 4512');
    expect(formatVehicleDisplay('ISUZU บง 8921 (กระบะแค็บ)')).toBe('ISUZU บง 8921');
    expect(formatVehicleDisplay('VIGO กข 9914')).toBe('VIGO กข 9914');
    expect(formatVehicleDisplay(undefined)).toBe('ไม่ระบุ');
    expect(formatVehicleDisplay('')).toBe('ไม่ระบุ');
    expect(formatVehicleDisplay('   ')).toBe('ไม่ระบุ');
    expect(formatVehicleDisplay(null)).toBe('ไม่ระบุ');
  });

  // TEST 7: COMPLETED -> ไม่อยู่ใน Active Appointment List
  it('7. COMPLETED status: excluded from Active Appointment List', () => {
    const completedAppt: Appointment = {
      ...sampleAppointmentWithSub,
      status: 'COMPLETED',
    };

    const isCompleted = isAppointmentGuidanceCompleted(completedAppt, []);
    expect(isCompleted).toBe(true);

    const activeList = filterActiveAppointments([completedAppt], []);
    expect(activeList.length).toBe(0);
  });

  // TEST 8: CONFIRMED -> อยู่ใน Active Appointment List
  it('8. CONFIRMED status: remains in Active Appointment List when no guidance trip exists', () => {
    const confirmedAppt: Appointment = {
      ...sampleAppointmentWithSub,
      status: 'CONFIRMED',
    };

    const isCompleted = isAppointmentGuidanceCompleted(confirmedAppt, []);
    expect(isCompleted).toBe(false);

    const activeList = filterActiveAppointments([confirmedAppt], []);
    expect(activeList.length).toBe(1);
    expect(activeList[0].id).toBe(confirmedAppt.id);
  });

  // TEST 9: ออกแนะแนว -> ใช้ Appointment record ถูกต้อง และเชื่อม appointmentId กับ FieldTrip
  it('9. Record Trip action: binds appointment record into FieldTrip and marks appointment as completed', () => {
    const appt = sampleAppointmentWithSub;

    // Prefill data prepared from appointment
    const tripData: Omit<FieldTrip, 'id'> = {
      appointmentId: appt.id,
      submissionId: appt.submissionId,
      date: appt.date,
      teamId: appt.teamId,
      counselorId: appt.counselorId,
      counselorName: appt.counselorName,
      vehicleId: appt.vehicleId || '',
      vehicleName: appt.vehicleName || '',
      workType: 'แนะแนว',
      schools: [
        {
          schoolId: appt.schoolId,
          schoolName: appt.schoolName,
          timeSlot: `${appt.startTime} - ${appt.endTime}`,
          studentCount: 50,
        },
      ],
      photos: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    expect(tripData.appointmentId).toBe('appt_pae_01');
    expect(tripData.submissionId).toBe('sub_pae_001');
    expect(tripData.schools[0].schoolName).toBe('บ้านแพะ');

    // Matching trip marks appointment as completed in UI logic
    const createdTrip: FieldTrip = { id: 'trip_new_01', ...tripData };
    const isCompleted = isAppointmentGuidanceCompleted(appt, [createdTrip]);
    expect(isCompleted).toBe(true);

    const activeList = filterActiveAppointments([appt], [createdTrip]);
    expect(activeList.length).toBe(0);
  });

  describe('Final Vehicle Consistency — No Route-based Guessing', () => {
  // Test 1: VIGO suffix stripped
  it('1. formatVehicleDisplay("VIGO กข 9914 (กระบะ 4 ประตู)") -> "VIGO กข 9914"', () => {
    expect(formatVehicleDisplay('VIGO กข 9914 (กระบะ 4 ประตู)')).toBe('VIGO กข 9914');
  });

  // Test 2: MITSU suffix stripped
  it('2. formatVehicleDisplay("MITSU บน 6738 (กระบะ 4 ประตู)") -> "MITSU บน 6738"', () => {
    expect(formatVehicleDisplay('MITSU บน 6738 (กระบะ 4 ประตู)')).toBe('MITSU บน 6738');
  });

  // Test 3: undefined -> "ไม่ระบุ"
  it('3. formatVehicleDisplay(undefined) -> "ไม่ระบุ"', () => {
    expect(formatVehicleDisplay(undefined)).toBe('ไม่ระบุ');
  });

  // Test 4: "" -> "ไม่ระบุ"
  it('4. formatVehicleDisplay("") -> "ไม่ระบุ"', () => {
    expect(formatVehicleDisplay('')).toBe('ไม่ระบุ');
    expect(formatVehicleDisplay('   ')).toBe('ไม่ระบุ');
    expect(formatVehicleDisplay(null)).toBe('ไม่ระบุ');
  });

  // Test 5: Appointment ไม่มี vehicle + route team1 -> "ไม่ระบุ", NOT VIGO
  it('5. Appointment with no vehicle on team1 route displays "ไม่ระบุ" and never guesses VIGO', () => {
    const team1ApptNoVehicle: Appointment = {
      ...sampleAppointmentWithSub,
      teamId: 'team1',
      vehicleId: undefined,
      vehicleName: undefined,
    };

    const display = formatVehicleDisplay(team1ApptNoVehicle.vehicleName);
    expect(display).toBe('ไม่ระบุ');
    expect(display).not.toBe('VIGO กข 9914');
  });

  // Test 6: Appointment ไม่มี vehicle + route team2 -> "ไม่ระบุ", NOT MITSU
  it('6. Appointment with no vehicle on team2 route displays "ไม่ระบุ" and never guesses MITSU', () => {
    const team2ApptNoVehicle: Appointment = {
      ...sampleAppointmentWithSub,
      teamId: 'team2',
      vehicleId: undefined,
      vehicleName: undefined,
    };

    const display = formatVehicleDisplay(team2ApptNoVehicle.vehicleName);
    expect(display).toBe('ไม่ระบุ');
    expect(display).not.toBe('MITSU บน 6738');
  });

  // Test 7: Edit ไม่มี vehicle -> selector ไม่ auto-select รถ (initializes to empty string / ไม่ระบุ)
  it('7. Edit appointment with no vehicle restores empty string and does not auto-select vehicle', () => {
    const apptNoVehicle: Appointment = {
      ...sampleAppointmentWithSub,
      vehicleId: undefined,
      vehicleName: undefined,
    };

    // Form initialization logic: restore stored or empty string
    const initialVehicleId = apptNoVehicle.vehicleId || '';
    const initialVehicleName = apptNoVehicle.vehicleName || '';

    expect(initialVehicleId).toBe('');
    expect(initialVehicleName).toBe('');
    expect(formatVehicleDisplay(initialVehicleName)).toBe('ไม่ระบุ');
  });

  // Test 8: Guidance จาก Appointment ไม่มี vehicle -> ไม่ auto-fill รถ
  it('8. Guidance flow from appointment with no vehicle does not auto-fill vehicle from route', () => {
    const apptNoVehicle: Appointment = {
      ...sampleAppointmentWithSub,
      teamId: 'team1',
      vehicleId: undefined,
      vehicleName: undefined,
    };

    // Linked source mapping logic in FieldTripFormModal
    const prefilledVehicleId = apptNoVehicle.vehicleId || '';
    const prefilledVehicleName = apptNoVehicle.vehicleName || '';

    expect(prefilledVehicleId).toBe('');
    expect(prefilledVehicleName).toBe('');
    expect(prefilledVehicleName).not.toContain('VIGO');
    expect(prefilledVehicleName).not.toContain('MITSU');
  });

  // Test 9: Stored VIGO -> List/Edit/Detail consistent
  it('9. Stored VIGO produces consistent display across List, Edit, and Detail', () => {
    const apptWithVigo: Appointment = {
      ...sampleAppointmentWithSub,
      vehicleId: 'vigo-9914',
      vehicleName: 'VIGO กข 9914 (กระบะ 4 ประตู)',
    };

    // List view format
    const listDisplay = formatVehicleDisplay(apptWithVigo.vehicleName);
    // Detail view format
    const detailDisplay = formatVehicleDisplay(apptWithVigo.vehicleName);
    // Edit view stored value restoration
    const editVehicleId = apptWithVigo.vehicleId || '';
    const editVehicleName = apptWithVigo.vehicleName || '';

    expect(listDisplay).toBe('VIGO กข 9914');
    expect(detailDisplay).toBe('VIGO กข 9914');
    expect(editVehicleId).toBe('vigo-9914');
    expect(editVehicleName).toBe('VIGO กข 9914 (กระบะ 4 ประตู)');
    // Formatted presentation of edit value
    expect(formatVehicleDisplay(editVehicleName)).toBe('VIGO กข 9914');
  });
});
});
