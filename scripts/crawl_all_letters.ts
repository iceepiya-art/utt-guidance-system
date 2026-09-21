import fs from 'fs';
import https from 'https';

// Read cookies.txt to get PHPSESSID
const cookieFile = fs.readFileSync('cookies.txt', 'utf8');
const sessMatch = cookieFile.match(/PHPSESSID\s+([a-zA-Z0-9]+)/);
const phpSessId = sessMatch ? sessMatch[1] : '';

console.log('Using PHPSESSID:', phpSessId);

// Read letter_data.html to get all edit links
const html = fs.readFileSync('letter_data.html', 'utf8');
const trRegex = /<tr class="texttable">([\s\S]*?)<\/tr>/g;
let match;
const items: { index: number; idGuide: string; editUrl: string }[] = [];

while ((match = trRegex.exec(html)) !== null) {
  const rowHtml = match[1];
  const editMatch = rowHtml.match(/href="letter_edit\.php\?id_guide=(\d+)"/);
  if (editMatch) {
    items.push({
      index: items.length + 1,
      idGuide: editMatch[1],
      editUrl: `https://www.utt.ac.th/guide/letter_edit.php?id_guide=${editMatch[1]}`,
    });
  }
}

console.log(`Found ${items.length} items to crawl`);

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

// Concurrency pool
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

        // Extract images
        const photos: { url: string; fileName: string }[] = [];
        const imgMatches = pageHtml.matchAll(/src="file_letter\/([^"]+)"/g);
        for (const m of imgMatches) {
          const fileName = m[1];
          if (!photos.some((p) => p.fileName === fileName)) {
            photos.push({
              fileName,
              url: `https://www.utt.ac.th/guide/file_letter/${fileName}`,
            });
          }
        }
        // Also check value="file_letter/..." or old_img
        const inputMatches = pageHtml.matchAll(/value="([^"]+\.(jpe?g|png|gif))"/gi);
        for (const m of inputMatches) {
          let fileName = m[1].replace('file_letter/', '');
          if (!photos.some((p) => p.fileName === fileName)) {
            photos.push({
              fileName,
              url: `https://www.utt.ac.th/guide/file_letter/${fileName}`,
            });
          }
        }

        // Extract fields
        const sNameMatch = pageHtml.match(/name="s_name"[^>]*value="([^"]*)"/);
        const letterNumMatch = pageHtml.match(/name="letter_number"[^>]*value="([^"]*)"/);
        const dateMatch = pageHtml.match(/name="submission_date"[^>]*value="([^"]*)"/);
        const statusMatch = pageHtml.match(/name="status"[\s\S]*?<option[^>]*selected[^>]*>([^<]+)<\/option>/);
        const status1Match = pageHtml.match(/name="status1"[^>]*>([\s\S]*?)<\/textarea>/);
        const guideMatch = pageHtml.match(/name="s_guide"[\s\S]*?<option[^>]*selected[^>]*>([^<]+)<\/option>/);
        const lineMatch = pageHtml.match(/name="lines_guide"[\s\S]*?<option[^>]*selected[^>]*>([^<]+)<\/option>/);
        const noteMatch = pageHtml.match(/name="note_letter"[^>]*value="([^"]*)"/);

        const rawDate = dateMatch ? dateMatch[1].trim() : '';
        let submissionDate = '';
        let submissionTime = '';
        if (rawDate) {
          // "2026-09-18 12:56:00"
          const parts = rawDate.split(' ');
          submissionDate = parts[0];
          if (parts[1]) {
            submissionTime = parts[1].substring(0, 5);
          }
        }

        const schoolName = sNameMatch ? sNameMatch[1].trim() : '';
        const lineVal = lineMatch ? lineMatch[1].trim() : '1';
        const teamId = lineVal === '2' ? 'team2' : 'team1';

        results.push({
          idGuide: item.idGuide,
          schoolName,
          documentNumber: letterNumMatch ? letterNumMatch[1].trim() : '',
          submissionDate,
          submissionTime,
          status: statusMatch ? statusMatch[1].trim() : '',
          statusDetail: status1Match ? status1Match[1].trim() : '',
          counselor: guideMatch ? guideMatch[1].trim() : '',
          teamId,
          note: noteMatch ? noteMatch[1].trim() : '',
          photos,
          rawUrl: item.editUrl,
        });

        if (results.length % 20 === 0 || results.length === items.length) {
          console.log(`Crawled ${results.length}/${items.length} items (found ${photos.length} photos in this item)`);
        }
      } catch (err: any) {
        console.error(`Failed ${item.idGuide}:`, err.message);
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  // Filter out invalid items
  const valid = results.filter((r) => r.schoolName && r.submissionDate && !r.submissionDate.startsWith('0000'));
  console.log(`Total successfully crawled and valid: ${valid.length}`);
  const totalPhotos = valid.reduce((sum, r) => sum + r.photos.length, 0);
  console.log(`Total photos found across all letters: ${totalPhotos}`);

  fs.writeFileSync('public/utt_full_letters_with_photos.json', JSON.stringify(valid, null, 2), 'utf8');
  console.log('Saved to public/utt_full_letters_with_photos.json');
}

crawlAll().catch(console.error);
