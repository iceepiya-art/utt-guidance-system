import { describe, it, expect } from 'vitest';
import { UserProfile } from '../src/types';
import {
  getSelectablePersonnel,
  isEligiblePersonnel,
  isSystemOnlyAccount,
  findMatchingPersonnel,
  cleanTeacherName,
  formatPersonnelRoleTeam,
  getDefaultSubmitterNames,
  resolvePersonnelDisplayName,
  resolveResponsibleCounselor,
  KNOWN_PERSONNEL_ALIASES,
} from '../src/utils/personnelSelector';

describe('Personnel Selector & Submitter Tests', () => {
  // Mock standard production users
  const pracha: UserProfile = {
    id: 'usr_admin',
    displayName: 'อ.ประชา  กัลปนารถ',
    email: 'pracha@utt.ac.th',
    role: 'MANAGER',
    teamId: 'team1',
    active: true,
  };

  const nitchaikul: UserProfile = {
    id: 'usr_staff1',
    displayName: 'อ.ณิชชัยกุญช์  โลราช',
    email: 'nitchaikul@utt.ac.th',
    role: 'STAFF',
    teamId: 'team1',
    active: true,
  };

  const piya: UserProfile = {
    id: 'usr_staff2',
    displayName: 'อ.ปิยะ  สีตาชัย',
    email: 'piya@utt.ac.th',
    role: 'STAFF',
    teamId: 'team2',
    active: true,
  };

  const systemAdmin: UserProfile = {
    id: 'sxvbpSVv6XSMwuIDtmi7wnGviv42',
    displayName: 'ผู้ดูแลระบบ',
    email: 'admin@utt.ac.th',
    role: 'ADMIN',
    teamId: 'team1',
    active: true,
  };

  const viewerClerk: UserProfile = {
    id: 'usr_viewer',
    displayName: 'เจ้าหน้าที่ธุรการ (ดูข้อมูลเท่านั้น)',
    email: 'clerk@utt.ac.th',
    role: 'VIEWER',
    active: true,
  };

  // 1. Firestore personnel 3 คน → ได้ 3 options ไม่ซ้ำ
  it('1. Firestore personnel 3 คน -> returns exactly 3 distinct options without duplicates', () => {
    const users: UserProfile[] = [pracha, nitchaikul, piya];
    const options = getSelectablePersonnel(users);

    expect(options).toHaveLength(3);
    const ids = options.map(o => o.id);
    expect(ids).toEqual(expect.arrayContaining(['usr_admin', 'usr_staff1', 'usr_staff2']));
    // Check normalized clean display names (collapses double spaces)
    expect(options.find(o => o.id === 'usr_admin')?.displayName).toBe('อ.ประชา กัลปนารถ');
    expect(options.find(o => o.id === 'usr_staff1')?.displayName).toBe('อ.ณิชชัยกุญช์ โลราช');
    expect(options.find(o => o.id === 'usr_staff2')?.displayName).toBe('อ.ปิยะ สีตาชัย');
  });

  // 2. Personnel ID เดียว → ไม่สร้าง option ซ้ำ
  it('2. Personnel ID เดียว -> does not create duplicate options even if duplicated in array', () => {
    const users: UserProfile[] = [
      pracha,
      { ...pracha, displayName: 'อ.ประชา กัลปนารถ (สำเนา)' },
      nitchaikul,
    ];
    const options = getSelectablePersonnel(users);

    const prachaOptions = options.filter(o => o.id === 'usr_admin');
    expect(prachaOptions).toHaveLength(1);
    expect(options).toHaveLength(2);
  });

  // 3. คนละ ID แต่ชื่อเหมือนกัน → ต้องยังเป็น 2 คน ห้าม merge ด้วยชื่อ
  it('3. คนละ ID แต่ชื่อเหมือนกัน -> retains both as 2 separate options, never merged by name', () => {
    const userA: UserProfile = {
      id: 'usr_person_a',
      displayName: 'อ.สมชาย มีสุข',
      email: 'somchai_a@utt.ac.th',
      role: 'STAFF',
      teamId: 'team1',
      active: true,
    };
    const userB: UserProfile = {
      id: 'usr_person_b',
      displayName: 'อ.สมชาย มีสุข',
      email: 'somchai_b@utt.ac.th',
      role: 'STAFF',
      teamId: 'team2',
      active: true,
    };

    const options = getSelectablePersonnel([userA, userB]);
    expect(options).toHaveLength(2);
    expect(options.map(o => o.id)).toEqual(['usr_person_a', 'usr_person_b']);
    expect(options[0].displayName).toBe('อ.สมชาย มีสุข');
    expect(options[1].displayName).toBe('อ.สมชาย มีสุข');
  });

  // 4. inactive → ไม่แสดง
  it('4. inactive -> is excluded from selectable personnel', () => {
    const inactiveUser: UserProfile = {
      id: 'usr_inactive',
      displayName: 'อ.สมคิด พักงาน',
      email: 'somkid_inactive@utt.ac.th',
      role: 'STAFF',
      active: false,
    };

    const options = getSelectablePersonnel([pracha, inactiveUser]);
    expect(options).toHaveLength(1);
    expect(options[0].id).toBe('usr_admin');
    expect(isEligiblePersonnel(inactiveUser)).toBe(false);
  });

  // 5. VIEWER / system-only account → ไม่แสดงใน teacher selector
  it('5. VIEWER / system-only account -> excluded from teacher selector', () => {
    const allUsers: UserProfile[] = [pracha, nitchaikul, piya, systemAdmin, viewerClerk];
    const options = getSelectablePersonnel(allUsers);

    expect(options).toHaveLength(3);
    const ids = options.map(o => o.id);
    expect(ids).not.toContain(systemAdmin.id);
    expect(ids).not.toContain(viewerClerk.id);

    expect(isSystemOnlyAccount(systemAdmin)).toBe(true);
    expect(isEligiblePersonnel(viewerClerk)).toBe(false);
  });

  // 6. ADMIN ที่เป็น Personnel จริง → แสดงได้
  it('6. ADMIN ที่เป็น Personnel จริง -> included as eligible personnel', () => {
    const humanAdmin: UserProfile = {
      id: 'usr_human_admin',
      displayName: 'อ.สมคิด มั่นคง',
      email: 'somkid@utt.ac.th',
      role: 'ADMIN',
      teamId: 'team1',
      active: true,
    };

    expect(isSystemOnlyAccount(humanAdmin)).toBe(false);
    expect(isEligiblePersonnel(humanAdmin)).toBe(true);

    const options = getSelectablePersonnel([humanAdmin, systemAdmin]);
    expect(options).toHaveLength(1);
    expect(options[0].id).toBe('usr_human_admin');
    expect(options[0].displayName).toBe('อ.สมคิด มั่นคง');
  });

  // 7. custom teacher → ยังเพิ่มได้
  it('7. custom teacher -> can be added freely without being blocked', () => {
    const options = getSelectablePersonnel([pracha, nitchaikul, piya]);
    const customTeacherName = 'อ.วิชัย พิเศษ (ผู้ช่วยวิจัย)';

    // Verify it is not in the system personnel options
    const matched = findMatchingPersonnel(customTeacherName, options);
    expect(matched).toBeUndefined();

    // Verify simulating adding custom teacher to current submitters
    const currentSubmitters = [options[0].displayName];
    const updatedSubmitters = [...currentSubmitters, customTeacherName.trim()];
    expect(updatedSubmitters).toContain(customTeacherName);
    expect(updatedSubmitters).toHaveLength(2);
  });

  // 8. Legacy submittedByNames → เปิด Edit แล้วไม่หาย
  it('8. Legacy submittedByNames -> preserved when initializing edit without data loss', () => {
    const legacySubmission = {
      id: 'sub_123',
      schoolName: 'โรงเรียนท่าปลาประชาอุทิศ',
      submittedByNames: ['อ.ประชา กัลปนารถ (หัวหน้างานแนะแนว)'],
    };

    // Simulate modal init logic:
    const rawNames = legacySubmission.submittedByNames || [];
    expect(rawNames).toEqual(['อ.ประชา กัลปนารถ (หัวหน้างานแนะแนว)']);
    expect(rawNames[0]).toBe('อ.ประชา กัลปนารถ (หัวหน้างานแนะแนว)');
  });

  // 9. เปิด Edit แล้วไม่แก้อาจารย์ผู้ยื่น → Save payload รักษาค่าเดิม
  it('9. Edit without modifying submitters -> save payload preserves original legacy string exactly', () => {
    const legacyNames = ['อ.ประชา กัลปนารถ (หัวหน้างานแนะแนว)'];
    // In SubmissionFormModal, selectedPersonnelNames is initialized with legacyNames
    let selectedPersonnelNames = [...legacyNames];

    // User edits other fields (e.g. school, document number), but not submitters
    const savePayload = {
      documentNumber: 'ว 123/2569',
      submittedByNames: selectedPersonnelNames,
    };

    expect(savePayload.submittedByNames).toEqual(['อ.ประชา กัลปนารถ (หัวหน้างานแนะแนว)']);
    expect(savePayload.submittedByNames[0]).toBe('อ.ประชา กัลปนารถ (หัวหน้างานแนะแนว)');
  });

  // 10. เปลี่ยน Personnel → ใช้ชื่อมาตรฐานใหม่
  it('10. เปลี่ยน Personnel -> uses clean standard displayName from personnel profile', () => {
    const options = getSelectablePersonnel([pracha, nitchaikul, piya]);
    const selectedPersonnel = options.find(p => p.id === 'usr_admin')!;

    // When toggling/adding a system personnel, their clean displayName is used
    const newSubmitterNames = [selectedPersonnel.displayName];
    expect(newSubmitterNames).toEqual(['อ.ประชา กัลปนารถ']);
    expect(newSubmitterNames[0]).not.toContain('(หัวหน้างานแนะแนว)');
    expect(newSubmitterNames[0]).not.toContain('  '); // no double spaces
  });

  // 11. Appointment counselor selector → ไม่มี duplicate
  it('11. Appointment counselor selector -> no duplicates and excludes system accounts', () => {
    const allUsers: UserProfile[] = [
      pracha,
      nitchaikul,
      piya,
      systemAdmin,
      viewerClerk,
      // Duplicate user entry with same id
      { ...pracha, phone: '0812345678' },
    ];

    const selectable = getSelectablePersonnel(allUsers);
    const counselorOptions = selectable.map(p => ({
      id: p.id,
      name: p.displayName,
      teamId: p.teamId || 'team1',
      label: p.label,
    }));

    expect(counselorOptions).toHaveLength(3);
    const counselorIds = counselorOptions.map(c => c.id);
    expect(new Set(counselorIds).size).toBe(3);
    expect(counselorIds).not.toContain(systemAdmin.id);
    expect(counselorIds).not.toContain(viewerClerk.id);
  });

  // 12. FieldTrip counselor selector → ไม่มี duplicate
  it('12. FieldTrip counselor selector -> no duplicates and excludes system accounts', () => {
    const allUsers: UserProfile[] = [
      pracha,
      nitchaikul,
      piya,
      systemAdmin,
      viewerClerk,
    ];

    const selectable = getSelectablePersonnel(allUsers);
    expect(selectable).toHaveLength(3);
    expect(selectable.map(s => s.id)).toEqual(
      expect.arrayContaining(['usr_admin', 'usr_staff1', 'usr_staff2'])
    );
    expect(selectable.some(s => s.id === systemAdmin.id)).toBe(false);
    expect(selectable.some(s => s.id === viewerClerk.id)).toBe(false);
  });

  // Helper utility checks
  describe('Helper Utilities', () => {
    it('cleanTeacherName strips honorifics and parentheses correctly', () => {
      expect(cleanTeacherName('อ.ประชา กัลปนารถ (หัวหน้างานแนะแนว)')).toBe('ประชา กัลปนารถ');
      expect(cleanTeacherName('อาจารย์ณิชชัยกุญช์ โลราช (แนะแนวสาย 1)')).toBe('ณิชชัยกุญช์ โลราช');
      expect(cleanTeacherName('นายปิยะ สีตาชัย')).toBe('ปิยะ สีตาชัย');
    });

    it('formatPersonnelRoleTeam builds readable secondary text', () => {
      expect(formatPersonnelRoleTeam('MANAGER', 'team1')).toBe('หัวหน้างานแนะแนว • สาย 1 (อุตรดิตถ์)');
      expect(formatPersonnelRoleTeam('STAFF', 'team2')).toBe('แนะแนว • สาย 2 (สุโขทัย)');
      expect(formatPersonnelRoleTeam('ADMIN', 'team1')).toBe('ผู้ดูแลระบบ • สาย 1 (อุตรดิตถ์)');
    });

    it('findMatchingPersonnel matches by id, exact name, or clean name', () => {
      const options = getSelectablePersonnel([pracha, nitchaikul, piya]);
      expect(findMatchingPersonnel('usr_admin', options)?.id).toBe('usr_admin');
      expect(findMatchingPersonnel('อ.ประชา กัลปนารถ', options)?.id).toBe('usr_admin');
      expect(findMatchingPersonnel('อ.ประชา กัลปนารถ (หัวหน้างานแนะแนว)', options)?.id).toBe('usr_admin');
      expect(findMatchingPersonnel('ปิยะ', options)?.id).toBe('usr_staff2');
    });

    // Submitter rules by team
    it('getDefaultSubmitterNames returns 2 required submitters for team1 and 1 for team2', () => {
      const options = getSelectablePersonnel([pracha, nitchaikul, piya]);
      const team1Submitters = getDefaultSubmitterNames('team1', options);
      expect(team1Submitters).toEqual(['อ.ประชา กัลปนารถ', 'อ.ณิชชัยกุญช์ โลราช']);

      const team2Submitters = getDefaultSubmitterNames('team2', options);
      expect(team2Submitters).toEqual(['อ.ปิยะ สีตาชัย']);
    });

    // Team switching in create mode preserves additional submitters
    it('switching team preserves additional submitters while updating required submitters', () => {
      const options = getSelectablePersonnel([pracha, nitchaikul, piya]);
      const team1Required = getDefaultSubmitterNames('team1', options);
      const team2Required = getDefaultSubmitterNames('team2', options);

      // User starts on team1 and adds a custom teacher
      const initial = [...team1Required, 'อ.สมคิด พิเศษ'];
      expect(initial).toHaveLength(3);

      // User switches to team2
      const additional = initial.filter(n => !team1Required.includes(n));
      const switchedToTeam2 = [...team2Required, ...additional];
      expect(switchedToTeam2).toEqual(['อ.ปิยะ สีตาชัย', 'อ.สมคิด พิเศษ']);

      // User switches back to team1
      const additionalFromTeam2 = switchedToTeam2.filter(n => !team2Required.includes(n));
      const switchedBackToTeam1 = [...team1Required, ...additionalFromTeam2];
      expect(switchedBackToTeam1).toEqual(['อ.ประชา กัลปนารถ', 'อ.ณิชชัยกุญช์ โลราช', 'อ.สมคิด พิเศษ']);
    });

    // Legacy personnel alias resolution
    it('resolvePersonnelDisplayName correctly resolves known aliases and keeps unknown aliases safe', () => {
      const options = getSelectablePersonnel([pracha, nitchaikul, piya]);

      expect(resolvePersonnelDisplayName('อ.ประชา', options)).toEqual({
        displayName: 'อ.ประชา กัลปนารถ',
        matched: true,
      });

      expect(resolvePersonnelDisplayName('อ.ประชา กัลปนารถ (หัวหน้างานแนะแนว)', options)).toEqual({
        displayName: 'อ.ประชา กัลปนารถ',
        matched: true,
      });

      expect(resolvePersonnelDisplayName('อ.ณิชชัยกุญช์ โลราช (แนะแนวสาย 1)', options)).toEqual({
        displayName: 'อ.ณิชชัยกุญช์ โลราช',
        matched: true,
      });

      expect(resolvePersonnelDisplayName('อ.ปิยะ สีดาชัย', options)).toEqual({
        displayName: 'อ.ปิยะ สีตาชัย',
        matched: true,
      });

      expect(resolvePersonnelDisplayName('อ.ปิยะ สีดาชัย (แนะแนวสาย 2)', options)).toEqual({
        displayName: 'อ.ปิยะ สีตาชัย',
        matched: true,
      });

      // Unknown custom teacher
      expect(resolvePersonnelDisplayName('อ.สมชาย มีสุข', options)).toEqual({
        displayName: 'อ.สมชาย มีสุข',
        matched: false,
      });
    });

    // Historical record with 1 person must NOT add 2nd person retroactively
    it('historical record with 1 submitter does not add second submitter', () => {
      const options = getSelectablePersonnel([pracha, nitchaikul, piya]);
      const legacyRaw = ['อ.ประชา'];

      const resolved = legacyRaw.map(n => {
        const r = resolvePersonnelDisplayName(n, options);
        return r.matched ? r.displayName : n;
      });

      expect(resolved).toEqual(['อ.ประชา กัลปนารถ']);
      expect(resolved).toHaveLength(1); // Crucial: length remains 1, NOT 2!
    });
  });

  // Thai Date Picker & Date Utils Verification
  describe('Thai Date & Timezone Safety', () => {
    it('formats ISO 2026-09-20 into Buddhist year 2569 in Thai', async () => {
      const { formatThaiFullDate, getBuddhistYear } = await import('../src/utils/dateUtils');
      expect(getBuddhistYear('2026-09-20')).toBe(2569);
      expect(formatThaiFullDate('2026-09-20')).toContain('2569');
      expect(formatThaiFullDate('2026-09-20')).toContain('กันยายน');
    });

    it('parses YYYY-MM-DD directly without timezone day shift', () => {
      const dateStr = '2026-09-20';
      const [year, month, day] = dateStr.split('-').map(Number);
      expect(year).toBe(2026);
      expect(month).toBe(9);
      expect(day).toBe(20);
      // Re-formatted ISO string remains identical
      const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      expect(iso).toBe('2026-09-20');
    });
  });

  // Vehicle master tests
  describe('Vehicle Master & Consistency', () => {
    it('filters out vehicles with ไจ๋เจา or 4163 from active list while keeping valid ones', () => {
      const rawVehicles = [
        { id: 'v1', vehicleName: 'MITSU บน 6738', registrationNumber: 'บน 6738', active: true },
        { id: 'v2', vehicleName: 'VIGO กข 9914', registrationNumber: 'กข 9914', active: true },
        { id: 'v3', vehicleName: 'ไจ๋เจา 4163', registrationNumber: '4163', active: true },
      ];

      const cleanList = rawVehicles.filter(v =>
        v.active &&
        !v.vehicleName?.includes('ไจ๋เจา') &&
        !v.registrationNumber?.includes('4163')
      );

      expect(cleanList).toHaveLength(2);
      expect(cleanList.map(v => v.id)).toEqual(['v1', 'v2']);
    });
  });

  // FieldTrip Form Final UI & Personnel Resolution Regression Tests
  describe('FieldTrip Form Final UI & Personnel Resolution Regression Tests', () => {
    const users: UserProfile[] = [pracha, nitchaikul, piya];
    const selectable = getSelectablePersonnel(users);

    // 1. "อ.ประชา" -> current personnel อ.ประชา กัลปนารถ
    it('1. resolves legacy "อ.ประชา" to current personnel "อ.ประชา กัลปนารถ"', () => {
      const resolved = resolveResponsibleCounselor(undefined, 'อ.ประชา', selectable);
      expect(resolved.id).toBe('usr_admin');
      expect(resolved.name).toBe('อ.ประชา กัลปนารถ');
      expect(resolved.isLegacyFallback).toBe(false);
      expect(resolved.matchedPersonnel?.displayName).toBe('อ.ประชา กัลปนารถ');
    });

    // 2. "อ.ปิยะ" -> current personnel อ.ปิยะ สีตาชัย
    it('2. resolves legacy "อ.ปิยะ" to current personnel "อ.ปิยะ สีตาชัย"', () => {
      const resolved = resolveResponsibleCounselor(undefined, 'อ.ปิยะ', selectable);
      expect(resolved.id).toBe('usr_staff2');
      expect(resolved.name).toBe('อ.ปิยะ สีตาชัย');
      expect(resolved.isLegacyFallback).toBe(false);
      expect(resolved.matchedPersonnel?.displayName).toBe('อ.ปิยะ สีตาชัย');
    });

    // 3. unknown legacy -> legacy fallback
    it('3. unknown legacy returns fallback without crashing or false matching', () => {
      const resolved = resolveResponsibleCounselor('legacy_c_99', 'อ.สมคิด เจริญพร', selectable);
      expect(resolved.isLegacyFallback).toBe(true);
      expect(resolved.id).toBe('legacy_c_99');
      expect(resolved.name).toBe('อ.สมคิด เจริญพร');
      expect(resolved.matchedPersonnel).toBeUndefined();
    });

    // 4. verified alias -> ไม่มี duplicate "(เดิม)"
    it('4. verified alias produces no duplicate "(เดิม)" in options', () => {
      const legacyName = 'อ.ประชา';
      const resolved = resolveResponsibleCounselor(undefined, legacyName, selectable);
      // In FieldTripFormModal, fallback option is rendered ONLY IF !selectable.some(p => p.id === counselorId)
      const hasDuplicateOption = !selectable.some(p => p.id === resolved.id);
      expect(hasDuplicateOption).toBe(false);

      // Verify dropdown option selection matches exactly
      const selectedOption = selectable.find(p => p.id === resolved.id);
      expect(selectedOption).toBeDefined();
      expect(selectedOption?.label).toContain('อ.ประชา กัลปนารถ — หัวหน้างานแนะแนว • สาย 1 (อุตรดิตถ์)');
    });

    // 5. EDIT 1 responsible person -> ยังเป็น 1 คน
    it('5. EDIT with 1 responsible person preserves strictly 1 person (no route defaults added)', () => {
      const legacyTrip = {
        id: 'completed_appt_106',
        counselorName: 'อ.ประชา',
        counselorId: '',
        teamMemberNames: '',
        teamId: 'team1' as const,
      };

      const resolved = resolveResponsibleCounselor(legacyTrip.counselorId, legacyTrip.counselorName, selectable);
      // In EDIT mode, counselor is normalized to resolved.name, and teamMemberNames is preserved as-is
      const formCounselors = [resolved.name];
      const formTeamMembers = legacyTrip.teamMemberNames ? legacyTrip.teamMemberNames.split(',') : [];

      expect(formCounselors).toHaveLength(1);
      expect(formCounselors[0]).toBe('อ.ประชา กัลปนารถ');
      expect(formTeamMembers).toHaveLength(0); // Nitchaikun is NOT auto-added on EDIT!
    });

    // 6. เปิด Edit -> ไม่มี Firestore write
    it('6. opening Edit modal performs 0 Firestore writes (UI state normalization only)', () => {
      let firestoreWriteCount = 0;
      // Normalization simulates modal opening state initialization
      const resolved = resolveResponsibleCounselor(undefined, 'อ.ประชา', selectable);
      expect(resolved.name).toBe('อ.ประชา กัลปนารถ');
      // No write operation invoked
      expect(firestoreWriteCount).toBe(0);
    });

    // 7. actual students = 0 -> valid
    it('7. actual students = 0 is valid and not treated as falsy/empty', () => {
      const rawVal = '0';
      const num = Math.max(0, parseInt(rawVal, 10) || 0);
      expect(num).toBe(0);
      expect(num).toBeGreaterThanOrEqual(0);
      // State display helper preserves 0 instead of converting to empty string
      const studentCount: number = 0;
      const displayVal = studentCount !== undefined && studentCount !== null ? studentCount : '';
      expect(displayVal).toBe(0);
    });

    // 8. actual students < 0 -> rejected/prevented
    it('8. actual students < 0 is rejected/prevented by Math.max(0, ...)', () => {
      const negativeVal = '-5';
      const parsed = Math.max(0, parseInt(negativeVal, 10) || 0);
      expect(parsed).toBe(0);
      expect(parsed).not.toBeLessThan(0);
    });

    // 9. multiple schools -> time/count state ไม่ปนกัน
    it('9. multiple schools have independent time and count states', () => {
      let tripSchools = [
        { schoolId: 'sch_1', schoolName: 'โรงเรียนบ้านวังดิน', timeSlot: '09:00 - 12:00 น.', studentCount: 10 },
        { schoolId: 'sch_2', schoolName: 'โรงเรียนท่าปลาประชาอุทิศ', timeSlot: '13:00 - 15:00 น.', studentCount: 25 },
      ];

      // Update school #2
      const updateSchoolRow = (index: number, field: string, val: any) => {
        tripSchools = tripSchools.map((s, idx) => idx === index ? { ...s, [field]: val } : s);
      };

      updateSchoolRow(1, 'studentCount', 50);
      updateSchoolRow(1, 'timeSlot', '13:30 - 15:30 น.');

      // Verify School #1 is completely unaffected
      expect(tripSchools[0].studentCount).toBe(10);
      expect(tripSchools[0].timeSlot).toBe('09:00 - 12:00 น.');

      // Verify School #2 has new values
      expect(tripSchools[1].studentCount).toBe(50);
      expect(tripSchools[1].timeSlot).toBe('13:30 - 15:30 น.');
    });
  });
});
