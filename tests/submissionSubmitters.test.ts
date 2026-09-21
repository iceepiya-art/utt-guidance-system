import { describe, it, expect } from 'vitest';
import { cleanTeacherName, findMatchingPersonnel, SelectablePersonnel } from '../src/utils/personnelSelector';

describe('submissionSubmitters utility tests', () => {
  const mockPersonnelList: SelectablePersonnel[] = [
    {
      id: 'usr_admin',
      displayName: 'อ.ประชา กัลปนารถ',
      role: 'MANAGER',
      label: 'อ.ประชา กัลปนารถ — หัวหน้างานแนะแนว',
    },
    {
      id: 'usr_staff1',
      displayName: 'อ.ณิชชัยกุญช์ โลราช',
      role: 'STAFF',
      label: 'อ.ณิชชัยกุญช์ โลราช — แนะแนว',
    },
    {
      id: 'usr_staff2',
      displayName: 'อ.ปิยะ สีตาชัย',
      role: 'STAFF',
      label: 'อ.ปิยะ สีตาชัย — แนะแนว',
    },
  ];

  it('matches exact name from personnel list', () => {
    const matched = findMatchingPersonnel('อ.ประชา กัลปนารถ', mockPersonnelList);
    expect(matched?.displayName).toBe('อ.ประชา กัลปนารถ');
  });

  it('matches shortened name "อ.ประชา" to full personnel profile', () => {
    const matched = findMatchingPersonnel('อ.ประชา', mockPersonnelList);
    expect(matched?.displayName).toBe('อ.ประชา กัลปนารถ');
  });

  it('matches "อ.ปิยะ" to full personnel profile', () => {
    const matched = findMatchingPersonnel('อ.ปิยะ', mockPersonnelList);
    expect(matched?.displayName).toBe('อ.ปิยะ สีตาชัย');
  });

  it('matches "อ.ณิชชัยกุญช์" to full personnel profile', () => {
    const matched = findMatchingPersonnel('อ.ณิชชัยกุญช์', mockPersonnelList);
    expect(matched?.displayName).toBe('อ.ณิชชัยกุญช์ โลราช');
  });

  it('returns undefined for custom unknown name', () => {
    const matched = findMatchingPersonnel('อ.กิตติพงษ์ ใจเย็น', mockPersonnelList);
    expect(matched).toBeUndefined();
  });

  it('handles empty input gracefully', () => {
    expect(findMatchingPersonnel('', mockPersonnelList)).toBeUndefined();
    expect(cleanTeacherName('')).toBe('');
  });
});

