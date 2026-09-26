import React, {useState} from 'react';
import july1 from '../../../docs/JULY_2026_TEAM1_CONFIRMED.json';
import july2 from '../../../docs/JULY_2026_TEAM2_CONFIRMED.json';
import august1 from '../../../docs/AUGUST_2026_TEAM1_REVIEW.json';
import august2 from '../../../docs/AUGUST_2026_TEAM2_REVIEW.json';
import './confirmedReportPreview.css';

const datasets = [july1, july2, august1, august2];
export default function ConfirmedReportPreview() {
  const [month,setMonth]=useState('2026-07');
  const [team,setTeam]=useState('all');
  const [work,setWork]=useState('all');
  const rows=datasets.filter(d=>d.month===month&&(team==='all'||d.team===team)).flatMap(d=>d.rows.map((r,index)=>({...r,team:d.team,key:`${d.month}:${d.team}:${index}`}))).filter(r=>work==='all'||(work==='guidance'?r.activity==='แนะแนว':r.activity!=='แนะแนว')).sort((a,b)=>a.date.localeCompare(b.date)||a.team.localeCompare(b.team));
  const title=`ประจำเดือน ${month==='2026-07'?'กรกฎาคม':'สิงหาคม'} พ.ศ. 2569`;
  const teamLabel=team==='all'?'ทุกสาย':team==='team1'?'อุตรดิตถ์ (สาย 1)':'สุโขทัย (สาย 2)';
  return <main className="confirmed-report">
    <header className="review-controls"><h1>รายงานประจำเดือน</h1><p>ฉบับตรวจจากตารางที่คุณให้ • ยังไม่ได้บันทึกฐานข้อมูลจริง</p><a href="/?view=system">กลับระบบหลัก</a></header>
    <section className="review-controls review-filters">
      <label>เดือน<select aria-label="เดือน" value={month} onChange={e=>setMonth(e.target.value)}><option value="2026-07">กรกฎาคม 2569</option><option value="2026-08">สิงหาคม 2569</option></select></label>
      <label>สายงาน<select aria-label="สายงาน" value={team} onChange={e=>setTeam(e.target.value)}><option value="all">ทุกสาย</option><option value="team1">อุตรดิตถ์ (สาย 1)</option><option value="team2">สุโขทัย (สาย 2)</option></select></label>
      <label>งานที่ปฏิบัติ<select aria-label="งานที่ปฏิบัติ" value={work} onChange={e=>setWork(e.target.value)}><option value="all">งานทั้งหมด</option><option value="submission">ยื่นหนังสือ</option><option value="guidance">แนะแนว</option></select></label>
      <button onClick={()=>window.print()}>พิมพ์ / บันทึก PDF</button>
    </section>
    <p className="review-controls" role="status">{rows.length} รายการ • ยื่นหนังสือ {rows.filter(r=>r.activity!=='แนะแนว').length} • แนะแนว {rows.filter(r=>r.activity==='แนะแนว').length}</p>
    <section className="review-paper"><h2>{title} — {teamLabel}</h2>
      <table><thead><tr>{['วัน','วัน/เดือน/ปี','ชื่อโรงเรียน','รถที่ใช้','งานที่ปฏิบัติ','อาจารย์แนะแนว'].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map(r=><tr key={r.key}><td data-label="วัน">{r.weekday}</td><td data-label="วัน/เดือน/ปี">{Number(r.date.slice(8))}/{Number(r.date.slice(5,7))}/2569</td><td data-label="ชื่อโรงเรียน">{r.schoolName}</td><td data-label="รถที่ใช้">{r.vehicleName}</td><td data-label="งานที่ปฏิบัติ">{r.activity}</td><td data-label="อาจารย์แนะแนว">{r.responsiblePeople.map(p=><div key={p}>{p}</div>)}</td></tr>)}</tbody></table>
      {!rows.length&&<p>ไม่มีรายการตามตัวกรอง</p>}
    </section>
    <p className="review-controls">รายการนี้ใช้ชื่อและข้อมูลตามตารางที่คุณให้ รูปหลักฐานยังต้องตรวจจากรายการต้นทางในระบบ</p>
  </main>;
}
