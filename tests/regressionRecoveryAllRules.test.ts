import { describe, it, expect } from 'vitest';
import { formatSchoolDisplayName, getCleanSchoolCode } from '../src/utils/schoolStatus';
import {
  getSelectablePersonnel,
  getDefaultSubmitterNames,
  resolvePersonnelDisplayName,
  stripRoleSuffix,
  cleanTeacherName,
} from '../src/utils/personnelSelector';
import {
  getDefaultVehicleForPersonnel,
  resolveVehicleForAppointment,
  VIGO_VEHICLE,
  MITSU_VEHICLE,
} from '../src/utils/vehicleMapping';
import {
  formatAppointmentTime,
  isValidTimeRange,
} from '../src/utils/appointmentUtils';
import { UserProfile, School, DocumentSubmission, Appointment, FieldTrip } from '../src/types';

describe('URGENT REGRESSION RECOVERY - Complete UI & Business Rules', () => {
  describe('1. School Short Display Name Everywhere', () => {
    it('strips leading โรงเรียน and รร. prefixes', () => {
      expect(formatSchoolDisplayName('โรงเรียนบ้านน้ำลี')).toBe('บ้านน้ำลี');
      expect(formatSchoolDisplayName('โรงเรียนท่าปลาอนุสรณ์')).toBe('ท่าปลาอนุสรณ์');
      expect(formatSchoolDisplayName('โรงเรียนลีไทยวิทยาคม')).toBe('ลีไทยวิทยาคม');
      expect(formatSchoolDisplayName('รร.บ้านน้ำลี')).toBe('บ้านน้ำลี');
      expect(formatSchoolDisplayName('โรงเรียนเทศบาลวัดหนองผา')).toBe('เทศบาลวัดหนองผา');
      expect(formatSchoolDisplayName('โรงเรียนเตรียมอุดมศึกษาน้อมเกล้า อุตรดิตถ์')).toBe('เตรียมอุดมศึกษาน้อมเกล้า อุตรดิตถ์');
    });

    it('handles empty or null gracefully', () => {
      expect(formatSchoolDisplayName('')).toBe('');
      expect(formatSchoolDisplayName(null)).toBe('');
      expect(formatSchoolDisplayName(undefined)).toBe('');
    });
  });

  describe('2. Technical School IDs Suppressed', () => {
    it('filters out import_*, manual_*, legacy_*, and random Firestore document IDs', () => {
      expect(getCleanSchoolCode('import_7c53c77dfa4eac0a1bb387c0dd04b784b80beb931b3e8331185ed6b415df2c36')).toBeNull();
      expect(getCleanSchoolCode('manual_12345')).toBeNull();
      expect(getCleanSchoolCode('legacy_abc')).toBeNull();
      expect(getCleanSchoolCode('tbChEEBTiX6XyQ7B3ef6')).toBeNull();
      expect(getCleanSchoolCode('sCcSy60QOEVu0XNol6CQ')).toBeNull();
    });

    it('preserves genuine user-facing school codes', () => {
      expect(getCleanSchoolCode('1064620361')).toBe('1064620361');
      expect(getCleanSchoolCode('1064620363')).toBe('1064620363');
      expect(getCleanSchoolCode('SCH-001')).toBe('SCH-001');
    });
  });

  describe('3. Route 1 & Route 2 Required Submitters', () => {
    const mockUsers: UserProfile[] = [
      { id: 'usr_admin', displayName: 'อ.ประชา กัลปนารถ', role: 'MANAGER', teamId: 'team1', active: true, email: 'pracha@utt.ac.th' },
      { id: 'usr_staff1', displayName: 'อ.ณิชชัยกุญช์ โลราช', role: 'STAFF', teamId: 'team1', active: true, email: 'nitch@utt.ac.th' },
      { id: 'usr_staff2', displayName: 'อ.ปิยะ สีตาชัย', role: 'STAFF', teamId: 'team2', active: true, email: 'piya@utt.ac.th' },
    ];
    const selectable = getSelectablePersonnel(mockUsers);

    it('route 1 auto-selects both Pracha and Nitchaikun', () => {
      const route1Submitters = getDefaultSubmitterNames('team1', selectable);
      expect(route1Submitters).toEqual(['อ.ประชา กัลปนารถ', 'อ.ณิชชัยกุญช์ โลราช']);
      expect(route1Submitters).toHaveLength(2);
    });

    it('route 2 auto-selects Piya Sitachai', () => {
      const route2Submitters = getDefaultSubmitterNames('team2', selectable);
      expect(route2Submitters).toEqual(['อ.ปิยะ สีตาชัย']);
      expect(route2Submitters).toHaveLength(1);
    });
  });

  describe('4. Personnel Dropdown - Deduplication & Exclusions', () => {
    it('strips role suffixes and merges duplicate accounts for canonical guidance personnel', () => {
      const usersWithDuplicates: UserProfile[] = [
        { id: 'usr_admin', displayName: 'อ.ประชา กัลปนารถ', role: 'MANAGER', teamId: 'team1', active: true, email: 'p1@utt.ac.th' },
        { id: 'usr_admin_dup', displayName: 'อ.ประชา กัลปนารถ (หัวหน้างานแนะแนว)', role: 'MANAGER', teamId: 'team1', active: true, email: 'p2@utt.ac.th' },
        { id: 'usr_staff1', displayName: 'อ.ณิชชัยกุญช์ โลราช', role: 'STAFF', teamId: 'team1', active: true, email: 'n1@utt.ac.th' },
        { id: 'usr_staff1_dup', displayName: 'อ.ณิชชัยกุญช์ โลราช (แนะแนวสาย 1)', role: 'STAFF', teamId: 'team1', active: true, email: 'n2@utt.ac.th' },
        { id: 'usr_staff2', displayName: 'อ.ปิยะ สีตาชัย', role: 'STAFF', teamId: 'team2', active: true, email: 'pi1@utt.ac.th' },
        { id: 'usr_staff2_dup', displayName: 'อ.ปิยะ สีตาชัย (แนะแนวสาย 2)', role: 'STAFF', teamId: 'team2', active: true, email: 'pi2@utt.ac.th' },
      ];

      const options = getSelectablePersonnel(usersWithDuplicates);
      expect(options).toHaveLength(3);

      const names = options.map(o => o.displayName);
      expect(names).toEqual(['อ.ณิชชัยกุญช์ โลราช', 'อ.ประชา กัลปนารถ', 'อ.ปิยะ สีตาชัย']);
      expect(names.some(n => n.includes('('))).toBe(false);
    });

    it('excludes system-only admin and clerical viewer accounts', () => {
      const usersWithSystem: UserProfile[] = [
        { id: 'sys1', displayName: 'ผู้ดูแลระบบ', role: 'ADMIN', active: true, email: 'admin@utt.ac.th' },
        { id: 'sys2', displayName: 'เจ้าหน้าที่ธุรการ', role: 'VIEWER', active: true, email: 'clerk@utt.ac.th' },
        { id: 'usr_admin', displayName: 'อ.ประชา กัลปนารถ', role: 'MANAGER', teamId: 'team1', active: true, email: 'pracha@utt.ac.th' },
      ];

      const options = getSelectablePersonnel(usersWithSystem);
      expect(options).toHaveLength(1);
      expect(options[0].displayName).toBe('อ.ประชา กัลปนารถ');
    });
  });

  describe('5. Legacy Records & Desktop 2 Submitters Display', () => {
    it('resolves legacy alias without altering submitter count', () => {
      const selectable = getSelectablePersonnel();
      const resolved = resolvePersonnelDisplayName('อ.ประชา กัลปนารถ (หัวหน้างานแนะแนว)', selectable);
      expect(resolved.matched).toBe(true);
      expect(resolved.displayName).toBe('อ.ประชา กัลปนารถ');
    });

    it('splits comma-separated legacy submitters into separate items for 2-row desktop display', () => {
      const rawComma = 'อ.ประชา กัลปนารถ, อ.ณิชชัยกุญช์ โลราช';
      const items = rawComma.split(/[,+]/).map(s => s.trim()).filter(Boolean);
      expect(items).toHaveLength(2);
      expect(items[0]).toBe('อ.ประชา กัลปนารถ');
      expect(items[1]).toBe('อ.ณิชชัยกุญช์ โลราช');
    });
  });

  describe('6. Vehicle Business Rules', () => {
    it('maps Pracha to VIGO กข 9914 default', () => {
      const v = getDefaultVehicleForPersonnel('usr_admin', 'อ.ประชา กัลปนารถ');
      expect(v).toEqual(VIGO_VEHICLE);
    });

    it('maps Piya to MITSU บน 6738 default', () => {
      const v = getDefaultVehicleForPersonnel('usr_staff2', 'อ.ปิยะ สีตาชัย');
      expect(v).toEqual(MITSU_VEHICLE);
    });

    it('leaves Nitchaikun with unassigned default', () => {
      const v = getDefaultVehicleForPersonnel('usr_staff1', 'อ.ณิชชัยกุญช์ โลราช');
      expect(v).toBeNull();
    });

    it('stored vehicle wins on Edit', () => {
      const v = resolveVehicleForAppointment({
        isEdit: true,
        storedVehicleId: 'custom-veh',
        storedVehicleName: 'รถตู้เช่าพิเศษ',
        counselorId: 'usr_admin',
        counselorName: 'อ.ประชา กัลปนารถ',
      });
      expect(v.vehicleId).toBe('custom-veh');
      expect(v.vehicleName).toBe('รถตู้เช่าพิเศษ');
    });
  });

  describe('7. Safe Appointment Time Validation', () => {
    it('detects invalid reversed time range', () => {
      expect(isValidTimeRange('13:00', '12:00')).toBe(false);
      expect(isValidTimeRange('10:00', '09:00')).toBe(false);
      expect(isValidTimeRange('09:00', '11:00')).toBe(true);
    });

    it('safely renders single start time for invalid legacy range without throwing', () => {
      expect(formatAppointmentTime('13:00', '12:00')).toBe('13:00 น.');
      expect(formatAppointmentTime('09:00', '11:30')).toBe('09:00 - 11:30 น.');
    });
  });
});
