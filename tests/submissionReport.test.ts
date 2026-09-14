import { expect, it, vi } from 'vitest';
import * as XLSX from 'xlsx';
import { exportMonthlyReportToExcel } from '../src/utils/excelExport';
import type { DocumentSubmission } from '../src/types';
vi.mock('xlsx', async importOriginal => ({ ...await importOriginal<typeof import('xlsx')>(), writeFile: vi.fn() }));
it('exports every submitter and retains names on legacy submissions', () => {
  const base = { submissionDate: '2026-09-14', submissionTime: '10:00', schoolName: 'โรงเรียนทดสอบ', teamId: 'team1', documentNumber: '123', status: 'DOCUMENT_SUBMITTED' };
  exportMonthlyReportToExcel([], [], [
    { ...base, submittedByName: 'old display', submittedByNames: ['อาจารย์ ก', 'อาจารย์ ข'] },
    { ...base, submittedByName: 'อาจารย์ ค' },
  ] as DocumentSubmission[], 'กันยายน 2569');
  const workbook = vi.mocked(XLSX.writeFile).mock.calls[0][0];
  const rows = XLSX.utils.sheet_to_json<string[]>(workbook.Sheets['สรุปการยื่นหนังสือ'], { header: 1 });
  expect(rows[1][5]).toBe('อาจารย์ ก, อาจารย์ ข');
  expect(rows[2][5]).toBe('อาจารย์ ค');
  expect(rows).toHaveLength(3);
});
