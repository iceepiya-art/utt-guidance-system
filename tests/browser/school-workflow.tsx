import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { SchoolDetailModal } from '../../src/components/schools/SchoolDetailModal';
import type { School, Appointment, FieldTrip } from '../../src/types';
import '../../src/index.css';

const school = { id: 'qa-school', schoolId: '100001', schoolName: 'โรงเรียนตัวอย่างตรวจสถานะ', teamId: 'team1', createdAt: '2026-09-01', currentStatus: 'NOT_STARTED' } as School;
const appt = { id: 'qa-appointment', schoolId: '100001', status: 'CONFIRMED', date: '2026-09-02', startTime: '09:00', endTime: '10:00', counselorName: 'อาจารย์ตัวอย่าง', note: 'แนะแนวแล้ว', vehicleName: 'MITSU บน 6738', photos: [{url:'/photos/guidance/IMG_2642.jpeg'}] } as Appointment;
const trip = { id: 'qa-trip', date: '2026-09-02', workType: 'แนะแนว', schools: [{ schoolId: '100001', schoolName: 'ชื่อเดิม' }], counselorName: 'อาจารย์ตัวอย่าง', vehicleName: 'รถที่บันทึกจริง' } as FieldTrip;
function Fixture() {
  const [mode,setMode] = useState('active');
  return <><div style={{ position: 'fixed', zIndex: 100, left: 0, top: 0, background: 'white' }}><label>ข้อมูลสมมติ<select aria-label="กรณีทดสอบ" value={mode} onChange={e=>setMode(e.target.value)}>{['active','trip','legacy','cancelled'].map(v=><option key={v}>{v}</option>)}</select></label></div>
    <SchoolDetailModal school={school} schools={[school]} submissions={[]} appointments={[{...appt,status: mode==='legacy' ? 'COMPLETED' : mode==='cancelled' ? 'CANCELLED' : 'CONFIRMED'}]} fieldTrips={mode==='trip' ? [trip] : []} onClose={()=>{}} onEdit={()=>{}} onNewSubmissionForSchool={()=>{}} onNewAppointmentForSchool={()=>{}} />
  </>;
}
createRoot(document.getElementById('root')!).render(<Fixture />);
