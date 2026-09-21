import fs from 'fs';
import * as XLSX from 'xlsx';

const html = fs.readFileSync('letter_data.html', 'utf8');

const rows = [];
const trRegex = /<tr class="texttable">([\s\S]*?)<\/tr>/g;
let match;
while ((match = trRegex.exec(html)) !== null) {
  const rowHtml = match[1];
  const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/g;
  const cells = [];
  let tdMatch;
  while ((tdMatch = tdRegex.exec(rowHtml)) !== null) {
    const linkMatch = tdMatch[1].match(/href="([^"]+)"/);
    const link = linkMatch ? linkMatch[1] : null;
    const text = tdMatch[1].replace(/<[^>]+>/g, '').trim().replace(/\s+/g, ' ');
    cells.push({ text, link });
  }
  if (cells.length >= 8) {
    rows.push({
      index: cells[0]?.text,
      schoolName: cells[1]?.text,
      docNumber: cells[2]?.text,
      dateText: cells[3]?.text,
      status: cells[4]?.text,
      status1: cells[5]?.text,
      counselor: cells[6]?.text,
      note: cells[7]?.text,
      editLink: cells[8]?.link,
    });
  }
}

const validRows = rows.filter(r => r.schoolName && r.schoolName.trim().length > 0 && r.dateText && !r.dateText.startsWith('00/00/0000'));
console.log('Total valid rows:', validRows.length);

const formatted = validRows.map((r, i) => {
  const dateMatch = r.dateText.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}:\d{2})/);
  let submissionDate = '';
  let submissionTime = '';
  if (dateMatch) {
    const [, dd, mm, yyyy, time] = dateMatch;
    submissionDate = `${yyyy}-${mm}-${dd}`;
    submissionTime = time;
  } else {
    submissionDate = r.dateText.substring(0, 10);
  }

  // Determine team
  const teamId = (r.counselor && r.counselor.includes('ปิยะ')) ? 'team2' : 'team1';

  // Map status
  let mappedStatus = 'DOCUMENT_SUBMITTED';
  if (r.status === 'นัดหมาย') {
    mappedStatus = 'WAITING_APPOINTMENT';
  } else if (r.status === 'อื่นๆ') {
    mappedStatus = 'OTHER_ACTIVITY';
  }

  return {
    ลำดับ: i + 1,
    ชื่อโรงเรียน: r.schoolName.trim(),
    เลขที่หนังสือ: r.docNumber || '-',
    วันที่ยื่น: submissionDate,
    เวลา: submissionTime,
    สาย: teamId === 'team1' ? 'อุตรดิตถ์ (สาย 1)' : 'สุโขทัย (สาย 2)',
    ผู้ออกแนะแนว: r.counselor || 'อ.ประชา',
    สถานะ: r.status || 'ยื่นหนังสือแล้ว',
    หมายเหตุ: r.note || '',
    ลิงก์แก้ไขเดิม: r.editLink ? `https://www.utt.ac.th/guide/${r.editLink}` : '',
  };
});

fs.writeFileSync('public/utt_letters.json', JSON.stringify(formatted, null, 2), 'utf8');

// Also create an Excel sheet
const ws = XLSX.utils.json_to_sheet(formatted);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'ข้อมูลการยื่นหนังสือ 2569');
const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
fs.writeFileSync('public/utt_letters.xlsx', buf);

console.log('Successfully saved to public/utt_letters.json and public/utt_letters.xlsx');
console.log('Summary of months in data:');
const monthsCount = {};
formatted.forEach(f => {
  const m = f.วันที่ยื่น.substring(0, 7);
  monthsCount[m] = (monthsCount[m] || 0) + 1;
});
console.log(monthsCount);
