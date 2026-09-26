import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {initializeApp} from 'firebase/app';
import {getAuth,signInWithEmailAndPassword,signOut} from 'firebase/auth';
import {getFirestore,collection,getDocs,doc,writeBatch,terminate} from 'firebase/firestore';

// Dry run by default. Every apply reads live data and saves a full before/after backup.
const load=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
const sourcePath=process.argv.find(x=>x.startsWith('--source='))?.slice(9)||'backup/utt-source-2026-09-24.json';
const source=load(sourcePath), now=new Date().toISOString();
const onlySource=process.argv.find(x=>x.startsWith('--only-source='))?.slice(14);
if(onlySource){source.letters=source.letters.filter(r=>r.idGuide===onlySource);source.guidance=source.guidance.filter(r=>r.idGuide===onlySource);}
const names=['schools','documentSubmissions','appointments','fieldTrips','vehicles'];
const corrections=['JULY_2026_TEAM1_CONFIRMED','JULY_2026_TEAM2_CONFIRMED','AUGUST_2026_TEAM1_REVIEW','AUGUST_2026_TEAM2_REVIEW'].flatMap(n=>{const d=load(`docs/${n}.json`);return d.rows.map(r=>({...r,teamId:d.team}));});
const base=s=>(s||'').normalize('NFKC').replace(/^(โรงเรียน)+/,'').replace(/[๐-๙]/g,c=>'๐๑๒๓๔๕๖๗๘๙'.indexOf(c)).replace(/[\s().]/g,'');
// Explicitly reviewed spelling variants, never approximate/fuzzy matching.
const aliases={
 'บ้านโคกวิทยา':'บ้านโคกวิทยาคม','บ้านโคก':'บ้านโคกวิทยาคม',
 'ราชประชานุเคราะห์':'ราชประชานุเคราะห์ ๑๓',
 'บ้านวังปรากฎ':'บ้านวังปรากฏ(ประชานุกูล)',
 'สกร.บ้านโคก':'กศนอำเภอบ้านโคก','สกร.น้ำปาด':'กศนอำเภอน้ำปาด','สกร.ฟากท่า':'กศนอำเภอฟากท่า',
 'ท่าอิฐ':'เทศบาลท่าอิฐ',
 'จริมอนุสรณ์สอง':'จริมอนุสรณ์ 2','เทศบาลหัวดงปอฟักอังกูร':'เทศบาลหัวดง (ป.ฟักอังกูร)',
 'เทศบาลหัวดง':'เทศบาลหัวดง (ป.ฟักอังกูร)','สวรรค์อนันต์วิทยาสอง':'สวรรค์อนันต์วิทยา 2',
 'สวรรค์อนันวิทยา 2':'สวรรค์อนันต์วิทยา 2','บ้านโคนพิทยาคม':'บ้านโคนพิทยา','บ้านโคนพิยา':'บ้านโคนพิทยา','บ้านโคนวิทยา':'บ้านโคนพิทยา',
 'น้ำปาดชนูปถัทภ์':'น้ำปาดชนูปถัมภ์','น้ำปาดชนูปถัม':'น้ำปาดชนูปถัมภ์',
 'ศรีสำโรงชนูปถัมถ์':'ศรีสำโรงชนูปถัมภ์','ศรีสำโรงชนูปถัมภ์์':'ศรีสำโรงชนูปถัมภ์',
 'บ้านเตว็ดนอก':'บ้านเตว็ดนอก(สร้อยสนประชาสรรค์)','บ้านเกาะตาเลี้ยง':'บ้านเกาะตาเลี้ยง(ทองดีประชานุกูล)',
 'อนุบาลสวรรคโลก':'อนุบาลสวรรคโลก(คุ้งวารีวิทยา)','อนุบาลท่าปลา':'อนุบาลท่าปลา(ชุมชนร่วมจิต)',
 'นิคมสร้างตนเองลำน้ำน่านสงเคราะห์หนึ่ง':'นิคมสร้างตนเองลำน้ำน่านสงเคราะห์ 1',
 'นิคมสร้างตนเองลำน้ำน่านสงเคราะห์สาม':'นิคมสร้างตนเองลําน้ำน่านสงเคราะห์ 3',
 'หนองปลาหมอวิทยา':'หนองปลาหมอวิทยาคม','หนองปลาหมอ':'หนองปลาหมอวิทยาคม',
 'สวรรคโลกประชาสรรค์':'เทศบาลสวรรคโลกประชาสรรค์','บ้านวังแดงสหจิตรวิทยาคาร':'บ้านวังแดง(สหจิตวิทยาคาร)',
 'บ้านวังแดง':'บ้านวังแดง(สหจิตวิทยาคาร)','เทศบาลวัดท้ายตลาด':'เทศบาลวัดท้ายตลาด(กวีธรรมสาร)',
 'วัดท้ายตลาด(กวีธรรมสาร)':'เทศบาลวัดท้ายตลาด(กวีธรรมสาร)','บ้านน้ำพี้มิตรภาพ':'บ้านน้ำพี้มิตรภาพที่ 214',
 'บ้านน้ำอ่าง':'บ้านน้ำอ่าง(สนง.สลากกินแบ่งสงเคราะห์ที่ 163)','ลิไทยวิทยาคม':'ลิไทพิทยาคม',
 'ไทยรัฐวิทยา':'ไทยรัฐวิทยา ๕ (วัดตลิ่งต่ำ)','ไทยรัฐ':'ไทยรัฐวิทยา ๕ (วัดตลิ่งต่ำ)','ไทยรัฐวิทยา 5':'ไทยรัฐวิทยา ๕ (วัดตลิ่งต่ำ)',
 'วิไลเกียรติ':'วิไลเกียรติอุปถัมภ์','พนมมาศวิทยากร':'พนมมาศพิทยากร','เทศบาลพนมมาศพิทยากร':'พนมมาศพิทยากร',
 'บ้านนากล่ำ':'ชุมชนบ้านนากล่ำ','ห้วยสูน':'บ้านห้วยสูน','นาไพร':'บ้านนาไพร','ห้วยลึก':'บ้านห้วยลึก',
 'ปางวุ้น':'บ้านปางวุ้น','เด่นเหล็ก':'บ้านเด่นเหล็ก','ทุ่งกะโล่':'ทุ่งกะโล่วิทยา','บ่อเบี้ย':'บ้านบ่อเบี้ย','แสนตอ':'แสนตอวิทยา','หาดเสือเต้น':'บ้านหาดเสือเต้น','น้ำริด':'น้ำริดวิทยา',
};
const aliasMap=new Map(Object.entries(aliases).map(([a,b])=>[base(a),base(b)]));
const norm=s=>aliasMap.get(base(s))||base(s);
const value=(r,k)=>r.fields[k]?.value??r.fields[k]??'';
const valid=(d,allowFuture=false)=>/^20\d\d-\d\d-\d\d$/.test(d)&&!Number.isNaN(Date.parse(d))&&(allowFuture||d<=source.cutoffDate);
const config=load('firebase-applet-config.json');
const app=initializeApp(config),auth=getAuth(app),db=getFirestore(app,config.firestoreDatabaseId);
const read=async()=>Object.fromEntries(await Promise.all(names.map(async n=>[n,(await getDocs(collection(db,n))).docs.map(d=>({...d.data(),id:d.id}))])));
let target;
try{
 if(process.argv.includes('--offline')) target=load(process.argv.find(x=>x.startsWith('--target-snapshot='))?.slice(18)||'backup/target-current-2026-09-23.json');
 else {await signInWithEmailAndPassword(auth,process.env.UTT_TARGET_EMAIL,process.env.UTT_TARGET_PASSWORD);target=await read();}
 const before=structuredClone(target),review=[],changes=new Map();
 const update=(col,id,patch)=>{
  let r=target[col].find(x=>x.id===id);const fresh=!r;
  if(!r){r={id,createdAt:now,createdBy:'UTT source reconciliation'};target[col].push(r);}
  const diff=Object.fromEntries(Object.entries(patch).filter(([k,v])=>v!==undefined&&!isDeepStrictEqual(r[k],v)));
  if(!Object.keys(diff).length)return r;
  Object.assign(r,diff,{updatedAt:now});
  const key=`${col}/${id}`,old=changes.get(key);
  changes.set(key,{collection:col,id,create:old?.create??fresh,data:{...(old?.data||{}),...(fresh?r:diff),updatedAt:now}});
  return r;
 };
 const unique=a=>a.length===1?a[0]:null;
 const school=(name,existingId)=>target.schools.find(s=>s.id===existingId)||unique(target.schools.filter(s=>s.schoolId===existingId&&existingId))||unique(target.schools.filter(s=>norm(s.schoolName)===norm(name)));
 // These source institutions are genuinely absent from the school collection.
 // Keep unspecified contact/demographic data empty instead of inventing it.
 for(const name of ['กศนอำเภอทองแสนขัน','กศนอำเภอพิชัย','กศนอำเภอตรอน','กศนอำเภอน้ำปาด','กศนอำเภอบ้านโคก','กศนอำเภอฟากท่า','เจริญวิทยา','ภราดานุสรณ์','หวัวเฉียว','เทศบาลวัดหนองผา','เทศบาลท่าอิฐ']){
  const evidence=source.letters.find(r=>norm(value(r,'s_name'))===norm(name));
  if(evidence&&!school(name)){
   const id='utt_school_'+createHash('sha256').update(norm(name)).digest('hex').slice(0,20);
   update('schools',id,{schoolId:id,schoolName:name,teamId:`team${value(evidence,'lines_guide')}`,currentStatus:'DOCUMENT_SUBMITTED',educationLevels:'',schoolPhone:'',teacherName:'',teacherPosition:'',teacherPhone:'',teacherLine:'',preferredContactTime:'',district:'',province:'',note:'นำเข้าจากข้อมูลต้นฉบับ UTT; ข้อมูลพื้นฐานที่ต้นฉบับไม่ระบุยังเว้นว่าง',importSource:evidence.sourceUrl});
  }
 }
 const match=(col,r,kind)=>{
  const prefix=kind==='letter'?'utt_photo_':'utt_appt_photo_';
  const candidates=target[col].filter(x=>!x.mergedIntoId);
  const direct=candidates.filter(x=>x.sourceSystem==='UTT'&&String(x.sourceRecordId)===r.idGuide||x.photos?.some(p=>p.id?.startsWith(`${prefix}${r.idGuide}_`)));
  if(direct.length)return unique(direct);
  const date=value(r,kind==='letter'?'submission_date':'guidance_date').slice(0,10);
  return unique(candidates.filter(x=>(x.submissionDate||x.date)===date&&norm(x.schoolName)===norm(value(r,'s_name'))));
 };
 const photos=(existing,r,schoolId,kind)=>{
  // Source 104 conflicts with source 85 (same school/date, different dated albums).
  // Undo only photos introduced by this importer under the conflicting source ID;
  // original target photos and both raw source snapshots remain intact.
  const result=[...(existing||[])].filter(p=>!(r.idGuide==='85'&&p.id?.startsWith('utt_guidance_photo_104_')));
  for(const [i,url]of r.photos.entries())if(!result.some(p=>decodeURI(p.url)===decodeURI(url)))result.push({id:`utt_${kind}_photo_${r.idGuide}_${i+1}`,url,fileName:decodeURIComponent(url.split('/').pop()),uploadedAt:now,...(schoolId?{schoolId}:{})});
  return result;
 };
 const confirmed=(date,team,name,guidance)=>unique(corrections.filter(c=>c.date===date&&c.teamId===team&&norm(c.schoolName)===norm(name)&&c.activity.includes('แนะแนว')===guidance));
 const metadata=r=>({sourceSystem:'UTT',sourceRecordId:r.idGuide,sourceUrl:r.sourceUrl});
 const submissions=new Map();
 for(const r of source.letters){
  const date=value(r,'submission_date').slice(0,10),old=match('documentSubmissions',r,'letter');
  if(!valid(date)){review.push({kind:'letter',sourceId:r.idGuide,name:value(r,'s_name'),reason:'Invalid or future submission date'});continue;}
  const s=school(value(r,'s_name'),old?.schoolId)||school(old?.schoolName),team=old?.teamId||`team${value(r,'lines_guide')}`;
  if(!s){review.push({kind:'letter',sourceId:r.idGuide,name:value(r,'s_name'),reason:'School identity needs verification'});continue;}
  const c=confirmed(date,team,s.schoolName,false),people=c?.responsiblePeople||old?.submittedByNames||[value(r,'s_guide')].filter(Boolean);
  const patch={...metadata(r),schoolId:s.id,photos:photos(old?.photos,r,s.id,'letter')};
  const defaults={schoolName:s.schoolName,submissionDate:date,submissionTime:value(r,'submission_date').slice(11,16),teamId:team,documentNumber:value(r,'letter_number'),submittedById:'',submittedByName:people[0]||'',submittedByNames:people,teacherName:'',teacherPhone:'',status:'DOCUMENT_SUBMITTED',note:value(r,'note_letter')||'รอติดต่อกลับ',academicYear:'2569'};
  for(const[k,v]of Object.entries(defaults))if(!old||old[k]===undefined||old[k]==='')patch[k]=v;
  if(c)Object.assign(patch,{vehicleName:c.vehicleName,submittedByName:people[0],submittedByNames:people});
  const sub=update('documentSubmissions',old?.id||`utt_letter_${r.idGuide}`,patch);submissions.set(r.idGuide,sub);
 }
 for(const r of source.guidance){
  if(r.idGuide==='104'){review.push({kind:'guidance',sourceId:'104',name:value(r,'s_name'),reason:'Conflicts with source 85: same school/date but album names indicate a different day; requires date verification'});continue;}
  const date=value(r,'guidance_date').slice(0,10),completed=value(r,'note_letter1').trim()==='แนะแนวแล้ว'&&value(r,'guidance_status')!=='ไม่ได้แนะแนว';
  if(!valid(date,!completed&&value(r,'guidance_status')==='นัดหมาย')){if(completed)review.push({kind:'guidance',sourceId:r.idGuide,name:value(r,'s_name'),reason:'Completed source has no valid date'});continue;}
  if(!completed&&value(r,'guidance_status')!=='นัดหมาย')continue;
  const old=match('appointments',r,'guidance'),sub=submissions.get(r.idGuide);
  const s=school(value(r,'s_name'),old?.schoolId||sub?.schoolId)||school(old?.schoolName);
  if(!s){review.push({kind:'guidance',sourceId:r.idGuide,name:value(r,'s_name'),reason:'School identity needs verification'});continue;}
  if(old?.submissionId&&sub&&old.submissionId!==sub.id){review.push({kind:'guidance',sourceId:r.idGuide,reason:'Conflicting existing submission link'});continue;}
  const team=old?.teamId||`team${value(r,'line1')}`,c=confirmed(date,team,s.schoolName,true);
  const people=c?.responsiblePeople||[old?.counselorName||value(r,'s_guide1')].filter(Boolean);
  const vehicle=c?.vehicleName||old?.vehicleName||sub?.vehicleName||'';
  const patch={...metadata(r),schoolId:s.id,photos:photos(old?.photos,r,s.id,'guidance'),...(sub?{submissionId:sub.id}:{})};
  const defaults={schoolName:s.schoolName,date,startTime:value(r,'guidance_date').slice(11,16),endTime:'',teamId:team,counselorId:'',counselorName:people[0]||'',vehicleName:vehicle,workType:'แนะแนว',source:sub?'DOCUMENT_SUBMISSION':'MANUAL',status:completed?'COMPLETED':'CONFIRMED',note:value(r,'note_letter1'),teacherName:'',teacherPhone:'',reminders:[],academicYear:'2569'};
  for(const[k,v]of Object.entries(defaults))if(!old||old[k]===undefined||old[k]==='')patch[k]=v;
  if(c)Object.assign(patch,{vehicleName:vehicle,counselorName:people[0],teamMemberNames:people.slice(1).join(', ')});
  const appt=update('appointments',old?.id||`utt_appointment_${r.idGuide}`,patch);
  if(sub&&!sub.appointmentId)update('documentSubmissions',sub.id,{appointmentId:appt.id});
  if(!completed)continue;
  const candidates=target.fieldTrips.filter(t=>t.appointmentId===appt.id||t.sourceSystem==='UTT'&&String(t.sourceRecordId)===r.idGuide||t.date===date&&t.teamId===team&&t.schools?.some(x=>x.schoolId===s.id)&&!t.workType?.includes('ยื่นหนังสือ'));
  if(candidates.length>1){review.push({kind:'guidance',sourceId:r.idGuide,reason:'Multiple existing results'});continue;}
  const trip=candidates[0];
  if(trip?.appointmentId&&trip.appointmentId!==appt.id){review.push({kind:'guidance',sourceId:r.idGuide,reason:'Existing result belongs to another appointment'});continue;}
  const tripPatch={...metadata(r),appointmentId:appt.id,...(sub?{submissionId:sub.id}:{}),photos:photos(trip?.photos,r,s.id,'guidance')};
  if(!trip)Object.assign(tripPatch,{date,teamId:team,vehicleId:appt.vehicleId||'',vehicleName:vehicle,counselorId:appt.counselorId||'',counselorName:people[0]||'',teamMemberNames:people.slice(1).join(', '),workType:'แนะแนว',summary:value(r,'note_letter1'),schools:[{schoolId:s.id,schoolName:s.schoolName,timeSlot:appt.startTime||''}],academicYear:'2569'});
  const saved=update('fieldTrips',trip?.id||`utt_guidance_${r.idGuide}`,tripPatch);
  update('appointments',appt.id,{status:'COMPLETED'});
  if(sub&&!sub.fieldTripId)update('documentSubmissions',sub.id,{fieldTripId:saved.id});
 }
 const plan={source:sourcePath,createdAt:now,cutoffDate:source.cutoffDate,changes:[...changes.values()],review};
 const stamp=now.replace(/[:.]/g,'-'),planPath=`backup/utt-fill-plan-${stamp}.json`;
 fs.writeFileSync(planPath,JSON.stringify(plan,null,2));
 console.log(JSON.stringify({planPath,changes:plan.changes.length,byCollection:Object.fromEntries(names.map(n=>[n,{create:plan.changes.filter(c=>c.collection===n&&c.create).length,update:plan.changes.filter(c=>c.collection===n&&!c.create).length}])),review},null,2));
 if(process.argv.includes('--apply')){
  if(process.argv.includes('--offline'))throw Error('Cannot apply offline');
  const backup=`backup/target-before-utt-fill-${stamp}.json`;fs.writeFileSync(backup,JSON.stringify(before,null,2));
  // All writes are atomic, so linked records cannot be partially imported.
  if(changes.size>450)throw Error('Plan exceeds single atomic batch limit');
  const batch=writeBatch(db);for(const c of changes.values())batch.set(doc(db,c.collection,c.id),c.data,{merge:true});await batch.commit();
  const after=await read();fs.writeFileSync(`backup/target-after-utt-fill-${stamp}.json`,JSON.stringify(after,null,2));
  for(const c of changes.values()){const actual=after[c.collection].find(r=>r.id===c.id);for(const[k,v]of Object.entries(c.data))if(!isDeepStrictEqual(actual?.[k],v))throw Error(`Readback mismatch: ${c.collection}/${c.id}/${k}`);}
  console.log('APPLIED AND VERIFIED '+changes.size+' records. Backup: '+backup);
 }
}finally{await signOut(auth);await terminate(db);}
