import * as XLSX from 'xlsx';
import { School, FieldTrip, DocumentSubmission, TeamId } from '../types';
import { formatThaiShortDate, getThaiDayOfWeek, THAI_MONTHS_FULL } from './dateUtils';

interface ExportReportParams {
  trips: FieldTrip[];
  monthIndex: number; // 0-11
  academicYear: string; // e.g. "2569"
  teamId: TeamId;
  teamName: string; // e.g. "อุตรดิตถ์"
}

export function exportMonthlyReportToExcel(
  paramsOrSchools: ExportReportParams | School[],
  tripsParam?: FieldTrip[],
  submissionsParam?: DocumentSubmission[],
  monthLabel?: string
) {
  let trips: FieldTrip[] = [];
  let monthName = monthLabel || 'ประจำเดือน';
  let title = 'แบบเบิกจ่ายเงินการปฏิบัติหน้าที่งานแนะแนวภายนอก';
  let subTitle = `วิทยาลัยเทคโนโลยีอุตรดิตถ์ (${monthName})`;

  if ('trips' in paramsOrSchools) {
    const params = paramsOrSchools as ExportReportParams;
    trips = params.trips.filter((t) => t.teamId === params.teamId);
    monthName = THAI_MONTHS_FULL[params.monthIndex] || 'ประจำเดือน';
    title = `แบบเบิกจ่ายเงินการปฏิบัติหน้าที่งานแนะแนวภายนอก`;
    subTitle = `ประจำเดือน ${monthName} ปีการศึกษา ${params.academicYear} (${params.teamName})`;
  } else {
    trips = tripsParam || [];
  }

  // Build rows data
  const excelData: (string | number)[][] = [
    [title],
    [subTitle],
    ['วิทยาลัยเทคโนโลยีอุตรดิตถ์ (Uttaradit Technological College)'],
    [],
    [
      'ลำดับ',
      'วัน',
      'วัน/เดือน/ปี',
      'ชื่อโรงเรียน',
      'สายงาน',
      'รถที่ใช้',
      'งานที่ปฏิบัติ',
      'อ.แนะแนว',
      'จำนวน นร.',
      'รูปกิจกรรม',
      'หมายเหตุ/สรุปผล',
      'รายละเอียดเพิ่มเติม',
      'เบี้ยเลี้ยง (บาท)',
      'ค่าอาหาร (บาท)',
    ],
  ];

  let rowIndex = 1;

  if (trips.length === 0) {
    excelData.push(['-', '-', '-', 'ไม่มีรายการปฏิบัติงานในเดือนนี้', '-', '-', '-', '-', 0, '-', '', '', '', '']);
  } else {
    trips.forEach((trip) => {
      const dayName = getThaiDayOfWeek(trip.date);
      const thaiDate = formatThaiShortDate(trip.date);
      const teamLabel = trip.teamId === 'team1' ? 'อุตรดิตถ์' : 'สุโขทัย';
      const vehicle = trip.vehicleName || '-';
      const workType = trip.workType || 'ออกแนะแนว';
      const counselor = trip.counselorName || '-';
      const summary = trip.summary || trip.note || '';
      const details = trip.issues || '';
      const photoSummary = trip.photos?.length
        ? `${trip.photos.length} รูป: ${trip.photos.map((photo) => photo.url).join(' | ')}`
        : '-';

      if (!trip.schools || trip.schools.length === 0) {
        excelData.push([
          rowIndex++,
          dayName,
          thaiDate,
          'ไม่ได้ระบุโรงเรียน',
          teamLabel,
          vehicle,
          workType,
          counselor,
          0,
          photoSummary,
          summary,
          details,
          '',
          '',
        ]);
      } else {
        trip.schools.forEach((sch, sIdx) => {
          excelData.push([
            sIdx === 0 ? rowIndex++ : '',
            sIdx === 0 ? dayName : '',
            sIdx === 0 ? thaiDate : '',
            sch.schoolName,
            sIdx === 0 ? teamLabel : '',
            sIdx === 0 ? vehicle : '',
            sIdx === 0 ? workType : '',
            sIdx === 0 ? counselor : '',
            sch.studentCount || 0,
            sIdx === 0 ? photoSummary : '',
            sIdx === 0 ? summary : '',
            sIdx === 0 ? details : '',
            '',
            '',
          ]);
        });
      }
    });
  }

  // Summary and signature rows
  excelData.push([]);
  excelData.push(['', '', '', '', '', '', '', 'ลงชื่อ..................................................ผู้รายงาน']);
  excelData.push(['', '', '', '', '', '', '', '     (..................................................)']);
  excelData.push(['', '', '', '', '', '', '', '     ตำแหน่ง อาจารย์แนะแนวการศึกษา']);

  const worksheet = XLSX.utils.aoa_to_sheet(excelData);

  worksheet['!cols'] = [
    { wch: 8 },  // ลำดับ
    { wch: 10 }, // วัน
    { wch: 14 }, // วัน/เดือน/ปี
    { wch: 32 }, // ชื่อโรงเรียน
    { wch: 16 }, // สายงาน
    { wch: 20 }, // รถที่ใช้
    { wch: 20 }, // งานที่ปฏิบัติ
    { wch: 22 }, // อ.แนะแนว
    { wch: 12 }, // จำนวน นร.
    { wch: 42 }, // รูปกิจกรรม
    { wch: 30 }, // หมายเหตุ
    { wch: 30 }, // รายละเอียดเพิ่มเติม
    { wch: 14 }, // เบี้ยเลี้ยง
    { wch: 14 }, // ค่าอาหาร
  ];

  const workbook = XLSX.utils.book_new();
  const safeSheetName = `รายงาน_${monthName}`.slice(0, 31).replace(/[\\/?*:[\]]/g, '_');
  XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName);
  if (submissionsParam) {
    const submissionRows = [
      ['วันที่ยื่น', 'เวลา', 'โรงเรียน', 'สายงาน', 'เลขที่หนังสือ', 'อาจารย์ผู้ยื่น', 'สถานะ', 'หมายเหตุ', 'ลักษณะการไปโรงเรียน', 'ยานพาหนะ'],
      ...submissionsParam.map(s => [s.submissionDate, s.submissionTime, s.schoolName,
        s.teamId === 'team1' ? 'อุตรดิตถ์' : 'สุโขทัย', s.documentNumber,
        s.submittedByNames?.length ? s.submittedByNames.join(', ') : s.submittedByName,
        s.status, s.note || '', s.sameDayGuidance ? 'ยื่นหนังสือ + แนะแนว' : 'ยื่นหนังสือ', s.vehicleName || 'ไม่ระบุ'])
    ];
    const submissionSheet = XLSX.utils.aoa_to_sheet(submissionRows);
    submissionSheet['!cols'] = [14, 10, 35, 18, 24, 60, 24, 40, 30, 30].map(wch => ({ wch }));
    XLSX.utils.book_append_sheet(workbook, submissionSheet, 'สรุปการยื่นหนังสือ');
  }


  const filename = `รายงานแนะแนว_${monthName}.xlsx`.replace(/[\\/?*:[\]]/g, '_');
  XLSX.writeFile(workbook, filename);
}

