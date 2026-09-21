import { describe, it, expect, vi } from 'vitest';
import { isValidTimeRange, isTimeRangeValid, formatAppointmentTime } from '../src/utils/appointmentUtils';
import { createFieldTrip, updateFieldTrip } from '../src/firebase/dbService';
import { FieldTrip } from '../src/types';

// Mock firebase firestore methods
vi.mock('firebase/firestore', () => {
  return {
    collection: vi.fn(() => ({ id: 'mockCol' })),
    doc: vi.fn((_db, col, id) => ({ id: id || 'mockDoc', path: `${col}/${id || 'mockDoc'}` })),
    getDocs: vi.fn(async () => ({ empty: true, docs: [], forEach: vi.fn() })),
    getDoc: vi.fn(async () => ({ exists: () => false, data: () => ({}) })),
    setDoc: vi.fn(async () => {}),
    addDoc: vi.fn(async (_col, data) => ({ id: 'mock_trip_new_id', ...data })),
    updateDoc: vi.fn(async () => {}),
    deleteDoc: vi.fn(async () => {}),
    query: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    onSnapshot: vi.fn(),
    writeBatch: vi.fn(() => ({
      set: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      commit: vi.fn(async () => {}),
    })),
  };
});

// Mock firebase/storage and firebase
vi.mock('firebase/storage', () => ({
  ref: vi.fn(),
  uploadBytes: vi.fn(),
  getDownloadURL: vi.fn(),
}));

vi.mock('../src/firebase/firebase', () => ({
  db: {},
  storage: {},
  auth: {},
}));

describe('1. Appointment Time Validation (isValidTimeRange & isTimeRangeValid)', () => {
  it('09:00 - 12:00 is VALID', () => {
    expect(isValidTimeRange('09:00', '12:00')).toBe(true);
    expect(isTimeRangeValid('09:00', '12:00')).toBe(true);
  });

  it('13:00 - 16:00 is VALID', () => {
    expect(isValidTimeRange('13:00', '16:00')).toBe(true);
    expect(isTimeRangeValid('13:00', '16:00')).toBe(true);
  });

  it('13:00 - 12:00 is INVALID', () => {
    expect(isValidTimeRange('13:00', '12:00')).toBe(false);
    expect(isTimeRangeValid('13:00', '12:00')).toBe(false);
  });

  it('14:30 - 12:00 is INVALID', () => {
    expect(isValidTimeRange('14:30', '12:00')).toBe(false);
    expect(isTimeRangeValid('14:30', '12:00')).toBe(false);
  });

  it('12:00 - 12:00 is INVALID (equal times)', () => {
    expect(isValidTimeRange('12:00', '12:00')).toBe(false);
    expect(isTimeRangeValid('12:00', '12:00')).toBe(false);
  });

  it('Missing or empty time strings are INVALID', () => {
    expect(isValidTimeRange('', '12:00')).toBe(false);
    expect(isValidTimeRange('09:00', '')).toBe(false);
    expect(isValidTimeRange(null, '12:00')).toBe(false);
    expect(isValidTimeRange('09:00', null)).toBe(false);
    expect(isValidTimeRange(undefined, undefined)).toBe(false);
  });

  it('Unparseable times are INVALID', () => {
    expect(isValidTimeRange('abc', '12:00')).toBe(false);
    expect(isValidTimeRange('09:00', '25:00')).toBe(false);
    expect(isValidTimeRange('09:65', '12:00')).toBe(false);
  });
});

describe('2. Safe Appointment Time Display Formatting (formatAppointmentTime)', () => {
  it('Valid range renders "09:20 - 12:00 น."', () => {
    const result = formatAppointmentTime('09:20', '12:00');
    expect(result).toBe('09:20 - 12:00 น.');
  });

  it('Valid range without suffix renders "09:20 - 12:00"', () => {
    const result = formatAppointmentTime('09:20', '12:00', { suffix: false });
    expect(result).toBe('09:20 - 12:00');
  });

  it('Invalid legacy range (13:00 - 12:00) NEVER outputs "13:00 - 12:00", renders "13:00 น."', () => {
    const result = formatAppointmentTime('13:00', '12:00');
    expect(result).not.toContain('13:00 - 12:00');
    expect(result).not.toContain('12:00');
    expect(result).toBe('13:00 น.');
  });

  it('Invalid legacy range (14:30 - 12:00) renders "14:30 น."', () => {
    const result = formatAppointmentTime('14:30', '12:00');
    expect(result).not.toContain('14:30 - 12:00');
    expect(result).toBe('14:30 น.');
  });

  it('Invalid legacy range (16:05 - 12:00) renders "16:05 น."', () => {
    const result = formatAppointmentTime('16:05', '12:00');
    expect(result).not.toContain('16:05 - 12:00');
    expect(result).toBe('16:05 น.');
  });

  it('Invalid range with showNoteIfInvalid renders note', () => {
    const result = formatAppointmentTime('13:00', '12:00', { showNoteIfInvalid: true });
    expect(result).toBe('13:00 น. (ไม่ระบุเวลาสิ้นสุด)');
  });

  it('Single startTime provided renders "{startTime} น."', () => {
    expect(formatAppointmentTime('13:00', null)).toBe('13:00 น.');
    expect(formatAppointmentTime('13:00', '')).toBe('13:00 น.');
  });

  it('Neither provided renders "-"', () => {
    expect(formatAppointmentTime(null, null)).toBe('-');
    expect(formatAppointmentTime('', '')).toBe('-');
  });
});

