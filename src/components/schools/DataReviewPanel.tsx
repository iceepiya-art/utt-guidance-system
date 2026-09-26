import React, { useMemo, useState } from 'react';
import type { DataReviewItem, DataReviewTarget, ReviewType } from '../../utils/dataCompleteness';
import { reviewTypeLabel } from '../../utils/dataCompleteness';
import { formatThaiShortDate } from '../../utils/dateUtils';

export function DataReviewPanel({ items, ready, onOpen }: { items: DataReviewItem[]; ready: boolean; onOpen?: (target: DataReviewTarget) => void }) {
  const [filter, setFilter] = useState<'all' | 'links' | ReviewType>('all');
  const [search,setSearch] = useState('');
  const [limit,setLimit] = useState(20);
  const filtered = useMemo(() => items.filter(i => (filter === 'all' || (filter === 'links' ? i.links.length > 0 : i.type === filter)) && i.label.toLocaleLowerCase('th').includes(search.trim().toLocaleLowerCase('th'))), [items,filter,search]);
  return <details className="rounded-2xl border border-amber-200 bg-white shadow-sm">
    <summary className="cursor-pointer p-4 font-semibold text-slate-800">ตรวจข้อมูลที่ต้องเติม {ready ? `(${items.length} รายการ)` : '— กำลังรอข้อมูลครบทุกส่วน'}</summary>
    {ready && <div className="px-4 pb-4 space-y-3">
      <p className="text-sm text-slate-600">ตรวจจากข้อมูลที่โหลดในระบบ แยกข้อมูลขาดกับการเชื่อมโยง ไม่ถือว่าโรงเรียนที่ยังไม่นัดหมายหรือยังไม่ออกแนะแนวเป็นข้อมูลผิด และไม่บังคับข้อมูล ม.6 ของโรงเรียนที่ไม่ได้เปิดสอน</p>
      <div className="flex flex-wrap gap-3">
        <label className="text-sm">ดูรายการ<select aria-label="ประเภทข้อมูลที่ต้องเติม" className="ml-2 border rounded-lg p-2" value={filter} onChange={e=>{setFilter(e.target.value as typeof filter);setLimit(20);}}><option value="all">ทั้งหมด</option><option value="links">การเชื่อมโยง</option>{(['SCHOOL','SUBMISSION','APPOINTMENT','GUIDANCE'] as const).map(t=><option key={t} value={t}>{reviewTypeLabel(t)}</option>)}</select></label>
        <input aria-label="ค้นหารายการข้อมูลที่ต้องเติม" placeholder="ค้นหาชื่อโรงเรียน" value={search} onChange={e=>{setSearch(e.target.value);setLimit(20);}} className="min-w-0 border rounded-lg p-2 flex-1" />
      </div>
      <p className="text-sm">พบ {filtered.length} รายการ · {items.filter(i=>i.links.length).length} รายการมีปัญหาการเชื่อมโยง</p>
      {!filtered.length && <p className="p-3 rounded-lg bg-emerald-50 text-emerald-800">ไม่พบข้อมูลขาดตามเงื่อนไขที่ตรวจ (ไม่ได้ตรวจความถูกต้องของเนื้อหารูปหรือโทรยืนยันเบอร์)</p>}
      <ul className="divide-y divide-slate-100">{filtered.slice(0,limit).map(i=><li key={`${i.type}:${i.id}`} className="py-3 flex flex-col sm:flex-row gap-3 justify-between">
        <div className="min-w-0"><div className="font-semibold">{i.label} <span className="text-xs text-slate-500">· {reviewTypeLabel(i.type)} {i.date ? formatThaiShortDate(i.date) : ''}</span></div>
          {!!i.missing.length && <p className="text-sm text-amber-800 mt-1">ข้อมูลที่ต้องเติม: {i.missing.join(' · ')}</p>}
          {!!i.links.length && <p className="text-sm text-red-700 mt-1">การเชื่อมโยง: {i.links.join(' · ')}</p>}
        </div>
        {onOpen && <button type="button" onClick={()=>onOpen({ type:i.type,id:i.id })} className="self-start shrink-0 text-sm rounded-lg border border-sky-200 px-3 py-2 text-sky-800 hover:bg-sky-50">ตรวจ / แก้ไข</button>}
      </li>)}</ul>
      {limit < filtered.length && <button type="button" onClick={()=>setLimit(limit+20)} className="text-sky-700 underline">แสดงเพิ่มอีก 20 รายการ</button>}
    </div>}
  </details>;
}
