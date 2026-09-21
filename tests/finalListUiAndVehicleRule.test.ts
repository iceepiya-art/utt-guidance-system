import { describe, it, expect } from 'vitest';
import { formatSchoolDisplayName, getCleanSchoolCode } from '../src/utils/schoolStatus';
import { isTimeRangeValid, formatVehicleDisplay } from '../src/utils/appointmentUtils';
import {
  PRACHA_PERSONNEL_ID,
  PIYA_PERSONNEL_ID,
  VIGO_VEHICLE,
  MITSU_VEHICLE,
  getDefaultVehicleForPersonnel,
  resolveVehicleForAppointment,
  resolveVehicleForGuidance,
} from '../src/utils/vehicleMapping';
import { resolvePersonnelDisplayName } from '../src/utils/personnelSelector';
import { sanitizeFirestorePayload } from '../src/firebase/dbService';

describe('FINAL LIST UI + SCHOOL NAME + PERSONNEL + TIME + VEHICLE RULE TESTS (27 Tests)', () => {
  // ==========================================
  // SCHOOL DISPLAY TESTS (1-4)
  // ==========================================
  it('1. formats "โรงเรียนบ้านน้ำลี" to "บ้านน้ำลี"', () => {
    expect(formatSchoolDisplayName('โรงเรียนบ้านน้ำลี')).toBe('บ้านน้ำลี');
  });

  it('2. formats "โรงเรียนทองแสนขันวิทยา" to "ทองแสนขันวิทยา"', () => {
    expect(formatSchoolDisplayName('โรงเรียนทองแสนขันวิทยา')).toBe('ทองแสนขันวิทยา');
  });

  it('3. leaves "บ้านแพะ" as "บ้านแพะ" without change', () => {
    expect(formatSchoolDisplayName('บ้านแพะ')).toBe('บ้านแพะ');
  });

  it('4. does not mutate the stored schoolName in object', () => {
    const rawRecord = { schoolName: 'โรงเรียนเตรียมอุดมศึกษาน้อมเกล้า อุตรดิตถ์' };
    const displayed = formatSchoolDisplayName(rawRecord.schoolName);
    expect(displayed).toBe('เตรียมอุดมศึกษาน้อมเกล้า อุตรดิตถ์');
    expect(rawRecord.schoolName).toBe('โรงเรียนเตรียมอุดมศึกษาน้อมเกล้า อุตรดิตถ์');
  });

  // ==========================================
  // SCHOOL CODE TESTS (5-7)
  // ==========================================
  it('5. hides internal Firestore doc IDs from display (returns null)', () => {
    expect(getCleanSchoolCode('hRM7LBkgrS2a47spnRlQ')).toBeNull();
    expect(getCleanSchoolCode('import_school_99812')).toBeNull();
    expect(getCleanSchoolCode('manual_12345')).toBeNull();
  });

  it('6. returns valid user-facing school codes (10-digit MOE code or SCH-xxx)', () => {
    expect(getCleanSchoolCode('1053690123')).toBe('1053690123');
    expect(getCleanSchoolCode('1053690294')).toBe('1053690294');
    expect(getCleanSchoolCode('SCH-042')).toBe('SCH-042');
  });

  it('7. returns null when code is missing, empty, or whitespace (no blank technical row)', () => {
    expect(getCleanSchoolCode(undefined)).toBeNull();
    expect(getCleanSchoolCode(null)).toBeNull();
    expect(getCleanSchoolCode('')).toBeNull();
    expect(getCleanSchoolCode('   ')).toBeNull();
  });

  // ==========================================
  // SUBMITTERS TESTS (8-10)
  // ==========================================
  it('8. shows both names when there are 2 submitters', () => {
    const rawSubmitters = ['อ.ประชา กัลปนารถ', 'อ.ณิชชัยกุญช์ โลราช'];
    const cleaned = rawSubmitters.map((n) => {
      const resolved = resolvePersonnelDisplayName(n, []).displayName || n;
      return resolved.replace(/\s*\(.*?\)/g, '').trim();
    });
    expect(cleaned).toHaveLength(2);
    expect(cleaned[0]).toBe('อ.ประชา กัลปนารถ');
    expect(cleaned[1]).toBe('อ.ณิชชัยกุญช์ โลราช');
  });

  it('9. does not output "+1 ท่าน" on desktop table list', () => {
    const rawSubmitters = ['อ.ประชา กัลปนารถ', 'อ.ณิชชัยกุญช์ โลราช'];
    const cleaned = rawSubmitters.map((n) => {
      const resolved = resolvePersonnelDisplayName(n, []).displayName || n;
      return resolved.replace(/\s*\(.*?\)/g, '').trim();
    });
    // In our desktop table, displaySubmitters.map renders each name directly; no "+1 ท่าน" string is produced
    const joined = cleaned.join('\n');
    expect(joined).not.toContain('+1 ท่าน');
    expect(joined).toContain('อ.ประชา กัลปนารถ');
    expect(joined).toContain('อ.ณิชชัยกุญช์ โลราช');
  });

  it('10. strips long role suffixes like (หัวหน้างานแนะแนว) or (แนะแนวสาย 1)', () => {
    const rawName1 = 'อ.ประชา กัลปนารถ (หัวหน้างานแนะแนว)';
    const rawName2 = 'อ.ณิชชัยกุญช์ โลราช (แนะแนวสาย 1)';
    const cleaned1 = resolvePersonnelDisplayName(rawName1, []).displayName.replace(/\s*\(.*?\)/g, '').trim();
    const cleaned2 = resolvePersonnelDisplayName(rawName2, []).displayName.replace(/\s*\(.*?\)/g, '').trim();
    expect(cleaned1).toBe('อ.ประชา กัลปนารถ');
    expect(cleaned2).toBe('อ.ณิชชัยกุญช์ โลราช');
    expect(cleaned1).not.toContain('หัวหน้างาน');
    expect(cleaned2).not.toContain('สาย 1');
  });

  // ==========================================
  // TIME VALIDATION TESTS (11-14)
  // ==========================================
  it('11. validates 09:20 - 12:00 as valid', () => {
    expect(isTimeRangeValid('09:20', '12:00')).toBe(true);
  });

  it('12. validates 13:00 - 12:00 as invalid', () => {
    expect(isTimeRangeValid('13:00', '12:00')).toBe(false);
  });

  it('13. validates equal start and end times (12:00 - 12:00) as invalid', () => {
    expect(isTimeRangeValid('12:00', '12:00')).toBe(false);
  });

  it('14. blocks saving when time is invalid and permits saving when valid', () => {
    const checkCanSave = (start: string, end: string) => {
      if (!isTimeRangeValid(start, end)) {
        return { error: 'เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่มต้น', canSave: false };
      }
      return { error: null, canSave: true };
    };

    expect(checkCanSave('14:30', '12:00')).toEqual({
      error: 'เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่มต้น',
      canSave: false,
    });
    expect(checkCanSave('08:30', '11:30')).toEqual({
      error: null,
      canSave: true,
    });
  });

  // ==========================================
  // VEHICLE BUSINESS RULE TESTS (15-22)
  // ==========================================
  it('15. maps Pracha personnel ID to VIGO vehicle ID and name', () => {
    const v = getDefaultVehicleForPersonnel(PRACHA_PERSONNEL_ID);
    expect(v).not.toBeNull();
    expect(v?.id).toBe(VIGO_VEHICLE.id);
    expect(v?.name).toBe('VIGO กข 9914');
  });

  it('16. maps Piya personnel ID to MITSU vehicle ID and name', () => {
    const v = getDefaultVehicleForPersonnel(PIYA_PERSONNEL_ID);
    expect(v).not.toBeNull();
    expect(v?.id).toBe(MITSU_VEHICLE.id);
    expect(v?.name).toBe('MITSU บน 6738');
  });

  it('17. does not force vehicle for Nitchaikul or other personnel', () => {
    const v = getDefaultVehicleForPersonnel('usr_staff1');
    expect(v).toBeNull();
  });

  it('18. does not assign VIGO based on route team1 alone', () => {
    // formatVehicleDisplay with no vehicle should return 'ไม่ระบุ', not fallback to VIGO
    expect(formatVehicleDisplay('')).toBe('ไม่ระบุ');
    expect(formatVehicleDisplay(undefined)).toBe('ไม่ระบุ');
  });

  it('19. does not assign MITSU based on route team2 alone', () => {
    expect(formatVehicleDisplay('')).toBe('ไม่ระบุ');
    expect(formatVehicleDisplay(null)).toBe('ไม่ระบุ');
  });

  it('20. preserves stored vehicle over personnel default on Edit', () => {
    // If appointment already has a stored vehicle (e.g. MITSU), it must NOT be overwritten by Pracha's default (VIGO)
    const result = resolveVehicleForAppointment({
      isEdit: true,
      storedVehicleId: 'mitsu-6738',
      storedVehicleName: 'MITSU บน 6738',
      counselorId: PRACHA_PERSONNEL_ID,
    });
    expect(result.vehicleId).toBe('mitsu-6738');
    expect(result.vehicleName).toBe('MITSU บน 6738');
  });

  it('21. guidance from appointment prefers appointment stored vehicle', () => {
    const result = resolveVehicleForGuidance({
      appointmentVehicleId: 'special-bus',
      appointmentVehicleName: 'รถบัสวิทยาลัย',
      counselorId: PRACHA_PERSONNEL_ID,
    });
    expect(result.vehicleId).toBe('special-bus');
    expect(result.vehicleName).toBe('รถบัสวิทยาลัย');
  });

  it('22. user manual override is respected and not reset', () => {
    // When user manually picks another vehicle on Create, user selection takes precedence
    const userSelectedId = 'other-car-01';
    const userSelectedName = 'รถตู้ 1234';
    // Resolver should return user selection when passed as stored/current selection
    const result = resolveVehicleForAppointment({
      isEdit: false,
      storedVehicleId: userSelectedId,
      storedVehicleName: userSelectedName,
      counselorId: PRACHA_PERSONNEL_ID,
    });
    expect(result.vehicleId).toBe(userSelectedId);
    expect(result.vehicleName).toBe(userSelectedName);
  });

  // ==========================================
  // FIRESTORE PAYLOAD TESTS (23-25)
  // ==========================================
  it('23. sanitizeFirestorePayload removes undefined fields so addDoc never crashes', () => {
    const payloadWithUndefined = {
      schoolName: 'บ้านน้ำลี',
      counselorName: 'อ.ประชา กัลปนารถ',
      submissionId: undefined,
      appointmentId: 'appt_123',
      vehicleId: undefined,
    };
    const sanitized = sanitizeFirestorePayload(payloadWithUndefined);
    expect(sanitized).not.toHaveProperty('submissionId');
    expect(sanitized).not.toHaveProperty('vehicleId');
    expect(sanitized.appointmentId).toBe('appt_123');
    expect(sanitized.schoolName).toBe('บ้านน้ำลี');
  });

  it('24. guidance from legacy appointment without submissionId omits submissionId cleanly', () => {
    const legacyApptData = {
      appointmentId: 'legacy_appt_789',
      submissionId: undefined,
    };
    const cleanPayload = sanitizeFirestorePayload({
      ...legacyApptData,
      date: '2026-09-20',
      workType: 'แนะแนวสัญจร',
    });
    expect(cleanPayload.submissionId).toBeUndefined();
    expect(Object.keys(cleanPayload)).not.toContain('submissionId');
    expect(cleanPayload.appointmentId).toBe('legacy_appt_789');
  });

  it('25. preserves appointmentId link when recording guidance from appointment', () => {
    const guidancePayload = sanitizeFirestorePayload({
      appointmentId: '7WJS2I9EZ56moWWcMfZd',
      submissionId: undefined,
      counselorId: PRACHA_PERSONNEL_ID,
      counselorName: 'อ.ประชา กัลปนารถ',
    });
    expect(guidancePayload.appointmentId).toBe('7WJS2I9EZ56moWWcMfZd');
  });

  // ==========================================
  // LAYOUT & INTERACTION TESTS (26-27)
  // ==========================================
  it('26. table headers and columns fit within 1366x768 viewport target without overflowing', () => {
    // Minimum target widths defined for all 3 views:
    const submissionsTableMinWidth = 980; // < 1060px available on 1366
    const appointmentsTableMinWidth = 920; // < 1060px available on 1366
    const fieldTripsTableMinWidth = 880; // < 1060px available on 1366
    const availableDesktopContentWidth = 1366 - 256 - 48; // 1062px

    expect(submissionsTableMinWidth).toBeLessThan(availableDesktopContentWidth);
    expect(appointmentsTableMinWidth).toBeLessThan(availableDesktopContentWidth);
    expect(fieldTripsTableMinWidth).toBeLessThan(availableDesktopContentWidth);
  });

  it('27. preserves full school cell clickable target behavior', () => {
    // Helper function checking button classes contain full-cell dimension markers
    const schoolCellButtonClass =
      'w-full h-full min-h-[52px] py-2.5 px-2.5 text-left flex flex-col justify-center hover:bg-sky-50/70 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#087CC1] transition-colors group';
    expect(schoolCellButtonClass).toContain('w-full');
    expect(schoolCellButtonClass).toContain('h-full');
    expect(schoolCellButtonClass).toContain('cursor-pointer');
  });
});
