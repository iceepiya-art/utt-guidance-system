import fs from 'node:fs';
import {isDeepStrictEqual} from 'node:util';
import {initializeApp} from 'firebase/app';
import {getAuth,signInWithEmailAndPassword,signOut} from 'firebase/auth';
import {getFirestore,collection,getDocs,doc,writeBatch,terminate} from 'firebase/firestore';

// Exact school names reviewed against the school catalog. Each row is one task.
const days=[
 [1,'บ้านหนองแหน','ยื่นหนังสือ'],[1,'บ้านขอนซุง','แนะแนว'],
 [2,'บ้านนายาง','แนะแนว'],
 [3,'บ้านเมืองเก่า ศรีอินทราทิตย์','ยื่นหนังสือ'],[3,'บ้านเมืองเก่า ศรีอินทราทิตย์','แนะแนว'],
 [4,'ศรีสำโรงชนูปถัมภ์','แนะแนว'],
 [7,'บ้านหนองบัว','ยื่นหนังสือ'],[7,'เทวัญอำนวยวิทย์','ยื่นหนังสือ'],
 [8,'บ้านสวนวิทยาคม','ยื่นหนังสือ'],[8,'ลิไทพิทยาคม','ยื่นหนังสือ'],
 [9,'บ้านเตว็ดนอก(สร้อยสนประชาสรรค์)','แนะแนว'],
 [10,'บ้านสารจิตร','ยื่นหนังสือ'],[10,'บ้านแก่งวิทยา','ยื่นหนังสือ'],
 [14,'เทวัญอำนวยวิทย์','แนะแนว'],[14,'วัดปากน้ำ','ยื่นหนังสือ'],
 [15,'บ้านหนองบัว','แนะแนว'],[15,'บ้านบึงท่ายวน','ยื่นหนังสือ'],
 [16,'หนองกลับวิทยาคม','ยื่นหนังสือ'],[16,'บ้านหนองแหน','แนะแนว'],
 [17,'บ้านป่าเลา','ยื่นหนังสือ'],[17,'วัดปากน้ำ','แนะแนว'],
 [21,'บ้านป่าเลา','แนะแนว'],
 [22,'บ้านท่าโพธิ์','ยื่นหนังสือ'],[22,'บ้านสันหีบ','ยื่นหนังสือ'],[22,'บ้านผาเวียง','ยื่นหนังสือ'],
 [23,'บ้านห้วยโป้','ยื่นหนังสือ'],[23,'บ้านสุเม่น','ยื่นหนังสือ'],
 [24,'บ้านแม่เทิน','ยื่นหนังสือ'],[24,'บ้านสุเม่น','แนะแนว'],
];
const rows=days.map(([day,schoolName,activity])=>({date:`2026-09-${String(day).padStart(2,'0')}`,schoolName,activity,teamId:'team2',vehicleName:day===4?'MITSU บน 6739':'MITSU บน 6738',responsiblePeople:['อ.ปิยะ']}));
fs.writeFileSync('docs/SEPTEMBER_2026_TEAM2_CONFIRMED.json',JSON.stringify({provenance:'user-confirmed-table',team:'team2',month:'2026-09',rows},null,2));
const config=JSON.parse(fs.readFileSync('firebase-applet-config.json','utf8'));
const app=initializeApp(config),auth=getAuth(app),db=getFirestore(app,config.firestoreDatabaseId);
const cols=['schools','documentSubmissions','appointments','fieldTrips','users','vehicles'];
const read=async()=>Object.fromEntries(await Promise.all(cols.map(async c=>[c,(await getDocs(collection(db,c))).docs.map(d=>({...d.data(),id:d.id}))])));
const now=new Date().toISOString(),stamp=now.replace(/[:.]/g,'-'),norm=s=>(s||'').normalize('NFKC').replace(/^โรงเรียน/,'').replace(/\s/g,'');
try{
 await signInWithEmailAndPassword(auth,process.env.UTT_TARGET_EMAIL,process.env.UTT_TARGET_PASSWORD);
 const t=await read(),before=structuredClone(t),changes=new Map(),review=[];
 const piya=t.users.filter(u=>u.displayName?.includes('ปิยะ')&&u.active);
 const personId=piya.length===1?piya[0].id:'';
 const patch=(col,r,fields)=>{
  const delta=Object.fromEntries(Object.entries(fields).filter(([k,v])=>!isDeepStrictEqual(r[k],v)));
  if(!Object.keys(delta).length)return;
  const key=`${col}/${r.id}`,prev=changes.get(key);
  const create=!before[col].some(x=>x.id===r.id);
  Object.assign(r,delta);changes.set(key,{col,id:r.id,create,data:{...(prev?.data||{}),...(create?r:delta),updatedAt:now}});
 };
 for(const number of ['6738','6739']){
  const id=`mitsu-${number}`;
  let vehicle=t.vehicles.find(v=>v.id===id);
  if(!vehicle){vehicle={id};t.vehicles.push(vehicle);patch('vehicles',vehicle,{vehicleName:`MITSU บน ${number}`,registrationNumber:`บน ${number}`,active:true});}
 }
 for(const [index,row]of rows.entries()){
  const schools=t.schools.filter(s=>norm(s.schoolName)===norm(row.schoolName));
  if(schools.length!==1)throw Error('School identity ambiguous: '+row.schoolName);
  const school=schools[0],meta={confirmedReport:'SEPTEMBER_2026_TEAM2',confirmedReportDate:row.date};
  const common={teamId:'team2',vehicleName:row.vehicleName,vehicleId:row.vehicleName.endsWith('6739')?'mitsu-6739':'mitsu-6738',...meta};
  if(row.activity==='ยื่นหนังสือ'){
   let matches=t.documentSubmissions.filter(s=>!s.mergedIntoId&&s.schoolId===school.id&&s.submissionDate===row.date);
   if(matches.length>1)review.push({schoolName:row.schoolName,date:row.date,reason:'Multiple original submissions on same date; preserved all original records/photos',ids:matches.map(s=>s.id)});
   if(!matches.length){const r={id:`confirmed_sep_team2_letter_${index+1}`,schoolId:school.id,schoolName:school.schoolName,submissionDate:row.date,submissionTime:'',documentNumber:'',teacherName:school.teacherName||'',teacherPhone:school.teacherPhone||'',photos:[],status:'DOCUMENT_SUBMITTED',note:'รอติดต่อกลับ',createdAt:now,createdBy:'User confirmed September table',academicYear:'2569'};t.documentSubmissions.push(r);matches=[r];review.push({schoolName:row.schoolName,date:row.date,reason:'New confirmed submission: original letter number/time/photo not supplied'});}
   for(const r of matches)patch('documentSubmissions',r,{...common,submittedByName:piya[0]?.displayName||'อ.ปิยะ',submittedByNames:[piya[0]?.displayName||'อ.ปิยะ'],...(personId?{submittedById:personId}:{})});
  }else{
   const matches=t.fieldTrips.filter(f=>f.date===row.date&&f.workType?.includes('แนะแนว')&&f.schools?.some(s=>s.schoolId===school.id));
   if(matches.length!==1)throw Error('Expected one existing result: '+row.schoolName+' '+row.date+' found '+matches.length);
   const r=matches[0];
   if(r.schools.length!==1)throw Error('Multi-school result requires explicit scope review');
   const fields={...common,counselorName:piya[0]?.displayName||'อ.ปิยะ',teamMemberNames:'',...(personId?{counselorId:personId}:{})};
   patch('fieldTrips',r,fields);
   const a=t.appointments.find(a=>a.id===r.appointmentId);
   if(a)patch('appointments',a,{...fields,status:'COMPLETED'});
   // The user explicitly confirmed submission and actual guidance together on Sep 3.
   if(row.date==='2026-09-03'){
    const subs=t.documentSubmissions.filter(s=>!s.mergedIntoId&&s.schoolId===school.id&&s.submissionDate===row.date);
    if(subs.length!==1)throw Error('Same-day submission is ambiguous');
    const sub=subs[0];
    if(r.submissionId&&r.submissionId!==sub.id)throw Error('Existing result link conflict');
    if(a?.submissionId&&a.submissionId!==sub.id)throw Error('Existing appointment link conflict');
    patch('fieldTrips',r,{submissionId:sub.id});
    if(a)patch('appointments',a,{submissionId:sub.id,source:'DOCUMENT_SUBMISSION'});
    patch('documentSubmissions',sub,{fieldTripId:r.id,...(a?{appointmentId:a.id}:{}),sameDayGuidance:true,status:'GUIDANCE_COMPLETED'});
   }
  }
 }
 const plan={createdAt:now,rows:rows.length,letters:rows.filter(r=>r.activity==='ยื่นหนังสือ').length,guidance:rows.filter(r=>r.activity==='แนะแนว').length,changes:[...changes.values()],review};
 fs.writeFileSync(`backup/september-team2-plan-${stamp}.json`,JSON.stringify(plan,null,2));
 console.log(JSON.stringify({...plan,changes:plan.changes.map(c=>({collection:c.col,id:c.id,create:c.create}))},null,2));
 if(process.argv.includes('--apply')){
  fs.writeFileSync(`backup/before-september-team2-${stamp}.json`,JSON.stringify(before,null,2));
  const batch=writeBatch(db);for(const c of changes.values())batch.set(doc(db,c.col,c.id),c.data,{merge:true});await batch.commit();
  const after=await read();fs.writeFileSync(`backup/after-september-team2-${stamp}.json`,JSON.stringify(after,null,2));
  for(const c of changes.values()){const r=after[c.col].find(r=>r.id===c.id);for(const[k,v]of Object.entries(c.data))if(!isDeepStrictEqual(r[k],v))throw Error('Readback mismatch: '+c.id+'/'+k);}
  console.log('APPLIED AND VERIFIED '+changes.size+' records');
 }
}finally{await signOut(auth);await terminate(db);}
