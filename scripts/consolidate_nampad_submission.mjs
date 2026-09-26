import fs from 'node:fs';
import {initializeApp} from 'firebase/app';
import {getAuth,signInWithEmailAndPassword,signOut} from 'firebase/auth';
import {getFirestore,collection,getDocs,doc,runTransaction,terminate} from 'firebase/firestore';
const config=JSON.parse(fs.readFileSync('firebase-applet-config.json','utf8'));
const app=initializeApp(config),auth=getAuth(app),db=getFirestore(app,config.firestoreDatabaseId);
const duplicateId='FCeZiM7CYCJov60u0qlO',canonicalId='uHNlTYdBjsCSt1GVAOuh';
const read=async()=>Object.fromEntries(await Promise.all(['documentSubmissions','appointments','fieldTrips'].map(async c=>[c,(await getDocs(collection(db,c))).docs.map(d=>({...d.data(),id:d.id}))])));
try{
 await signInWithEmailAndPassword(auth,process.env.UTT_TARGET_EMAIL,process.env.UTT_TARGET_PASSWORD);
 const before=await read(),stamp=new Date().toISOString().replace(/[:.]/g,'-');
 fs.writeFileSync(`backup/before-nampad-consolidation-${stamp}.json`,JSON.stringify(before,null,2));
 const refs=[doc(db,'documentSubmissions',duplicateId),doc(db,'documentSubmissions',canonicalId)];
 const children=['appointments','fieldTrips'].flatMap(c=>before[c].filter(r=>r.submissionId===duplicateId).map(r=>doc(db,c,r.id)));
 await runTransaction(db,async tx=>{
  const snapshots=await Promise.all([...refs,...children].map(r=>tx.get(r)));
  const [duplicate,canonical]=snapshots.slice(0,2).map(s=>s.data());
  if(!duplicate||!canonical)throw Error('Missing source records');
  for(const key of ['schoolId','submissionDate','submissionTime','documentNumber','teamId'])if(duplicate[key]!==canonical[key])throw Error('Identity mismatch: '+key);
  if(!duplicate.photos.some(p=>canonical.photos.some(q=>p.fileName===q.fileName)))throw Error('Evidence does not match');
  for(const key of ['appointmentId','fieldTripId'])if(canonical[key]&&canonical[key]!==duplicate[key])throw Error('Conflicting relationship');
  const now=new Date().toISOString();
  tx.update(refs[1],{sourceSystem:duplicate.sourceSystem,sourceRecordId:duplicate.sourceRecordId,sourceUrl:duplicate.sourceUrl,appointmentId:duplicate.appointmentId,fieldTripId:duplicate.fieldTripId,mergedFromIds:[duplicateId],updatedAt:now});
  tx.update(refs[0],{mergedIntoId:canonicalId,mergeReason:'Verified same school, letter number, date, time and evidence filename',updatedAt:now});
  children.forEach((ref,i)=>{if(snapshots[i+2].data()?.submissionId!==duplicateId)throw Error('Relationship changed');tx.update(ref,{submissionId:canonicalId,updatedAt:now});});
 });
 const after=await read();fs.writeFileSync(`backup/after-nampad-consolidation-${stamp}.json`,JSON.stringify(after,null,2));
 if(after.documentSubmissions.find(r=>r.id===duplicateId)?.mergedIntoId!==canonicalId)throw Error('Verification failed');
 if(['appointments','fieldTrips'].some(c=>after[c].some(r=>r.submissionId===duplicateId)))throw Error('Unmigrated reference');
 console.log('Verified duplicate consolidation; original records/photos preserved; '+children.length+' relationships updated.');
}finally{await signOut(auth);await terminate(db);}
