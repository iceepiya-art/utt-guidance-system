import fs from 'fs';

const raw = JSON.parse(fs.readFileSync('public/utt_full_letters_with_photos.json', 'utf8'));

const enriched = raw.map((item: any, i: number) => {
  const photos = (item.photos || []).map((p: any, pIdx: number) => ({
    id: `utt_photo_${item.idGuide}_${pIdx + 1}`,
    url: p.url,
    fileName: p.fileName || `letter_proof_${item.idGuide}.jpg`,
    uploadedAt: item.submissionDate ? `${item.submissionDate}T${item.submissionTime || '09:00'}:00.000Z` : new Date().toISOString(),
  }));

  // Map status
  let status = 'WAITING_APPOINTMENT';
  if (item.status === 'อื่นๆ') {
    status = 'OTHER_ACTIVITY';
  } else if (item.status === 'ไม่ได้แนะแนว') {
    status = 'NOT_READY';
  } else if (item.status === 'นัดหมาย') {
    status = 'WAITING_APPOINTMENT';
  }

  // Counselors array
  const counselor = item.counselor || 'อ.ประชา';
  const submittedByNames = counselor.split(/[,/]/).map((s: string) => s.trim()).filter(Boolean);

  return {
    ...item,
    status,
    otherActivityDetails: item.statusDetail || (status === 'OTHER_ACTIVITY' ? 'ยื่นหนังสือแนะแนว' : undefined),
    submittedByName: counselor,
    submittedByNames,
    academicYear: '2569',
    photos,
  };
});

fs.writeFileSync('public/utt_full_letters_with_photos.json', JSON.stringify(enriched, null, 2), 'utf8');
console.log(`Enriched ${enriched.length} items with proper PhotoItem structure and status.`);
