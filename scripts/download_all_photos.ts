import fs from 'fs';
import path from 'path';
import https from 'https';

const lettersData = JSON.parse(fs.readFileSync('public/utt_full_letters_with_photos.json', 'utf8'));
const apptsData = JSON.parse(fs.readFileSync('public/utt_full_guidance_appointments_with_photos.json', 'utf8'));

const lettersDir = path.join(process.cwd(), 'public/photos/letters');
const guidanceDir = path.join(process.cwd(), 'public/photos/guidance');

fs.mkdirSync(lettersDir, { recursive: true });
fs.mkdirSync(guidanceDir, { recursive: true });

function downloadFile(url: string, destPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (fs.existsSync(destPath) && fs.statSync(destPath).size > 500) {
      // Already downloaded
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
    req.on('error', (err) => {
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
  console.log('Downloading all photos locally into public/photos/...');

  // 1. Download letter photos
  let letterSuccess = 0;
  let letterFail = 0;
  for (let i = 0; i < lettersData.length; i++) {
    const item = lettersData[i];
    for (let p = 0; p < item.photos.length; p++) {
      const photo = item.photos[p];
      const destName = photo.fileName || `letter_${item.idGuide}_${p + 1}.jpg`;
      const destPath = path.join(lettersDir, destName);
      const ok = await downloadFile(photo.url, destPath);
      if (ok) {
        // Update URL to local public path
        photo.url = `/photos/letters/${destName}`;
        letterSuccess++;
      } else {
        letterFail++;
      }
    }
  }
  console.log(`Letter photos: downloaded ${letterSuccess}, failed ${letterFail}`);

  // 2. Download guidance appointment photos
  let guidanceSuccess = 0;
  let guidanceFail = 0;
  for (let i = 0; i < apptsData.length; i++) {
    const item = apptsData[i];
    for (let p = 0; p < item.photos.length; p++) {
      const photo = item.photos[p];
      const destName = photo.fileName || `guidance_${item.idGuide}_${p + 1}.jpg`;
      const destPath = path.join(guidanceDir, destName);
      const ok = await downloadFile(photo.url, destPath);
      if (ok) {
        // Update URL to local public path
        photo.url = `/photos/guidance/${destName}`;
        guidanceSuccess++;
      } else {
        guidanceFail++;
      }
    }
  }
  console.log(`Guidance photos: downloaded ${guidanceSuccess}, failed ${guidanceFail}`);

  // Save updated JSON with local paths
  fs.writeFileSync('public/utt_full_letters_with_photos.json', JSON.stringify(lettersData, null, 2), 'utf8');
  fs.writeFileSync('public/utt_full_guidance_appointments_with_photos.json', JSON.stringify(apptsData, null, 2), 'utf8');
  console.log('Updated JSON files with local /photos/... URLs successfully!');
}

main().catch(console.error);
