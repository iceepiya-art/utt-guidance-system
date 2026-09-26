import fs from 'fs';

const cookieMatch = fs.readFileSync('cookies.txt', 'utf8').match(/PHPSESSID\s+(\S+)/);
const phpSessId = cookieMatch ? cookieMatch[1] : '';

async function fetchPage(url) {
  const res = await fetch(url, {
    headers: {
      'Cookie': `PHPSESSID=${phpSessId}`,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    }
  });
  return await res.text();
}

async function main() {
  console.log('Fetching live UTT pages with PHPSESSID...');
  const tLetter = await fetchPage('https://www.utt.ac.th/guide/file_letter.php');
  const tGuidance = await fetchPage('https://www.utt.ac.th/guide/guidance_table.php');

  console.log('file_letter.php length:', tLetter.length, 'has login form:', tLetter.includes('name="username"'));
  console.log('guidance_table.php length:', tGuidance.length, 'has login form:', tGuidance.includes('name="username"'));

  fs.writeFileSync('scratch/live_file_letter.html', tLetter, 'utf8');
  fs.writeFileSync('scratch/live_guidance_table.html', tGuidance, 'utf8');
  console.log('Saved to scratch/live_file_letter.html and scratch/live_guidance_table.html');
}

main().catch(console.error);
