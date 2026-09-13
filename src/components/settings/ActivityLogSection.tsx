import React, { useEffect, useState } from 'react';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import { ActivityLog } from '../../types';
export function ActivityLogSection() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  useEffect(() => onSnapshot(query(collection(db, 'activityLogs'), orderBy('timestamp', 'desc'), limit(50)), (snapshot) => {
    setLogs(snapshot.docs.map((item) => ({ ...item.data(), id: item.id } as ActivityLog)));
    setLoading(false);
    setError(false);
  }, () => { setError(true); setLoading(false); }), []);
  return <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
    <h2 className="font-bold text-slate-800">ประวัติการทำงานล่าสุด</h2>
    <p className="text-xs text-slate-500">แสดง 50 รายการล่าสุด สำหรับผู้ดูแลระบบ</p>
    {loading ? <p role="status">กำลังโหลดประวัติ...</p> : error ? <p role="alert" className="text-red-600">โหลดประวัติไม่สำเร็จ กรุณาตรวจสอบสิทธิ์และการเชื่อมต่อ</p> : logs.length === 0 ? <p className="text-sm text-slate-500">ยังไม่มีประวัติการทำงาน</p> : <div className="overflow-x-auto"><table className="w-full text-sm text-left">
      <thead><tr className="text-slate-500 border-b"><th className="py-3 pr-4">วันเวลา</th><th className="pr-4">ผู้ดำเนินการ</th><th className="pr-4">กิจกรรม</th><th>รายละเอียด</th></tr></thead>
      <tbody>{logs.map((log) => <tr key={log.id} className="border-b border-slate-100"><td className="py-3 pr-4 whitespace-nowrap">{Number.isNaN(Date.parse(log.timestamp)) ? '-' : new Date(log.timestamp).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}</td><td className="pr-4">{log.userName}</td><td className="pr-4">{log.action}</td><td>{log.details || '-'}</td></tr>)}</tbody>
    </table></div>}
  </section>;
}