export function exportSchoolsToExcel(schools: School[]) {
  const statusLabels: Record<string, string> = {
    NOT_STARTED: 'ยังไม่ดำเนินการ',
    DOCUMENT_SUBMITTED: 'ยื่นหนังสือแล้ว',
    WAITING_CONTACT: 'รอติดต่อกลับ',
    WAITING_APPOINTMENT: 'รอนัดหมาย',
    APPOINTED: 'นัดหมายแล้ว',
    GUIDANCE_COMPLETED: 'ออกแนะแนวแล้ว',
    CANCELLED: 'ยกเลิก',
  };

  const excelData: (string | number)[][] = [
    ['รายชื่อโรงเรียนเป้าหมายงานแนะแนวการศึกษา'],
    ['วิทยาลัยเทคโนโลยีอุตรดิตถ์ (Uttaradit Technological College)'],
    [],
    [
      'ลำดับ',
      'รหัส',
      'ชื่อโรงเรียน',
      'ระดับชั้น',
      'นร. ม.3 (คน)',
      'นร. ม.6 (คน)',
      'เบอร์โทรโรงเรียน',
      'ครูแนะแนว/ผู้ประสาน',
      'ตำแหน่ง',
      'เบอร์โทรครูแนะแนว',
      'LINE ID',
      'อำเภอ',
      'จังหวัด',
      'สายปฏิบัติงาน',
      'สถานะปัจจุบัน',
      'หมายเหตุ',
    ],
  ];

  schools.forEach((s, idx) => {
    excelData.push([
      idx + 1,
      s.schoolId || `SCH-${idx + 1}`,
      s.schoolName,
      s.educationLevels || 'ม.1 - ม.3',
      s.studentM3 || 0,
      s.studentM6 || 0,
      s.schoolPhone || '-',
      s.teacherName || '-',
      s.teacherPosition || '-',
      s.teacherPhone || '-',
      s.teacherLine || '-',
      s.district || '-',
      s.province || 'อุตรดิตถ์',
      s.teamId === 'team1' ? 'อุตรดิตถ์' : 'สุโขทัย',
      statusLabels[s.currentStatus] || s.currentStatus,
      s.note || '',
    ]);
  });

  const worksheet = XLSX.utils.aoa_to_sheet(excelData);
  worksheet['!cols'] = [
    { wch: 8 },
    { wch: 12 },
    { wch: 34 },
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
    { wch: 16 },
    { wch: 22 },
    { wch: 18 },
    { wch: 16 },
    { wch: 14 },
    { wch: 16 },
    { wch: 12 },
    { wch: 16 },
    { wch: 16 },
    { wch: 24 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'รายชื่อโรงเรียนเป้าหมาย');
  XLSX.writeFile(workbook, 'รายชื่อโรงเรียนเป้าหมาย_วท_อต.xlsx');
}
