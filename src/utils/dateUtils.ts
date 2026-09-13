// Utility functions for Thai Buddhist Era, date formatting, and Asia/Bangkok timezone

export const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

export const THAI_MONTHS_FULL = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

export const THAI_DAYS_FULL = [
  'อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'
];

export const THAI_DAYS_SHORT = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

/**
 * Converts a date string or Date object to Thai Buddhist Year
 */
export function getBuddhistYear(date: Date | string | number): number {
  if (typeof date === 'number') return date + 543;
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.getFullYear() + 543;
}

/**
 * Gets Thai weekday name (e.g., "จันทร์", "อังคาร")
 */
export function getThaiDayOfWeek(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return THAI_DAYS_FULL[d.getDay()];
}

/**
 * Formats date as short Thai Buddhist Era: "20 ก.ค. 69"
 */
export function formatThaiShortDate(date: Date | string): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '-';
  const day = d.getDate();
  const month = THAI_MONTHS_SHORT[d.getMonth()];
  const bYearShort = (d.getFullYear() + 543).toString().slice(-2);
  return `${day} ${month} ${bYearShort}`;
}

/**
 * Formats date as full Thai Buddhist Era: "20 กรกฎาคม 2569"
 */
export function formatThaiFullDate(date: Date | string): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '-';
  const day = d.getDate();
  const month = THAI_MONTHS_FULL[d.getMonth()];
  const bYear = d.getFullYear() + 543;
  return `${day} ${month} ${bYear}`;
}

/**
 * Formats date with weekday: "วันจันทร์ที่ 20 กรกฎาคม 2569"
 */
export function formatThaiDateWithDay(date: Date | string): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '-';
  const dayName = THAI_DAYS_FULL[d.getDay()];
  const day = d.getDate();
  const month = THAI_MONTHS_FULL[d.getMonth()];
  const bYear = d.getFullYear() + 543;
  return `วัน${dayName}ที่ ${day} ${month} ${bYear}`;
}

/**
 * Formats YYYY-MM-DD string from Date
 */
export function toISODateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Gets today in YYYY-MM-DD
 */
export function getTodayISO(): string {
  return toISODateString(new Date());
}

/**
 * Gets relative Thai label (เช่น "วันนี้", "พรุ่งนี้", "เมื่อวาน")
 */
export function getRelativeThaiDayLabel(dateStr: string): string {
  const todayStr = getTodayISO();
  const today = new Date(todayStr);
  const target = new Date(dateStr);
  
  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'วันนี้';
  if (diffDays === 1) return 'พรุ่งนี้';
  if (diffDays === 2) return 'มะรืนนี้';
  if (diffDays === -1) return 'เมื่อวาน';
  if (diffDays > 0) return `อีก ${diffDays} วัน`;
  return `${Math.abs(diffDays)} วันก่อน`;
}

/**
 * Standard Guidance Availability Time Slots for Uttaradit Tech College
 */
export const STANDARD_TIME_SLOTS = [
  { id: 'morning_1', label: 'ช่วงเช้า 1', startTime: '09:00', endTime: '10:30' },
  { id: 'morning_2', label: 'ช่วงเช้า 2', startTime: '10:30', endTime: '12:00' },
  { id: 'afternoon_1', label: 'ช่วงบ่าย 1', startTime: '13:00', endTime: '14:30' },
  { id: 'afternoon_2', label: 'ช่วงบ่าย 2', startTime: '14:30', endTime: '16:00' },
];

export const THAI_MONTHS = THAI_MONTHS_FULL;

/**
 * Formats Thai month and year: "กรกฎาคม 2569"
 */
export function formatThaiMonthYear(year: number, monthIndex: number): string {
  const monthName = THAI_MONTHS_FULL[monthIndex] || '';
  const bYear = year + 543;
  return `${monthName} ${bYear}`;
}

export interface CalendarDayItem {
  dateString: string; // YYYY-MM-DD
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
}

/**
 * Generates a full month grid (with padding for start and end days)
 */
export function getDaysInMonthGrid(year: number, monthIndex: number): CalendarDayItem[] {
  const firstDayOfMonth = new Date(year, monthIndex, 1);
  const lastDayOfMonth = new Date(year, monthIndex + 1, 0);
  const totalDays = lastDayOfMonth.getDate();
  const startDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday

  const todayISO = getTodayISO();
  const grid: CalendarDayItem[] = [];

  // Previous month padding days
  const prevMonthLastDay = new Date(year, monthIndex, 0).getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const dayNum = prevMonthLastDay - i;
    const prevDate = new Date(year, monthIndex - 1, dayNum);
    grid.push({
      dateString: toISODateString(prevDate),
      dayNumber: dayNum,
      isCurrentMonth: false,
      isToday: toISODateString(prevDate) === todayISO,
    });
  }

  // Current month days
  for (let day = 1; day <= totalDays; day++) {
    const curDate = new Date(year, monthIndex, day);
    const dateStr = toISODateString(curDate);
    grid.push({
      dateString: dateStr,
      dayNumber: day,
      isCurrentMonth: true,
      isToday: dateStr === todayISO,
    });
  }

  // Next month padding days to complete 35 or 42 grid cells
  const remaining = (7 - (grid.length % 7)) % 7;
  for (let day = 1; day <= remaining; day++) {
    const nextDate = new Date(year, monthIndex + 1, day);
    grid.push({
      dateString: toISODateString(nextDate),
      dayNumber: day,
      isCurrentMonth: false,
      isToday: toISODateString(nextDate) === todayISO,
    });
  }

  return grid;
}

/**
 * Check if two time ranges overlap
 */
export function isTimeOverlapping(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  // Return true if ranges overlap: not (endA <= startB || startA >= endB)
  return !(endA <= startB || startA >= endB);
}

export const checkTimeOverlap = isTimeOverlapping;
