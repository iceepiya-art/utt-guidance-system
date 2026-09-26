import React, { useState } from 'react';
import type { SchoolActivityHistoryItem, SchoolHistoryTarget } from '../../utils/schoolActivityHistory';
import { formatThaiShortDate } from '../../utils/dateUtils';

export function SchoolTimelineStep({ title, items, summary, empty, onOpen }: {
  title: string; items: SchoolActivityHistoryItem[]; summary?: string; empty: string;
  onOpen: (target: SchoolHistoryTarget) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const panelId = React.useId();
  return <div className="relative">
    <div className={`absolute -left-6 top-0.5 w-4 h-4 rounded-full border-2 border-white ${items.length ? 'bg-emerald-500' : 'bg-slate-300'}`} />
    <button type="button" disabled={!items.length}
      aria-expanded={items.length > 1 ? expanded : undefined}
      aria-controls={items.length > 1 ? panelId : undefined}
      onClick={() => items.length === 1 ? onOpen(items[0]) : setExpanded(!expanded)}
      className="w-full text-left rounded-lg py-1 text-sm font-bold text-sky-800 disabled:text-slate-600 focus-visible:ring-2 focus-visible:ring-sky-500">
      {title}{items.length > 0 && <span className="ml-2 text-xs font-normal">มี {items.length} รายการ {expanded ? '▾' : '›'}</span>}
    </button>
    <p className="text-xs text-slate-500 mt-1">{items.length ? summary || `ล่าสุด ${formatThaiShortDate(items[0].date)}` : empty}</p>
    {items.length > 1 && expanded && <div id={panelId} role="region" aria-label={`เลือกรายการ ${title}`} className="mt-2 space-y-2 max-h-64 overflow-y-auto">
      {items.map(item => <button key={item.key} type="button" onClick={() => onOpen(item)}
        className="block w-full text-left rounded-xl border border-slate-200 bg-slate-50 p-3 hover:bg-sky-50 focus-visible:ring-2 focus-visible:ring-sky-500">
        <span className="block text-xs font-semibold">{formatThaiShortDate(item.date)} · {item.activityLabel}</span>
        <span className="block text-xs text-slate-600 mt-1">{item.responsiblePeople.map(p => p.name).join(', ') || 'ไม่ระบุผู้รับผิดชอบ'}</span>
        <span className="block text-xs text-slate-500">รถ: {item.vehicleName || 'ไม่ระบุ'}</span>
        <span className="block text-xs text-sky-700 mt-1">ดูรายละเอียด →</span>
      </button>)}
    </div>}
  </div>;
}
