import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import type { School, TeamId } from '../../types';
import { filterSchoolChoices } from '../../utils/schoolChoices';
interface Props { schools:School[];value:string;onChange:(id:string)=>void;required?:boolean;disabled?:boolean; }
export function SchoolPicker({schools,value,onChange,required=true,disabled=false}:Props) {
  const [team,setTeam]=useState<TeamId|'all'>('all');
  const [query,setQuery]=useState('');
  const results=useMemo(()=>filterSchoolChoices(schools,team,query),[schools,team,query]);
  const selected=schools.find(s=>s.id===value);
  return <div className="space-y-2" data-school-picker>
    <div role="group" aria-label="กรองโรงเรียนตามสาย" className="flex flex-wrap gap-1.5">
      {([['all','ทุกสาย'],['team1','สาย 1: อุตรดิตถ์'],['team2','สาย 2: สุโขทัย']] as const).map(([id,label])=><button key={id} type="button" disabled={disabled} aria-pressed={team===id} onClick={()=>{setTeam(id);if(selected&&id!=='all'&&selected.teamId!==id)onChange('');}} className={`rounded-lg px-3 py-2 text-xs font-semibold border transition-colors disabled:opacity-50 ${team===id?'bg-sky-700 border-sky-700 text-white':'bg-white border-slate-200 text-slate-600 hover:bg-sky-50'}`}>{label}</button>)}
    </div>
    <div className="relative"><Search size={16} className="absolute left-3 top-3 text-slate-400"/><input type="search" aria-label="ค้นหาชื่อโรงเรียน" value={query} disabled={disabled} onChange={e=>{setQuery(e.target.value);if(value)onChange('');}} placeholder="พิมพ์ชื่อโรงเรียน รหัส หรืออำเภอ…" className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:ring-2 focus:ring-sky-500 outline-none"/></div>
    <select aria-label="ผลการค้นหาโรงเรียน" value={results.some(s=>s.id===value)?value:''} onChange={e=>onChange(e.target.value)} size={Math.max(2, Math.min(5, results.length + 1))} required={required} disabled={disabled} className="w-full rounded-xl border border-slate-300 bg-white p-1 text-sm focus:ring-2 focus:ring-sky-500 outline-none">
      <option value="" disabled>— เลือกโรงเรียนจากรายการ —</option>
      {results.map(s=><option key={s.id} value={s.id} className="px-3 py-2 rounded-lg">{s.schoolName} · {s.teamId==='team1'?'อุตรดิตถ์':'สุโขทัย'}{s.district?` · ${s.district}`:''}</option>)}
    </select>
    <div className="flex flex-wrap justify-between gap-1 text-xs text-slate-500"><span role="status">{results.length?`พบ ${results.length.toLocaleString('th-TH')} โรงเรียน`:'ไม่พบโรงเรียน ลองเปลี่ยนคำค้นหรือเลือกทุกสาย'}</span>{selected&&<span className="text-sky-700">เลือก: {selected.schoolName}</span>}</div>
  </div>;
}
