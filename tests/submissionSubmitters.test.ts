import { describe, it, expect } from 'vitest';
import { normalizeTeacherName } from '../src/components/submissions/SubmissionFormModal';

describe('normalizeTeacherName', () => {
  const choices = [
    'อ.ประชา กัลปนารถ (หัวหน้างานแนะแนว)',
    'อ.ณิชชัยกุญช์ โลราช (แนะแนวสาย 1)',
    'อ.ปิยะ สีดาชัย (แนะแนวสาย 2)',
    'สมชาย มีสุข',
  ];

  it('matches exact name from choices', () => {
    expect(normalizeTeacherName('สมชาย มีสุข', choices)).toBe('สมชาย มีสุข');
  });

  it('matches shortened legacy name "อ.ประชา" to full system teacher choice', () => {
    expect(normalizeTeacherName('อ.ประชา', choices)).toBe(
      'อ.ประชา กัลปนารถ (หัวหน้างานแนะแนว)'
    );
  });

  it('matches "อ.ปิยะ" to full system teacher choice', () => {
    expect(normalizeTeacherName('อ.ปิยะ', choices)).toBe(
      'อ.ปิยะ สีดาชัย (แนะแนวสาย 2)'
    );
  });

  it('matches "อ.ณิชชัยกุญช์" to full system teacher choice', () => {
    expect(normalizeTeacherName('อ.ณิชชัยกุญช์', choices)).toBe(
      'อ.ณิชชัยกุญช์ โลราช (แนะแนวสาย 1)'
    );
  });

  it('returns custom unknown name if no match in choices', () => {
    expect(normalizeTeacherName('อ.กิตติพงษ์ ใจเย็น', choices)).toBe(
      'อ.กิตติพงษ์ ใจเย็น'
    );
  });

  it('handles empty input gracefully', () => {
    expect(normalizeTeacherName('', choices)).toBe('');
  });
});
