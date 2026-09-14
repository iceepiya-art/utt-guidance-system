import { beforeEach, expect, it, vi } from 'vitest';
const state=vi.hoisted(()=>({store:new Map<string,unknown>(),writes:0,fail:false}));
vi.mock('../src/firebase/firebase',()=>({db:{},auth:{currentUser:{uid:'admin'}}}));
vi.mock('../src/firebase/dbService',()=>({logActivity:vi.fn(async()=>{})}));
vi.mock('firebase/firestore',()=>({
  collection:(_db:unknown,name:string)=>name,
  doc:(_db:unknown,_name:string,id:string)=>id,
  getDocs:vi.fn(async()=>({docs:[]})),
  runTransaction:vi.fn(async(_db:unknown,callback:Function)=>callback({
    get:async(id:string)=>({exists:()=>state.store.has(id)}),
    set:(id:string,data:unknown)=>{if(state.fail)throw new Error('Offline');state.store.set(id,data);state.writes++;}
  }))
}));
import { importSelectedSchools } from '../src/firebase/schoolImportService';
import { parseSchoolRows } from '../src/utils/schoolImportData';
import type { UserProfile } from '../src/types';
const user={id:'admin',displayName:'Admin',role:'ADMIN',active:true} as UserProfile;
const rows=parseSchoolRows([{'ชื่อโรงเรียน':'ทดสอบ','โรงเรียน':'1012345678','ชื่อจังหวัด':'อุตรดิตถ์','ชื่ออำเภอ':'พิชัย'}]);
beforeEach(()=>{state.store.clear();state.writes=0;state.fail=false;});
it('retries safely without overwriting an already imported document',async()=>{
  const a=await importSelectedSchools(rows,user,'team1','2569','DMC.xlsx',()=>{});
  const b=await importSelectedSchools(rows,user,'team2','2570','DMC.xlsx',()=>{});
  expect(a.imported).toHaveLength(1);expect(b.skipped).toHaveLength(1);expect(state.writes).toBe(1);
  expect([...state.store.values()][0]).toMatchObject({teamId:'team1',academicYear:'2569'});
});
it('reports failed rows and progress instead of claiming full success',async()=>{
  state.fail=true;const progress=vi.fn();const r=await importSelectedSchools(rows,user,'team1','2569','DMC.xlsx',progress);
  expect(r.imported).toEqual([]);expect(r.failed[0]).toMatchObject({key:'2',message:'Offline'});expect(progress).toHaveBeenCalledWith(1);
});
it('rejects viewer writes and oversized selections before writing',async()=>{
  await expect(importSelectedSchools(rows,{...user,role:'VIEWER'},'team1','2569','DMC.xlsx',()=>{})).rejects.toThrow('สิทธิ์');
  await expect(importSelectedSchools(Array(501).fill(rows[0]),user,'team1','2569','DMC.xlsx',()=>{})).rejects.toThrow('500');expect(state.writes).toBe(0);
});
