import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';
import config from '../firebase-applet-config.json' with { type: 'json' };

const adminCreds = JSON.parse(fs.readFileSync('.env.initial-admin', 'utf8'));

const app = initializeApp(config);
const auth = getAuth(app);
const db = getFirestore(app, config.firestoreDatabaseId);

async function main() {
  console.log('Authenticating as admin:', adminCreds.email);
  const userCred = await signInWithEmailAndPassword(auth, adminCreds.email, adminCreds.password);
  console.log('Authenticated successfully, uid:', userCred.user.uid);

  // Fetch current schools
  const schoolsSnap = await getDocs(collection(db, 'schools'));
  const schools = schoolsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
  console.log('Total schools in DB:', schools.length);

  // Fetch current submissions
  const subSnap = await getDocs(collection(db, 'documentSubmissions'));
  const currentSubs = subSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
  console.log('Total documentSubmissions in DB:', currentSubs.length);

  // Load and parse letter_data.html
  const html = fs.readFileSync('letter_data.html', 'utf8');
  const rows: any[] = [];
  const trRegex = /<tr class="texttable">([\s\S]*?)<\/tr>/g;
  let match;
  while ((match = trRegex.exec(html)) !== null) {
    const rowHtml = match[1];
    const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/g;
    const cells: any[] = [];
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
  console.log('Total parsed valid rows from UTT website:', validRows.length);

  let matchedCount = 0;
  let newCount = 0;
  const toInsert: any[] = [];

  for (const row of validRows) {
    const rawSchoolName = row.schoolName.trim();
    const dateMatch = row.dateText.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}:\d{2})/);
    let submissionDate = '';
    let submissionTime = '';
    if (dateMatch) {
      const [, dd, mm, yyyy, time] = dateMatch;
      submissionDate = `${yyyy}-${mm}-${dd}`;
      submissionTime = time;
    } else {
      submissionDate = row.dateText.substring(0, 10);
    }

    const cleanName = rawSchoolName.replace(/^(โรงเรียน|รร\.)\s*/, '').trim();
    const existing = currentSubs.find(s => {
      const sClean = (s.schoolName || '').replace(/^(โรงเรียน|รร\.)\s*/, '').trim();
      const sameSchool = sClean === cleanName || s.schoolName === rawSchoolName;
      const sameDate = s.submissionDate === submissionDate;
      const sameDoc = row.docNumber && s.documentNumber === row.docNumber;
      return sameSchool && (sameDate || sameDoc);
    });

    if (existing) {
      matchedCount++;
    } else {
      newCount++;
      const matchedSchool = schools.find(s => {
        const sClean = (s.schoolName || '').replace(/^(โรงเรียน|รร\.)\s*/, '').trim();
        return sClean === cleanName || s.schoolName === rawSchoolName;
      });

      toInsert.push({
        rawSchoolName,
        matchedSchoolName: matchedSchool?.schoolName,
        schoolId: matchedSchool?.id || null,
        teamId: matchedSchool?.teamId || 'team1',
        submissionDate,
        submissionTime,
        docNumber: row.docNumber || '-',
        counselor: row.counselor || 'อ.ประชา',
        status: row.status,
        status1: row.status1,
        note: row.note || '',
        editLink: row.editLink,
      });
    }
  }

  console.log(`Matched existing in DB: ${matchedCount}`);
  console.log(`New entries to add: ${newCount}`);
  if (toInsert.length > 0) {
    console.log('Sample new entry to add:');
    console.log(toInsert.slice(0, 3));
  }
}

main().catch(console.error);
