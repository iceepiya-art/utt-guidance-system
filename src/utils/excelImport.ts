import * as XLSX from 'xlsx';
import { School, TeamId } from '../types';

export interface ParsedSchoolRow {
  schoolName: string;
  schoolId?: string;
  educationLevels?: string;
  studentM3?: number;
  studentM6?: number;
  schoolPhone?: string;
  teacherName?: string;
  teacherPosition?: string;
  teacherPhone?: string;
  teacherLine?: string;
  preferredContactTime?: string;
  district?: string;
  province?: string;
  teamId?: TeamId;
  note?: string;
  isValid: boolean;
  validationError?: string;
}

// Helper: auto-detect team by district in Uttaradit
export function detectTeamByDistrict(district: string = ''): TeamId {
  const d = district.trim().toLowerCase();
  if (
    d.includes('ท่าปลา') ||
    d.includes('น้ำปาด') ||
    d.includes('ฟากท่า') ||
    d.includes('บ้านโคก') ||
    d.includes('ทองแสนขัน')
  ) {
    return 'team2';
  }
  // Default to team1: เมืองอุตรดิตถ์, ลับแล, ตรอน, พิชัย
  return 'team1';
}

function cleanString(val: any): string {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

function cleanNumber(val: any): number {
  if (val === null || val === undefined) return 0;
  const num = parseInt(String(val).replace(/[^0-9]/g, ''), 10);
  return isNaN(num) ? 0 : num;
}

export async function parseSchoolsExcel(file: File): Promise<ParsedSchoolRow[]> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  
  if (!workbook.SheetNames.length) {
    throw new Error('ไม่พบแผ่นงาน (Sheet) ในไฟล์ Excel');
  }

  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  if (rows.length === 0) {
    throw new Error('ไม่พบข้อมูลในไฟล์ Excel หรือไฟล์ว่างเปล่า');
  }

  const parsed: ParsedSchoolRow[] = [];

  rows.forEach((row, index) => {
    // Flexible header lookup
    const findValue = (...keys: string[]): any => {
      for (const k of keys) {
        for (const rowKey of Object.keys(row)) {
          if (rowKey.trim().toLowerCase() === k.trim().toLowerCase()) {
            return row[rowKey];
          }
        }
      }
      return '';
    };

    const schoolName = cleanString(findValue('ชื่อโรงเรียน', 'โรงเรียน', 'schoolName', 'school_name', 'name'));
    const schoolId = cleanString(findValue('รหัสโรงเรียน', 'รหัส', 'schoolId', 'code')) || `SCH-${String(index + 1).padStart(3, '0')}`;
    const district = cleanString(findValue('อำเภอ', 'district', 'District')) || 'เมืองอุตรดิตถ์';
    const province = cleanString(findValue('จังหวัด', 'province', 'Province')) || 'อุตรดิตถ์';
    const educationLevels = cleanString(findValue('ระดับชั้น', 'ช่วงชั้น', 'educationLevels')) || 'ม.1 - ม.3';
    const studentM3 = cleanNumber(findValue('นักเรียน ม.3', 'นร. ม.3', 'ม.3', 'studentM3', 'm3'));
    const studentM6 = cleanNumber(findValue('นักเรียน ม.6', 'นร. ม.6', 'ม.6', 'studentM6', 'm6'));
    const schoolPhone = cleanString(findValue('เบอร์โรงเรียน', 'โทรศัพท์โรงเรียน', 'เบอร์โทร', 'schoolPhone', 'phone'));
    const teacherName = cleanString(findValue('ครูแนะแนว', 'ชื่อครู', 'ผู้ประสานงาน', 'teacherName'));
    const teacherPosition = cleanString(findValue('ตำแหน่ง', 'teacherPosition')) || 'ครูแนะแนว';
    const teacherPhone = cleanString(findValue('เบอร์ครู', 'เบอร์โทรครู', 'โทรศัพท์ครู', 'teacherPhone'));
    const teacherLine = cleanString(findValue('Line ID', 'Line', 'ไลน์', 'teacherLine'));
    const note = cleanString(findValue('หมายเหตุ', 'note', 'remarks'));

    let teamId: TeamId = detectTeamByDistrict(district);
    const rawTeam = cleanString(findValue('สายงาน', 'สายที่', 'ทีม', 'teamId', 'team'));
    if (rawTeam.includes('2') || rawTeam.toLowerCase().includes('team2')) {
      teamId = 'team2';
    } else if (rawTeam.includes('1') || rawTeam.toLowerCase().includes('team1')) {
      teamId = 'team1';
    }

    const isValid = Boolean(schoolName && schoolName.length >= 3);
    const validationError = !schoolName
      ? 'ไม่พบชื่อโรงเรียน'
      : schoolName.length < 3
      ? 'ชื่อโรงเรียนสั้นเกินไป'
      : undefined;

    parsed.push({
      schoolName,
      schoolId,
      educationLevels,
      studentM3,
      studentM6,
      schoolPhone,
      teacherName,
      teacherPosition,
      teacherPhone,
      teacherLine,
      district,
      province,
      teamId,
      note,
      isValid,
      validationError,
    });
  });

  return parsed;
}

export function generateSchoolsTemplateExcel(): void {
  const templateRows = [
    {
      'รหัสโรงเรียน': 'SCH-001',
      'ชื่อโรงเรียน': 'โรงเรียนอุตรดิตถ์ดรุณี',
      'ระดับชั้น': 'ม.1 - ม.6',
      'อำเภอ': 'เมืองอุตรดิตถ์',
      'จังหวัด': 'อุตรดิตถ์',
      'สายงาน': 'สายที่ 1',
      'นักเรียน ม.3': 450,
      'นักเรียน ม.6': 420,
      'เบอร์โรงเรียน': '055-411-123',
      'ครูแนะแนว': 'ครูสมศรี นามสมมติ',
      'ตำแหน่ง': 'หัวหน้างานแนะแนว',
      'เบอร์ครู': '081-234-5678',
      'Line ID': 'somsri_guide',
      'หมายเหตุ': 'โรงเรียนขนาดใหญ่พิเศษ',
    },
    {
      'รหัสโรงเรียน': 'SCH-002',
      'ชื่อโรงเรียน': 'โรงเรียนน้ำปาดชนูปถัมภ์',
      'ระดับชั้น': 'ม.1 - ม.6',
      'อำเภอ': 'น้ำปาด',
      'จังหวัด': 'อุตรดิตถ์',
      'สายงาน': 'สายที่ 2',
      'นักเรียน ม.3': 180,
      'นักเรียน ม.6': 150,
      'เบอร์โรงเรียน': '055-431-234',
      'ครูแนะแนว': 'ครูประสิทธิ์ มุ่งมั่น',
      'ตำแหน่ง': 'ครูแนะแนว',
      'เบอร์ครู': '089-987-6543',
      'Line ID': 'prasit_guide',
      'หมายเหตุ': 'โซนสาย 2 รอบนอก',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(templateRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'รายชื่อโรงเรียนเป้าหมาย');
  XLSX.writeFile(wb, 'แบบฟอร์มนำเข้าข้อมูลโรงเรียน_UTT.xlsx');
}
