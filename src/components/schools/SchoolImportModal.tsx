import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, Upload, Search, ChevronLeft, ChevronRight, CheckCircle2, FileSpreadsheet, MapPin, Loader2, AlertCircle } from 'lucide-react';
import type { School, TeamId } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { ImportSchool, ImportFilters, emptyFilters, filterSchools, duplicateKeys } from '../../utils/schoolImportData';
import { importSelectedSchools, SchoolImportResult } from '../../firebase/schoolImportService';
interface Props { isOpen:boolean;onClose:()=>void;onSuccess:()=>void;existingSchools:School[]; }
const fmt=(n:number)=>n.toLocaleString('th-TH');
const inputClass='w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:bg-slate-100';
export const SchoolImportModal:React.FC<Props> = props => props.isOpen ? <ImportDialog {...props}/> : null;
function ImportDialog({onClose,onSuccess,existingSchools}:Props) {
  const {currentUser,canEdit}=useAuth();
  const [step,setStep]=useState(1);const [file,setFile]=useState<File|null>(null);
  const [rows,setRows]=useState<ImportSchool[]>([]);const [sheets,setSheets]=useState<string[]>([]);const [sheet,setSheet]=useState('');
  const [filters,setFilters]=useState<ImportFilters>({...emptyFilters});const [selected,setSelected]=useState<Set<string>>(new Set());
  const [completed,setCompleted]=useState<Set<string>>(new Set());const [page,setPage]=useState(0);
  const [parsing,setParsing]=useState(false);const [error,setError]=useState('');const [busy,setBusy]=useState(false);const [done,setDone]=useState(0);
  const [team,setTeam]=useState<TeamId>(currentUser?.teamId||'team1');const [year,setYear]=useState(String(new Date().getFullYear()+543));
  const [processingRows,setProcessingRows]=useState<ImportSchool[]>([]);
  const [result,setResult]=useState<SchoolImportResult|null>(null);
  const worker=useRef<Worker|null>(null);const dialog=useRef<HTMLDivElement>(null);const fileInput=useRef<HTMLInputElement>(null);const version=useRef(0);
  useEffect(()=>{const old=document.activeElement as HTMLElement;const overflow=document.body.style.overflow;document.body.style.overflow="hidden";dialog.current?.focus();return()=>{document.body.style.overflow=overflow;worker.current?.terminate();version.current++;old?.focus();};},[]);
  const duplicates=useMemo(()=>duplicateKeys(rows,existingSchools),[rows,existingSchools]);
  const matched=useMemo(()=>filterSchools(rows,filters),[rows,filters]);
  const eligible=useMemo(()=>matched.filter(r=>!r.issues.length&&!duplicates.has(r.key)&&!completed.has(r.key)),[matched,duplicates,completed]);
  const chosen=useMemo(()=>rows.filter(r=>selected.has(r.key)&&!duplicates.has(r.key)&&!completed.has(r.key)),[rows,selected,duplicates,completed]);
  const shown=matched.slice(page*50,(page+1)*50);const pages=Math.max(1,Math.ceil(matched.length/50));
  const options=(field:keyof ImportSchool, list:ImportSchool[]=rows)=>Array.from(new Set(list.map(r=>String(r[field])).filter(Boolean))).sort((a,b)=>a.localeCompare(b,'th'));
  const geography=useMemo(()=>({
    regions:options('region'),
    provinces:options('province',rows.filter(r=>!filters.region||r.region===filters.region)),
    districts:options('district',rows.filter(r=>(!filters.region||r.region===filters.region)&&r.province===filters.province)),
    subdistricts:options('subdistrict',rows.filter(r=>r.province===filters.province&&r.district===filters.district)),
    types:options('schoolType'),sizes:options('schoolSize'),opportunities:options('opportunity'),
  }),[rows,filters.region,filters.province,filters.district]);
  function change(field:keyof ImportFilters,value:string) {
    setFilters(f=>({...f,[field]:value,...(field==='region'?{province:'',district:'',subdistrict:''}:field==='province'?{district:'',subdistrict:''}:field==='district'?{subdistrict:''}:{})}));
    setSelected(new Set());setPage(0);
  }
  async function parse(next:File,chosenSheet?:string) {
    const request=++version.current;worker.current?.terminate();setParsing(false);setError('');setRows([]);setSelected(new Set());setCompleted(new Set());setFilters({...emptyFilters});setPage(0);setStep(1);setResult(null);
    if(!/\.(xlsx|xls|csv)$/i.test(next.name)){setError('เลือกไฟล์ .xlsx, .xls หรือ .csv เท่านั้น');return;}
    if(next.size>25*1024*1024){setError('ไฟล์ต้องมีขนาดไม่เกิน 25 MB');return;}
    setFile(next);setParsing(true);
    try {
      const buffer=await next.arrayBuffer();if(request!==version.current)return;
      const w=new Worker(new URL('../../utils/schoolImport.worker.ts',import.meta.url),{type:'module'});worker.current=w;
      w.onmessage=event=>{if(request!==version.current)return;setParsing(false);w.terminate();if(event.data.error){setError(event.data.error);return;}setRows(event.data.rows);setSheets(event.data.sheets);setSheet(event.data.sheet);setStep(2);};
      w.onerror=()=>{if(request!==version.current)return;setParsing(false);w.terminate();setError('อ่านไฟล์ไม่สำเร็จ กรุณาตรวจสอบไฟล์แล้วเลือกใหม่');};
      w.postMessage({buffer,sheet:chosenSheet},[buffer]);
    }catch {if(request===version.current){setParsing(false);setError('เปิดไฟล์ไม่ได้ กรุณาเลือกไฟล์อีกครั้ง');}}
  }
  function toggle(row:ImportSchool) {setSelected(old=>{const next=new Set(old);if(next.has(row.key))next.delete(row.key);else if(next.size<500)next.add(row.key);return next;});}
  async function save() {
    if(!currentUser||!canEdit||busy)return;
    setProcessingRows(chosen);setBusy(true);setError('');setDone(0);
    try { const outcome=await importSelectedSchools(chosen,currentUser,team,year,file?.name||'',setDone);setResult(outcome);setCompleted(old=>new Set([...old,...outcome.imported,...outcome.skipped]));setStep(4);onSuccess();}
    catch(e){setError(e instanceof Error?e.message:'นำเข้าไม่สำเร็จ');}finally{setBusy(false);}
  }
  const reviewRows=busy?processingRows:chosen;
  const select=(label:string,field:keyof ImportFilters,values:string[],disabled=false)=><label className="text-xs font-semibold text-slate-600 space-y-1.5"><span>{label}</span><select aria-label={label} className={inputClass} value={filters[field]} disabled={disabled} onChange={e=>change(field,e.target.value)}><option value="">ทั้งหมด</option>{values.map(v=><option key={v} value={v}>{v}</option>)}</select></label>;
  return <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-2 sm:p-5">
    <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="import-heading" tabIndex={-1} className="w-full max-w-6xl h-[94vh] rounded-2xl bg-slate-50 shadow-2xl flex flex-col overflow-hidden outline-none" onKeyDown={e=>{
      if(e.key==='Escape'&&!busy)onClose();
      if(e.key==='Tab'){const nodes=(Array.from(dialog.current?.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex="0"]')||[]) as HTMLElement[]).filter(el=>el.getClientRects().length);const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}
    }}>
      <header className="bg-white border-b border-slate-200 px-5 py-4 flex items-start justify-between gap-3"><div><div className="flex items-center gap-2 text-sky-700"><FileSpreadsheet size={22}/><h2 id="import-heading" className="text-lg font-bold">เลือกโรงเรียนจาก Excel</h2></div><p className="mt-1 text-xs text-slate-500">คัดเลือกพื้นที่เป้าหมาย แล้วนำเข้าเฉพาะโรงเรียนที่ต้องการ</p></div><button aria-label="ปิดหน้าต่างนำเข้า" disabled={busy} onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30"><X size={20}/></button></header>
      <ol className="flex gap-3 px-5 py-3 border-b bg-white text-xs sm:text-sm">{['เลือกไฟล์','เลือกโรงเรียน','ตรวจสอบและนำเข้า'].map((s,i)=><li key={s} className={`flex items-center gap-2 ${step>=i+1?'text-sky-700 font-semibold':'text-slate-400'}`}><span className={`w-6 h-6 flex items-center justify-center rounded-full ${step>=i+1?'bg-sky-100':'bg-slate-100'}`}>{i+1}</span>{s}</li>)}</ol>
      <main className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
        {error&&<p role="alert" className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{error}</p>}
        {!canEdit?<p>บัญชีนี้ไม่มีสิทธิ์นำเข้าโรงเรียน</p>:step===1?<>
          <div className="rounded-2xl border-2 border-dashed border-sky-200 bg-white py-14 px-6 text-center" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();if(e.dataTransfer.files[0])parse(e.dataTransfer.files[0]);}}>
            {parsing?<Loader2 className="mx-auto text-sky-600 animate-spin" size={40}/>:<Upload className="mx-auto text-sky-600" size={40}/>}
            <h3 className="font-bold text-slate-800 mt-4">{parsing?'กำลังอ่านข้อมูลโรงเรียน…':'เริ่มจากไฟล์รายชื่อโรงเรียน'}</h3>
            <p className="text-sm text-slate-500 mt-2">{parsing?file?.name:'ลากไฟล์มาวาง หรือเลือกไฟล์ DMC / แบบฟอร์มรายชื่อโรงเรียน'}</p>
            <input ref={fileInput} aria-label="ไฟล์รายชื่อโรงเรียน" type="file" accept=".xlsx,.xls,.csv" className="sr-only" onChange={e=>{if(e.target.files?.[0])parse(e.target.files[0]);}}/>
            <button disabled={parsing} onClick={()=>fileInput.current?.click()} className="bg-sky-700 text-white px-6 py-2.5 rounded-xl mt-5 disabled:opacity-40">เลือกไฟล์จากเครื่อง</button>
            <p className="text-xs text-slate-400 mt-4">สูงสุด 25 MB • ประมวลผลไฟล์บนเครื่องของคุณ • ยังไม่บันทึกลงฐานข้อมูล</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">{['เลือกได้ทั้งภาค จังหวัด อำเภอ และตำบล','ดูจำนวนนักเรียน ม.3 / ม.6 ก่อนเลือก','ข้ามข้อมูลซ้ำ โดยไม่ทับประวัติเดิม'].map(t=><p key={t} className="bg-white p-4 rounded-xl border text-sm text-slate-600 flex gap-2"><CheckCircle2 size={18} className="text-emerald-600 shrink-0"/>{t}</p>)}</div>
        </>:step===2?<>
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm"><div><span className="font-semibold">{file?.name}</span><span className="text-slate-500 ml-2">{fmt(rows.length)} โรงเรียน</span></div><div className="flex gap-3 items-center">{sheets.length>1&&<select aria-label="แผ่นงาน" className={inputClass} value={sheet} onChange={e=>file&&parse(file,e.target.value)}>{sheets.map(s=><option key={s}>{s}</option>)}</select>}<button className="text-sky-700 underline whitespace-nowrap" onClick={()=>{setStep(1);setRows([]);setSelected(new Set());}}>เปลี่ยนไฟล์</button></div></div>
          <section className="bg-white border border-slate-200 rounded-2xl p-4 space-y-4"><div className="flex items-center justify-between gap-2 flex-wrap"><h3 className="font-bold text-slate-800 flex gap-2"><MapPin size={18}/>พื้นที่ที่ต้องการ</h3><div className="flex gap-3 text-xs">{rows.some(r=>r.province==='อุตรดิตถ์')&&<button className="bg-sky-50 text-sky-700 px-3 py-1.5 rounded-full" onClick={()=>{setFilters({...emptyFilters,province:'อุตรดิตถ์'});setSelected(new Set());setPage(0);}}>เลือกจังหวัดอุตรดิตถ์</button>}<button className="text-slate-500 underline" onClick={()=>{setFilters({...emptyFilters});setSelected(new Set());setPage(0);}}>ล้างตัวกรอง</button></div></div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{select('ภาค','region',geography.regions)}{select('จังหวัด','province',geography.provinces)}{select('อำเภอ / เขต','district',geography.districts,!filters.province)}{select('ตำบล / แขวง','subdistrict',geography.subdistricts,!filters.district)}</div>
            <div className="flex flex-col sm:flex-row gap-3"><label className="relative flex-1"><Search size={17} className="absolute left-3 top-3 text-slate-400"/><input aria-label="ค้นหาโรงเรียน" placeholder="ค้นหาชื่อโรงเรียน รหัส หรือเขตพื้นที่การศึกษา" className={`${inputClass} pl-9`} value={filters.search} onChange={e=>change('search',e.target.value)}/></label><select aria-label="กลุ่มนักเรียนเป้าหมาย" className={`${inputClass} sm:!w-60`} value={filters.target} onChange={e=>change('target',e.target.value)}><option value="">ทุกระดับชั้น</option><option value="m3">มีนักเรียน ม.3</option><option value="m6">มีนักเรียน ม.6</option><option value="either">มีนักเรียน ม.3 หรือ ม.6</option></select></div>
            <details><summary className="cursor-pointer text-sm text-sky-700">ตัวกรองเพิ่มเติม: สังกัด ขนาด ขยายโอกาส</summary><div className="grid sm:grid-cols-3 gap-3 mt-3">{select('สังกัด','schoolType',geography.types)}{select('ขนาดโรงเรียน','schoolSize',geography.sizes)}{select('ขยายโอกาส','opportunity',geography.opportunities)}</div></details>
          </section>
          <div className="flex justify-between flex-wrap gap-2 text-sm"><p>พบ <b>{fmt(matched.length)}</b> แห่ง · เลือกได้ <b className="text-sky-700">{fmt(eligible.length)}</b> แห่ง</p><p className="text-xs text-slate-500">เปลี่ยนตัวกรองแล้วรายการที่เลือกจะถูกล้าง • สูงสุด 500 แห่งต่อครั้ง</p></div>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden"><div className="bg-slate-50 border-b p-3 flex gap-4 text-xs"><button disabled={!eligible.length||eligible.length>500} className="font-semibold text-sky-700 disabled:text-slate-400" onClick={()=>setSelected(new Set(eligible.map(r=>r.key)))}>เลือกทั้งหมดตามตัวกรอง ({fmt(eligible.length)})</button><button className="text-slate-500 underline" onClick={()=>setSelected(new Set())}>ยกเลิกทั้งหมด</button>{eligible.length>500&&<span className="text-amber-700">กรองพื้นที่ให้แคบลง หรือเลือกทีละแห่ง</span>}</div>
            <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="p-3">เลือก</th><th className="p-3">โรงเรียน / รหัส</th><th className="p-3">จังหวัด / อำเภอ</th><th className="p-3 text-right">ม.3</th><th className="p-3 text-right">ม.6</th><th className="p-3">สถานะ</th></tr></thead><tbody>{shown.map(r=>{const duplicate=duplicates.has(r.key)||completed.has(r.key);const invalid=!!r.issues.length;return <tr key={r.key} className={`border-t border-slate-100 ${selected.has(r.key)?'bg-sky-50':duplicate||invalid?'bg-slate-50 text-slate-400':'hover:bg-slate-50'}`}><td className="p-3"><input type="checkbox" aria-label={`เลือก ${r.schoolName}`} checked={selected.has(r.key)&&!duplicate} disabled={duplicate||invalid||(!selected.has(r.key)&&selected.size>=500)} onChange={()=>toggle(r)} className="w-4 h-4 accent-sky-700"/></td><td className="p-3"><p className="font-medium">{r.schoolName}</p><p className="text-xs text-slate-400">{r.schoolId||'ไม่มีรหัส'} · {r.educationLevels||'ไม่ระบุระดับ'}</p></td><td className="p-3 whitespace-nowrap">{r.province}<p className="text-xs text-slate-400">{r.district} {r.subdistrict&&`· ${r.subdistrict}`}</p></td><td className="p-3 text-right tabular-nums">{fmt(r.studentM3)}</td><td className="p-3 text-right tabular-nums">{fmt(r.studentM6)}</td><td className="p-3 text-xs"><span className={invalid?'text-red-600':duplicate?'text-amber-700':'text-emerald-700'}>{invalid?r.issues.join(', '):duplicate?'มีแล้ว / ซ้ำในไฟล์':'พร้อมนำเข้า'}</span></td></tr>;})}</tbody></table></div>
            {!matched.length&&<p className="text-center p-10 text-slate-500">ไม่พบโรงเรียนตามตัวกรอง ลองล้างตัวกรองหรือเปลี่ยนคำค้นหา</p>}
            <div className="flex items-center justify-between p-3 border-t text-xs text-slate-500"><span>หน้า {page+1} / {fmt(pages)} · 50 แห่งต่อหน้า</span><div className="flex gap-3"><button aria-label="หน้าก่อนหน้า" disabled={!page} onClick={()=>setPage(p=>p-1)} className="disabled:opacity-30"><ChevronLeft size={20}/></button><button aria-label="หน้าถัดไป" disabled={page+1>=pages} onClick={()=>setPage(p=>p+1)} className="disabled:opacity-30"><ChevronRight size={20}/></button></div></div>
          </div>
        </>:step===3?<section className="bg-white p-5 rounded-2xl border space-y-5"><h3 className="text-lg font-bold">ตรวจสอบก่อนนำเข้า {fmt(reviewRows.length)} โรงเรียน</h3><p className="text-sm text-slate-500">เพิ่มเป็นโรงเรียนใหม่ สถานะ “ยังไม่ดำเนินการ” และข้ามรายการที่มีในระบบแล้ว</p><div className="grid sm:grid-cols-2 gap-4"><label className="text-sm space-y-2 block">มอบหมายสายงาน<select aria-label="มอบหมายสายงาน" disabled={busy} className={inputClass} value={team} onChange={e=>setTeam(e.target.value as TeamId)}><option value="team1">สายที่ 1</option><option value="team2">สายที่ 2</option></select></label><label className="text-sm space-y-2 block">ปีการศึกษา พ.ศ.<input aria-label="ปีการศึกษานำเข้า" disabled={busy} inputMode="numeric" maxLength={4} className={inputClass} value={year} onChange={e=>setYear(e.target.value)}/></label></div><div className="bg-sky-50 rounded-xl p-4 text-sm text-sky-800">{fmt(reviewRows.reduce((n,r)=>n+r.studentM3,0))} คน ระดับ ม.3 · {fmt(reviewRows.reduce((n,r)=>n+r.studentM6,0))} คน ระดับ ม.6</div><ul className="max-h-64 overflow-y-auto divide-y">{reviewRows.map(r=><li key={r.key} className="py-2 text-sm flex justify-between gap-3"><span>{r.schoolName}</span><span className="text-slate-500">{r.district} · {r.province}</span></li>)}</ul>{busy&&<div role="status" className="text-sky-700"><progress className="w-full" max={reviewRows.length} value={done}/><p>กำลังบันทึก {done} / {reviewRows.length} กรุณาอย่าปิดหน้านี้</p></div>}</section>:<section className="bg-white border rounded-2xl p-6 text-center space-y-4"><CheckCircle2 size={44} className="mx-auto text-emerald-600"/><h3 className="font-bold text-xl">สรุปผลการนำเข้า</h3><div className="grid grid-cols-3 gap-3"><p className="p-4 rounded-xl bg-emerald-50 text-emerald-700">เพิ่มสำเร็จ<br/><b className="text-2xl">{result?.imported.length||0}</b></p><p className="p-4 rounded-xl bg-amber-50 text-amber-700">ข้ามข้อมูลซ้ำ<br/><b className="text-2xl">{result?.skipped.length||0}</b></p><p className="p-4 rounded-xl bg-red-50 text-red-700">ไม่สำเร็จ<br/><b className="text-2xl">{result?.failed.length||0}</b></p></div>{!!result?.failed.length&&<><p className="text-sm text-red-700">รายการที่บันทึกแล้วจะไม่ถูกนำเข้าซ้ำ คุณสามารถลองเฉพาะรายการที่ไม่สำเร็จอีกครั้ง</p><ul className="text-left max-h-40 overflow-y-auto text-xs text-red-600">{result.failed.map(r=><li key={r.key}>{r.name}: {r.message}</li>)}</ul><button className="text-sky-700 underline" onClick={()=>{setSelected(new Set(result.failed.map(r=>r.key)));setStep(3);}}>ลองรายการที่ไม่สำเร็จอีกครั้ง</button></>}</section>}
      </main>
      <footer className="bg-white border-t px-5 py-4 flex items-center justify-between gap-3"><div className="text-sm">{step===2&&<>เลือกแล้ว <b className="text-sky-700">{fmt(chosen.length)}</b> แห่ง</>}{step===3&&<button disabled={busy} onClick={()=>{setStep(2);setError('');}} className="text-slate-600 disabled:opacity-30">← กลับไปเลือกโรงเรียน</button>}</div><div className="flex gap-3"><button disabled={busy} onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm disabled:opacity-30">{step===4?'ปิด':'ยกเลิก'}</button>{step===2&&<button disabled={!chosen.length||!canEdit} onClick={()=>setStep(3)} className="bg-sky-700 text-white rounded-xl px-5 py-2 text-sm font-semibold disabled:opacity-40">ตรวจสอบ {fmt(chosen.length)} โรงเรียน →</button>}{step===3&&<button disabled={busy||!chosen.length||!/^25\d{2}$/.test(year)||!canEdit} onClick={save} className="bg-sky-700 text-white rounded-xl px-5 py-2 text-sm font-semibold disabled:opacity-40">{busy?'กำลังนำเข้า…':`ยืนยันนำเข้า ${fmt(chosen.length)} โรงเรียน`}</button>}</div></footer>
    </div>
  </div>;
}
