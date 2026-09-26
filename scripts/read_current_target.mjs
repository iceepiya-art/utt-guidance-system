import fs from 'node:fs';
import {initializeApp} from 'firebase/app';
import {getAuth,signInWithEmailAndPassword,signOut} from 'firebase/auth';
import {getFirestore,collection,getDocs,terminate} from 'firebase/firestore';
const config=JSON.parse(fs.readFileSync('firebase-applet-config.json','utf8'));
const app=initializeApp(config);const auth=getAuth(app);const db=getFirestore(app,config.firestoreDatabaseId);
try {
 const credential=process.env.UTT_TARGET_EMAIL && process.env.UTT_TARGET_PASSWORD
   ? {email:process.env.UTT_TARGET_EMAIL,password:process.env.UTT_TARGET_PASSWORD}
   : JSON.parse(fs.readFileSync('.env.initial-admin','utf8'));
 await signInWithEmailAndPassword(auth,credential.email,credential.password);
 const snapshot={readAt:new Date().toISOString(),projectId:config.projectId,databaseId:config.firestoreDatabaseId};
 for(const name of ['schools','documentSubmissions','appointments','fieldTrips','vehicles']){
  const result=await getDocs(collection(db,name));snapshot[name]=result.docs.map(d=>({...d.data(),id:d.id,sourcePath:d.ref.path}));
  console.log(name+': '+result.size);
 }
 fs.mkdirSync('backup',{recursive:true});fs.writeFileSync('backup/target-current-2026-09-23.json',JSON.stringify(snapshot,null,2));
 console.log('Read-only target snapshot saved');
}catch(error){console.error('Target read failed: '+(error.code||error.name));process.exitCode=1;}
finally{await signOut(auth);await terminate(db);}