describe('3. FieldTrip Payload Sanitization & Required Field Validation', () => {
  it('When submissionId and appointmentId are absent/undefined, they are OMITTED from Firestore payload', async () => {
    const { addDoc } = await import('firebase/firestore');
    vi.clearAllMocks();

    const tripData: Omit<FieldTrip, 'id'> = {
      date: '2026-09-22',
      teamId: 'team1',
      workType: 'แนะแนวการศึกษา',
      counselorId: 'usr_01',
      counselorName: 'อ.ประชา กัลปนารถ',
      vehicleId: 'veh_01',
      vehicleName: 'VIGO กข 9914',
      schools: [
        {
          schoolId: 'sch_01',
          schoolName: 'โรงเรียนบ้านด่าน',
          studentCount: 50,
        },
      ],
      photos: [],
      createdAt: '2026-09-22T08:00:00.000Z',
      updatedAt: '2026-09-22T08:00:00.000Z',
      submissionId: undefined,
      appointmentId: undefined,
    };

    await createFieldTrip(tripData);

    expect(addDoc).toHaveBeenCalled();
    const passedPayload = vi.mocked(addDoc).mock.calls[0][1] as Record<string, any>;

    // Must NOT contain keys with undefined value
    expect('submissionId' in passedPayload).toBe(false);
    expect('appointmentId' in passedPayload).toBe(false);
    expect(passedPayload.submissionId).toBeUndefined();
    expect(passedPayload.appointmentId).toBeUndefined();
    expect(passedPayload.date).toBe('2026-09-22');
    expect(passedPayload.counselorName).toBe('อ.ประชา กัลปนารถ');
  });

  it('When submissionId and appointmentId are present, they ARE included in Firestore payload', async () => {
    const { addDoc } = await import('firebase/firestore');
    vi.clearAllMocks();

    const tripData: Omit<FieldTrip, 'id'> = {
      date: '2026-09-22',
      teamId: 'team2',
      workType: 'แนะแนวการศึกษา',
      counselorId: 'usr_02',
      counselorName: 'อ.ปิยะ สีตาชัย',
      vehicleId: 'veh_02',
      vehicleName: 'MITSU บน 6738',
      submissionId: 'sub_test_123',
      appointmentId: 'appt_test_456',
      schools: [
        {
          schoolId: 'sch_02',
          schoolName: 'โรงเรียนเมืองเก่า',
          studentCount: 30,
        },
      ],
      photos: [],
      createdAt: '2026-09-22T08:00:00.000Z',
      updatedAt: '2026-09-22T08:00:00.000Z',
    };

    await createFieldTrip(tripData);

    expect(addDoc).toHaveBeenCalled();
    const passedPayload = vi.mocked(addDoc).mock.calls[0][1] as Record<string, any>;

    expect(passedPayload.submissionId).toBe('sub_test_123');
    expect(passedPayload.appointmentId).toBe('appt_test_456');
  });

  it('When a REQUIRED field is missing or undefined, createFieldTrip throws validation error (NO silent omit)', async () => {
    const invalidTrip: any = {
      date: undefined, // Missing required field
      teamId: 'team1',
      workType: 'แนะแนวการศึกษา',
      counselorName: 'อ.ประชา กัลปนารถ',
      schools: [{ schoolId: 'sch_01', schoolName: 'โรงเรียนทดสอบ' }],
    };

    await expect(createFieldTrip(invalidTrip)).rejects.toThrow('กรุณาระบุวันที่ออกแนะแนว');

    const invalidSchools: any = {
      date: '2026-09-22',
      teamId: 'team1',
      workType: 'แนะแนวการศึกษา',
      counselorName: 'อ.ประชา กัลปนารถ',
      schools: [], // Missing schools
    };

    await expect(createFieldTrip(invalidSchools)).rejects.toThrow('กรุณาระบุโรงเรียนอย่างน้อย 1 แห่ง');
  });

  it('updateFieldTrip does not save undefined relation keys to Firestore', async () => {
    const { updateDoc } = await import('firebase/firestore');
    vi.clearAllMocks();

    await updateFieldTrip('trip_999', {
      summary: 'เสร็จสิ้นเรียบร้อย',
      submissionId: undefined,
      appointmentId: undefined,
    });

    expect(updateDoc).toHaveBeenCalledTimes(1);
    const passedUpdate = vi.mocked(updateDoc).mock.calls[0][1] as Record<string, any>;

    expect('submissionId' in passedUpdate).toBe(false);
    expect('appointmentId' in passedUpdate).toBe(false);
    expect(passedUpdate.summary).toBe('เสร็จสิ้นเรียบร้อย');
  });
});
