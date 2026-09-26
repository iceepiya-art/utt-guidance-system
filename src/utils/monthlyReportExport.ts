import * as XLSX from "xlsx";
import { THAI_MONTHS } from "./dateUtils";
import {
  MonthlyReportDataset,
  reportDateLabels,
  reportTeamLabel,
  reportWorkLabel,
} from "./monthlyReport";

export function monthlyReportTitle(data: MonthlyReportDataset) {
  return `ประจำเดือน ${THAI_MONTHS[data.filters.month - 1]} พ.ศ. ${data.filters.year + 543}`;
}
export function buildMonthlyReportWorkbook(data: MonthlyReportDataset) {
  const workbook = XLSX.utils.book_new();
  const days = [...new Set(data.rows.map(r => r.date))];
  const rows = [
    ["รายงานผลการปฏิบัติงานแนะแนว"],
    ["วิทยาลัยเทคโนโลยีอุตรดิตถ์"],
    [monthlyReportTitle(data)],
    [reportTeamLabel(data.filters.team), reportWorkLabel(data.filters.work)],
    [`รวมออกปฏิบัติงาน ${days.length} วัน ตามตัวกรองที่เลือก`],
    [
      "ลำดับวัน",
      "วัน",
      "วัน/เดือน/ปี",
      "ชื่อโรงเรียน",
      "สาย",
      "รถที่ใช้",
      "งานที่ปฏิบัติ",
      "อาจารย์แนะแนว",
    ],
    ...data.rows.map((r) => {
      const date = reportDateLabels(r.date);
      return [
        days.indexOf(r.date) + 1,
        date.weekday,
        date.date,
        r.schoolName,
        reportTeamLabel(r.team),
        r.vehicleName,
        r.activityLabel,
        r.responsiblePeople.map((p) => p.name).join("\n") || "ไม่ระบุ",
      ];
    }),
  ];
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet["!cols"] = [12, 14, 16, 36, 25, 25, 20, 45].map((wch) => ({ wch }));
  sheet["!autofilter"] = { ref: `A6:H${Math.max(6, rows.length)}` };
  XLSX.utils.book_append_sheet(workbook, sheet, "รายงานประจำเดือน");
  const summaries = [
    ...data.teams.map((t) => ({
      label: reportTeamLabel(t.team),
      summary: t.summary,
    })),
    { label: "รวมตามตัวกรอง", summary: data.summary },
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet([
    [monthlyReportTitle(data), reportWorkLabel(data.filters.work)],
    [
      "สาย",
      "ยื่นหนังสือ (รายการ)",
      "ออกแนะแนว (ทริป)",
      "โรงเรียนออกแนะแนว",
      "โรงเรียนไม่ซ้ำรวม",
      "ผู้รับผิดชอบ",
      "รายการที่ยังยืนยันโรงเรียนไม่ได้",
    ],
    ...summaries.map(({ label, summary: s }) => [
      label,
      s.submissions,
      s.trips,
      s.guidanceSchools,
      s.uniqueSchools,
      s.people.map((p) => p.name).join("\n") || "ไม่ระบุ",
      s.unresolvedSchools,
    ]),
    ["จำนวนโรงเรียนไม่ซ้ำนับเฉพาะรายการที่ยืนยันความเชื่อมโยงโรงเรียนได้"],
  ]);
  summarySheet["!cols"] = [25, 23, 23, 25, 25, 45, 38].map((wch) => ({ wch }));
  XLSX.utils.book_append_sheet(workbook, summarySheet, "สรุปผล");
  return workbook;
}
export function downloadMonthlyReport(data: MonthlyReportDataset) {
  XLSX.writeFile(
    buildMonthlyReportWorkbook(data),
    `รายงานแนะแนว_${data.filters.year + 543}-${String(data.filters.month).padStart(2, "0")}_${data.filters.team}_${data.filters.work}.xlsx`,
  );
}
