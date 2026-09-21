import fs from 'fs';
import https from 'https';

const cookieFile = fs.readFileSync('cookies.txt', 'utf8');
const sessMatch = cookieFile.match(/PHPSESSID\s+([a-zA-Z0-9]+)/);
const phpSessId = sessMatch ? sessMatch[1] : '';

console.log('Using PHPSESSID:', phpSessId);

const html = fs.readFileSync('guidance_table_data.html', 'utf8');
const trRegex = /<tr class="texttable">([\s\S]*?)<\/tr>/g;
let match;
const items: { index: number; idGuide: string; editUrl: string }[] = [];

while ((match = trRegex.exec(html)) !== null) {
  const rowHtml = match[1];
  const editMatch = rowHtml.match(/href="guidance_edit\.php\?id_guide=(\d+)"/);
  if (editMatch) {
    items.push({
      index: items.length + 1,
      idGuide: editMatch[1],
      editUrl: `https://www.utt.ac.th/guide/guidance_edit.php?id_guide=${editMatch[1]}`,
    });
  }
}

console.log(`Found ${items.length} guidance appointment items to crawl`);

function fetchPage(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          Cookie: `PHPSESSID=${phpSessId}`,
          'User-Agent': 'Mozilla/5.0',
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve(data));
      }
    );
    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}

async function crawlAll() {
  const results: any[] = [];
  const concurrency = 8;
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const idx = cursor++;
      const item = items[idx];
      try {
        const pageHtml = await fetchPage(item.editUrl);

        // Extract photos from <img> and input values
        const photos: { id: string; url: string; fileName: string; uploadedAt: string }[] = [];
        const imgMatches = pageHtml.matchAll(/src="file_guidance\/([^"]+)"/g);
        for (const m of imgMatches) {
          const fileName = m[1];
          if (!photos.some((p) => p.fileName === fileName)) {
            photos.push({
              id: `utt_appt_photo_${item.idGuide}_${photos.length + 1}`,
              fileName,
              url: `https://www.utt.ac.th/guide/file_guidance/${fileName}`,
              uploadedAt: new Date().toISOString(),
            });
          }
        }
        // Also check input value="file_guidance/..." or old_img
        const inputMatches = pageHtml.matchAll(/value="([^"]+\.(jpe?g|png|gif))"/gi);
        for (const m of inputMatches) {
          let fileName = m[1].replace('file_guidance/', '');
          if (!photos.some((p) => p.fileName === fileName)) {
            photos.push({
              id: `utt_appt_photo_${item.idGuide}_${photos.length + 1}`,
              fileName,
              url: `https://www.utt.ac.th/guide/file_guidance/${fileName}`,
              uploadedAt: new Date().toISOString(),
            });
          }
        }

        // Form fields
        const sNameMatch = pageHtml.match(/name="s_name"[^>]*value="([^"]*)"/);
        const dateMatch = pageHtml.match(/name="guidance_date"[^>]*value="([^"]*)"/);
        const guideMatch = pageHtml.match(/name="s_guide1"[\s\S]*?<option[^>]*selected[^>]*>([^<]+)<\/option>/);
        const lineMatch = pageHtml.match(/name="line1"[\s\S]*?<option[^>]*selected[^>]*>([^<]+)<\/option>/);
        const statusMatch = pageHtml.match(/name="guidance_status"[\s\S]*?<option[^>]*selected[^>]*>([^<]+)<\/option>/);
        const noteMatch = pageHtml.match(/name="note_letter1"[^>]*value="([^"]*)"/);

        const rawDate = dateMatch ? dateMatch[1].trim() : '';
        let date = '';
        let time = '';
        if (rawDate) {
          const parts = rawDate.split(' ');
          date = parts[0];
          if (parts[1]) {
            time = parts[1].substring(0, 5);
          }
        }

        const schoolName = sNameMatch ? sNameMatch[1].trim() : '';
        const lineVal = lineMatch ? lineMatch[1].trim() : '1';
        const teamId = lineVal === '2' ? 'team2' : 'team1';
        const counselor = guideMatch ? guideMatch[1].trim() : 'อ.ประชา';
        const rawStatus = statusMatch ? statusMatch[1].trim() : 'นัดหมาย';

        // Map status
        let status = 'CONFIRMED';
        if (rawStatus === 'แนะแนวปกติ' || rawStatus === 'แนะแนวแล้ว') {
          status = 'COMPLETED';
        } else if (rawStatus === 'ไม่ได้แนะแนว') {
          status = 'CANCELLED';
        }

        results.push({
          idGuide: item.idGuide,
          schoolName,
          date,
          time: time || '09:00',
          teamId,
          counselorName: counselor,
          status,
          rawStatus,
          note: noteMatch ? noteMatch[1].trim() : '',
          photos,
          academicYear: '2569',
          rawUrl: item.editUrl,
        });

        if (results.length % 20 === 0 || results.length === items.length) {
          console.log(`Crawled ${results.length}/${items.length} appointment items (photos in this item: ${photos.length})`);
        }
      } catch (err: any) {
        console.error(`Failed appointment ${item.idGuide}:`, err.message);
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  // Filter valid items
  const valid = results.filter((r) => r.schoolName && r.date && !r.date.startsWith('0000'));
  console.log(`Total successfully crawled valid appointments: ${valid.length}`);
  const totalPhotos = valid.reduce((sum, r) => sum + r.photos.length, 0);
  console.log(`Total photos found in guidance appointments: ${totalPhotos}`);

  fs.writeFileSync('public/utt_full_guidance_appointments_with_photos.json', JSON.stringify(valid, null, 2), 'utf8');
  console.log('Saved to public/utt_full_guidance_appointments_with_photos.json');

  // Month breakdown
  const months: Record<string, number> = {};
  valid.forEach((v) => {
    const m = v.date.substring(0, 7);
    months[m] = (months[m] || 0) + 1;
  });
  console.log('Appointment Months breakdown:', months);
}

crawlAll().catch(console.error);
