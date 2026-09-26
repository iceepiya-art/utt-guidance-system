import fs from 'node:fs';
import {isDeepStrictEqual} from 'node:util';
import {initializeApp} from 'firebase/app';
import {getAuth,signInWithEmailAndPassword,signOut} from 'firebase/auth';
import {getFirestore,collection,getDocs,doc,writeBatch,terminate} from 'firebase/firestore';

// Exact school names reviewed against the school catalog. Each row is one task.
const days=[
 [1,'บ้านเหล่า','ยื่นหนังสือ'],[1,'บ้านน้ำอ่าง(สนง.สลากกินแบ่งสงเคราะห์ที่ 163)','ยื่นหนังสือ'],[1,'บ้านข่อยสูง','ยื่นหนังสือ'],[1,'ตรอนตรีสินธุ์','ยื่นหนังสือ'],[1,'กศนอำเภอตรอน','ยื่นหนังสือ'],
 [2,'บ้านน้ำพี้มิตรภาพที่ 214','แนะแนว'],[2,'ภราดานุสรณ์','ยื่นหนังสือ'],[2,'เจริญวิทยา','ยื่นหนังสือ'],[2,'หวัวเฉียว','ยื่นหนังสือ'],[2,'เทศบาลวัดท้ายตลาด(กวีธรรมสาร)','ยื่นหนังสือ'],[2,'เทศบาลวัดหนองผา','ยื่นหนังสือ'],
 [3,'บ้านเด่นเหล็ก','แนะแนว'],[3,'อนุบาลอุตรดิตถ์','แนะแนว'],
 [4,'หวัวเฉียว','แนะแนว'], // น้ำปาด: user confirmed 2026-08-31 on 2026-09-25
 [7,'บ้านวังถ้ำ','แนะแนว'],[7,'กศนอำเภอพิชัย','ยื่นหนังสือ'],
 [8,'บ้านวังดิน','ยื่นหนังสือ'],[8,'บ้านสีเสียดบํารุง','ยื่นหนังสือ'],[8,'บ้านน้ำหมัน','ยื่นหนังสือ'],
 [9,'บ้านน้ำลี','ยื่นหนังสือ'],[9,'ภราดานุสรณ์','แนะแนว'],
 [10,'บ้านขุนฝาง','ยื่นหนังสือ'],[10,'บ้านเหล่าป่าสา','ยื่นหนังสือ'],[10,'เทศบาลวัดหนองผา','แนะแนว'],
 [11,'ตรอนตรีสินธุ์','แนะแนว'],[14,'บ้านสีเสียดบํารุง','แนะแนว'],
 [15,'บ้านน้ำอ่าง(สนง.สลากกินแบ่งสงเคราะห์ที่ 163)','แนะแนว'],[15,'ชุมชนเมืองปากฝาง','ยื่นหนังสือ'],
 [16,'บ้านเหล่าป่าสา','แนะแนว'],[16,'เทศบาลหัวดง (ป.ฟักอังกูร)','ยื่นใบเสร็จ'],
 [17,'บ้านแพะ','ยื่นหนังสือ'],[17,'ทองแสนขันวิทยา','ยื่นหนังสือ'],[17,'บ้านวังปรากฏ(ประชานุกูล)','ยื่นหนังสือ'],[17,'บ้านวังเบน(ภูธรอุปถัมภ์)','ยื่นหนังสือ'],[17,'กศนอำเภอทองแสนขัน','ยื่นหนังสือ'],
 [18,'บ้านวังดิน','แนะแนว'],[18,'บ้านน้ำลี','ยื่นหนังสือ'],
 [21,'เตรียมอุดมศึกษาน้อมเกล้า อุตรดิตถ์','แนะแนว'],[21,'บ้านเหล่า','แนะแนว'],
 [22,'จริมอนุสรณ์ 2','ยื่นหนังสือ'],[22,'น้ำพร้าสามัคคี','ยื่นหนังสือ'],
 [23,'เทศบาลวัดท้ายตลาด(กวีธรรมสาร)','แนะแนว'],[23,'วัดพระฝาง','ยื่นหนังสือ'],[23,'สวนหลวงสาธิตสปจ.อุตรดิตถ์','ยื่นหนังสือ'],[23,'ป่าขนุนเจริญวิทยา','ยื่นหนังสือ'],
];
const rows=days.map(([day,schoolName,activity])=>({date:`2026-09-${String(day).padStart(2,'0')}`,schoolName,activity,teamId:'team1',vehicleName:'VIGO กข 9914',responsiblePeople:['อ.ประชา','อ.ณิชชัยกุญช์']}));
fs.writeFileSync('docs/SEPTEMBER_2026_TEAM1_CONFIRMED.json',JSON.stringify({provenance:'user-confirmed-table',team:'team1',month:'2026-09',rows},null,2));
const config=JSON.parse(fs.readFileSync('firebase-applet-config.json','utf8'));
const app=initializeApp(config),auth=getAuth(app),db=getFirestore(app,config.firestoreDatabaseId);
const cols=['schools','documentSubmissions','appointments','fieldTrips','users','vehicles'];
const read=async()=>Object.fromEntries(await Promise.all(cols.map(async c=>[c,(await getDocs(collection(db,c))).docs.map(d=>({...d.data(),id:d.id}))])));
const now=new Date().toISOString(),stamp=now.replace(/[:.]/g,'-'),norm=s=>(s||'').normalize('NFKC').replace(/^โรงเรียน/,'').replace(/\s/g,'');
try{
 await signInWithEmailAndPassword(auth,process.env.UTT_TARGET_EMAIL,process.env.UTT_TARGET_PASSWORD);
 const t=await read(),before=structuredClone(t),changes=new Map(),review=[];
 const piya=t.users.filter(u=>u.displayName?.includes('ประชา')&&u.active);
 const colleague=t.users.filter(u=>u.displayName?.includes('ณิชชัยกุญช์')&&u.active);
 const colleagueName=colleague.length===1?colleague[0].displayName:'อ.ณิชชัยกุญช์';
 const personId=piya.length===1?piya[0].id:'';
 const patch=(col,r,fields)=>{
  const delta=Object.fromEntries(Object.entries(fields).filter(([k,v])=>!isDeepStrictEqual(r[k],v)));
  if(!Object.keys(delta).length)return;
  const key=`${col}/${r.id}`,prev=changes.get(key);
  const create=!before[col].some(x=>x.id===r.id);
  Object.assign(r,delta);changes.set(key,{col,id:r.id,create,data:{...(prev?.data||{}),...(create?r:delta),updatedAt:now}});
 };
 let vehicle=t.vehicles.find(v=>v.id==='vigo-9914');
 if(!vehicle){vehicle={id:'vigo-9914'};t.vehicles.push(vehicle);patch('vehicles',vehicle,{vehicleName:'VIGO กข 9914',registrationNumber:'กข 9914',active:true});}
 for(const [index,row]of rows.entries()){
  const schools=t.schools.filter(s=>norm(s.schoolName)===norm(row.schoolName));
  if(schools.length!==1)throw Error('School identity ambiguous: '+row.schoolName);
  const school=schools[0],meta={confirmedReport:'SEPTEMBER_2026_TEAM1',confirmedReportDate:row.date};
  const common={teamId:'team1',vehicleName:row.vehicleName,vehicleId:'vigo-9914',...meta};
  if(row.activity!=='แนะแนว'){
   let matches=t.documentSubmissions.filter(s=>!s.mergedIntoId&&s.schoolId===school.id&&s.submissionDate===row.date);
   if(matches.length>1)review.push({schoolName:row.schoolName,date:row.date,reason:'Multiple original submissions on same date; preserved all original records/photos',ids:matches.map(s=>s.id)});
   if(!matches.length){const r={id:`confirmed_sep_team1_letter_${index+1}`,schoolId:school.id,schoolName:school.schoolName,submissionDate:row.date,submissionTime:'',documentNumber:'',teacherName:school.teacherName||'',teacherPhone:school.teacherPhone||'',photos:[],status:'DOCUMENT_SUBMITTED',note:'รอติดต่อกลับ',createdAt:now,createdBy:'User confirmed September table',academicYear:'2569'};t.documentSubmissions.push(r);matches=[r];review.push({schoolName:row.schoolName,date:row.date,reason:'New confirmed submission: original letter number/time/photo not supplied'});}
   for(const r of matches)patch('documentSubmissions',r,{...common,...(row.activity==='ยื่นใบเสร็จ'?{status:'OTHER_ACTIVITY',otherActivityDetails:'ยื่นใบเสร็จ',activities:['ยื่นใบเสร็จ']}:{}),submittedByName:piya[0]?.displayName||'อ.ประชา',submittedByNames:[piya[0]?.displayName||'อ.ประชา',colleagueName],...(personId?{submittedById:personId}:{})});
  }else{
   const matches=t.fieldTrips.filter(f=>f.date===row.date&&f.workType?.includes('แนะแนว')&&f.schools?.some(s=>s.schoolId===school.id));
   if(matches.length!==1){review.push({schoolName:row.schoolName,date:row.date,reason:'No unique result on confirmed day; keep original history pending clarification',matches:matches.length});continue;}
   const r=matches[0];
   if(r.schools.length!==1)throw Error('Multi-school result requires explicit scope review');
   const fields={...common,counselorName:piya[0]?.displayName||'อ.ประชา',teamMemberNames:colleagueName,...(personId?{counselorId:personId}:{})};
   patch('fieldTrips',r,fields);
   const a=t.appointments.find(a=>a.id===r.appointmentId);
   if(a)patch('appointments',a,{...fields,status:'COMPLETED'});

  }
 }
 const plan={createdAt:now,rows:rows.length,letters:rows.filter(r=>r.activity==='ยื่นหนังสือ').length,guidance:rows.filter(r=>r.activity==='แนะแนว').length,receipts:rows.filter(r=>r.activity==='ยื่นใบเสร็จ').length,changes:[...changes.values()],review};
 fs.writeFileSync(`backup/september-team1-plan-${stamp}.json`,JSON.stringify(plan,null,2));
 console.log(JSON.stringify({...plan,changes:plan.changes.map(c=>({collection:c.col,id:c.id,create:c.create}))},null,2));
 if(process.argv.includes('--apply')){
  fs.writeFileSync(`backup/before-september-team1-${stamp}.json`,JSON.stringify(before,null,2));
  const batch=writeBatch(db);for(const c of changes.values())batch.set(doc(db,c.col,c.id),c.data,{merge:true});await batch.commit();
  const after=await read();fs.writeFileSync(`backup/after-september-team1-${stamp}.json`,JSON.stringify(after,null,2));
  for(const c of changes.values()){const r=after[c.col].find(r=>r.id===c.id);for(const[k,v]of Object.entries(c.data))if(!isDeepStrictEqual(r[k],v))throw Error('Readback mismatch: '+c.id+'/'+k);}
  console.log('APPLIED AND VERIFIED '+changes.size+' records');
 }
}finally{await signOut(auth);await terminate(db);}
