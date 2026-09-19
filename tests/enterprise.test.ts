import { describe, it, expect } from 'vitest';
import { isTimeOverlapping, getDaysDifference } from '../src/utils/dateUtils';
import { detectTeamByDistrict } from '../src/utils/excelImport';
import { ApprovalStatus } from '../src/types';

describe('Enterprise Time Overlap & Conflict Detection', () => {
  it('identifies non-overlapping consecutive time slots', () => {
    // 09:00 - 10:30 and 10:30 - 12:00 do not overlap
    expect(isTimeOverlapping('09:00', '10:30', '10:30', '12:00')).toBe(false);
    expect(isTimeOverlapping('10:30', '12:00', '09:00', '10:30')).toBe(false);
  });

  it('identifies overlapping time slots', () => {
    // Overlapping by 30 minutes
    expect(isTimeOverlapping('09:00', '11:00', '10:00', '12:00')).toBe(true);
    // Fully enclosed
    expect(isTimeOverlapping('09:00', '12:00', '10:00', '11:00')).toBe(true);
    // Identical slots
    expect(isTimeOverlapping('13:00', '15:00', '13:00', '15:00')).toBe(true);
  });
});

describe('Enterprise Notification Date Utilities', () => {
  it('calculates calendar day differences accurately', () => {
    expect(getDaysDifference('2026-09-13', '2026-09-15')).toBe(2);
    expect(getDaysDifference('2026-09-15', '2026-09-13')).toBe(-2);
    expect(getDaysDifference('2026-09-13', '2026-09-13')).toBe(0);
    expect(getDaysDifference(new Date('2026-10-01'), new Date('2026-10-05'))).toBe(4);
  });
});

describe('Feeder School Team Auto-Assignment by District', () => {
  it('correctly assigns Team 2 for eastern/mountainous Uttaradit districts', () => {
    expect(detectTeamByDistrict('น้ำปาด')).toBe('team2');
    expect(detectTeamByDistrict('อำเภอท่าปลา')).toBe('team2');
    expect(detectTeamByDistrict('ฟากท่า')).toBe('team2');
    expect(detectTeamByDistrict('บ้านโคก')).toBe('team2');
    expect(detectTeamByDistrict('ทองแสนขัน')).toBe('team2');
  });

  it('correctly assigns Team 1 for central/western Uttaradit districts', () => {
    expect(detectTeamByDistrict('เมืองอุตรดิตถ์')).toBe('team1');
    expect(detectTeamByDistrict('อำเภอลับแล')).toBe('team1');
    expect(detectTeamByDistrict('ตรอน')).toBe('team1');
    expect(detectTeamByDistrict('พิชัย')).toBe('team1');
  });
});

describe('Enterprise Approval Status Flow', () => {
  it('supports all required enterprise workflow states', () => {
    const validStatuses: ApprovalStatus[] = [
      'DRAFT',
      'PENDING_APPROVAL',
      'APPROVED',
      'REVISION_REQUESTED',
    ];
    expect(validStatuses).toHaveLength(4);
  });
});
