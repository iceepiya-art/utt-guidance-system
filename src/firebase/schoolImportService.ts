import { collection, doc, getDocs, runTransaction } from 'firebase/firestore';
import { db, auth } from './firebase';
import type { School, UserProfile, TeamId } from '../types';
import { ImportSchool, duplicateKeys, locationKey, toSchool } from '../utils/schoolImportData';
import { logActivity } from './dbService';
export interface SchoolImportResult { imported:string[]; skipped:string[]; failed:{key:string;name:string;message:string}[]; }
export async function importSelectedSchools(rows:ImportSchool[], user:UserProfile, team:TeamId, year:string, file:string, progress:(done:number)=>void):Promise<SchoolImportResult> {
  if(!user?.active||!['ADMIN','STAFF'].includes(user.role)||auth.currentUser?.uid!==user.id)throw new Error('บัญชีนี้ไม่มีสิทธิ์นำเข้าข้อมูล');
  if(rows.length>500||!rows.length)throw new Error('เลือกได้ครั้งละ 1–500 โรงเรียน');
  if(rows.some(r=>r.issues.length))throw new Error('มีรายการที่ข้อมูลไม่ครบ');
  if(!/^25\d{2}$/.test(year))throw new Error('ระบุปีการศึกษา พ.ศ. 4 หลัก');
  const fresh=await getDocs(collection(db,'schools'));
  const existing=fresh.docs.map(d=>({...d.data(),id:d.id} as School));
  const duplicate=duplicateKeys(rows,existing);
  const result:SchoolImportResult={imported:[],skipped:[],failed:[]};let cursor=0,done=0;
  await Promise.all(Array.from({length:Math.min(4,rows.length)},async()=>{
    while(cursor<rows.length) {
      const row=rows[cursor++];
      try {
        if(duplicate.has(row.key))result.skipped.push(row.key);
        else {
          // Stable IDs make simultaneous imports and retries non-destructive.
          const identity=row.schoolId ? `code:${row.schoolId}` : `location:${locationKey(row)}`;
          const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(identity));
          const id='import_'+Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,'0')).join('');
          const target=doc(db,'schools',id);
          const created=await runTransaction(db,async tx=>{
            if((await tx.get(target)).exists())return false;
            tx.set(target,{...toSchool(row,team,year,file),createdBy:user.displayName});return true;
          });
          (created?result.imported:result.skipped).push(row.key);
        }
      } catch(e) { result.failed.push({key:row.key,name:row.schoolName,message:e instanceof Error?e.message:'บันทึกไม่สำเร็จ'}); }
      progress(++done);
    }
  }));
  await logActivity(user.id,user.displayName,'นำเข้าโรงเรียนที่เลือก','school','selected-import',`${file}: เพิ่ม ${result.imported.length}, ข้ามซ้ำ ${result.skipped.length}, ไม่สำเร็จ ${result.failed.length}; ปี ${year}`);
  return result;
}
