import fs from 'fs';
import path from 'path';
import https from 'https';

const source = JSON.parse(fs.readFileSync('backup/utt-source-2026-09-26.json', 'utf8'));
const existing = JSON.parse(fs.readFileSync('public/utt_full_letters_with_photos.json', 'utf8'));
const existingIds = new Set(existing.map(x => x.idGuide));

const lettersDir = path.join(process.cwd(), 'public/photos/letters');
fs.mkdirSync(lettersDir, { recursive: true });

function downloadFile(url, destPath) {
  return new Promise((resolve) => {
    if (fs.existsSync(destPath) && fs.statSync(destPath).size > 500) {
      return resolve(true);
    }
    const file = fs.createWriteStream(destPath);
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode !== 200) {
        file.close();
        if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
        return resolve(false);
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(true);
      });
    });
    req.on('error', () => {
      file.close();
      if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
      resolve(false);
    });
    req.setTimeout(20000, () => {
      req.destroy();
      file.close();
      if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
      resolve(false);
    });
  });
}

async function main() {
  const missing = source.letters.filter(l => !existingIds.has(l.idGuide) && l.fields?.submission_date && !l.fields.submission_date.startsWith('0000'));
  console.log(`Found ${missing.length} missing letters to add.`);

  const newItems = [];

  for (const item of missing) {
    const fields = item.fields || {};
    const idGuide = item.idGuide;
    const rawDate = fields.submission_date || '';
    const [subDate, subTime] = rawDate.split(' ');
    const docNumber = fields.letter_number || '';
    const counselor = (fields.s_guide?.value || fields.s_guide || 'อ.ประชา').trim();
    const teamNum = fields.lines_guide?.value || fields.lines_guide || (counselor.includes('ปิยะ') ? '2' : '1');
    const teamId = teamNum === '2' ? 'team2' : 'team1';
    const note = fields.note_letter || 'ยื่นหนังสือแนะแนว';
    const rawStatus = fields.status?.value || fields.status || 'อื่นๆ';

    let status = 'OTHER_ACTIVITY';
    if (rawStatus === 'นัดหมาย') status = 'WAITING_APPOINTMENT';
    else if (rawStatus === 'ไม่ได้แนะแนว') status = 'NOT_READY';

    // Photos
    const photos = [];
    const photoUrls = item.photos || [];
    for (let pIdx = 0; pIdx < photoUrls.length; pIdx++) {
      const url = photoUrls[pIdx];
      const fileName = url.split('/').pop() || `letter_${idGuide}_${pIdx + 1}.jpg`;
      const destPath = path.join(lettersDir, fileName);
      console.log(`Downloading photo for idGuide ${idGuide}: ${fileName}...`);
      const ok = await downloadFile(url, destPath);
      photos.push({
        id: `utt_photo_${idGuide}_${pIdx + 1}`,
        url: ok ? `/photos/letters/${fileName}` : url,
        fileName,
        uploadedAt: subDate ? `${subDate}T${subTime || '09:00:00'}.000Z` : new Date().toISOString()
      });
    }

    const submittedByNames = counselor.split(/[,/]/).map(s => s.trim()).filter(Boolean);

    newItems.push({
      idGuide,
      schoolName: fields.s_name || '',
      documentNumber: docNumber,
      submissionDate: subDate,
      submissionTime: subTime ? subTime.slice(0, 5) : '',
      status,
      statusDetail: fields.status1 || '',
      counselor,
      teamId,
      note,
      photos,
      rawUrl: item.sourceUrl || `https://www.utt.ac.th/guide/letter_edit.php?id_guide=${idGuide}`,
      otherActivityDetails: status === 'OTHER_ACTIVITY' ? (fields.status1 || note || 'ยื่นหนังสือแนะแนว') : undefined,
      submittedByName: counselor,
      submittedByNames,
      academicYear: '2569'
    });
  }

  const combined = [...existing, ...newItems];
  combined.sort((a, b) => (b.submissionDate || '').localeCompare(a.submissionDate || '') || Number(b.idGuide) - Number(a.idGuide));

  fs.writeFileSync('public/utt_full_letters_with_photos.json', JSON.stringify(combined, null, 2), 'utf8');
  console.log(`Done! Total items in public/utt_full_letters_with_photos.json: ${combined.length} (added ${newItems.length})`);
}

main().catch(console.error);
