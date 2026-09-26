import React,{useState,useRef} from 'react';
import {createRoot} from 'react-dom/client';
import {SchoolDetailModal} from '../../src/components/schools/SchoolDetailModal';
import {AppointmentDetailContent} from '../../src/components/appointments/AppointmentDetailModal';
import {MonthlyReportsView} from '../../src/components/reports/MonthlyReportsView';
import type {School,Appointment,DocumentSubmission,FieldTrip} from '../../src/types';
import '../../src/index.css';
const school={id:'import_school_qa',schoolId:'1064620210',schoolName:'โรงเรียนทดสอบศูนย์กลาง',province:'สุโขทัย',district:'ศรีสัชนาลัย',teamId:'team2',teacherName:'ครูตัวอย่าง',teacherPhone:'',createdAt:'2026-09-01',currentStatus:'NOT_STARTED'} as School;
const photo={id:'photo',url:'/photos/guidance/IMG_2642.jpeg',fileName:'sample',uploadedAt:'2026-09-22'};
const sub={id:'letter-source',schoolId:school.id,schoolName:school.schoolName,submissionDate:'2026-09-01',submissionTime:'09:00',documentNumber:'HUB-LETTER-001',submittedByNames:['ครูหนึ่ง','ครูสอง'],teamId:'team2',status:'WAITING_APPOINTMENT',note:'LETTER-SOURCE-NOTE',photos:[photo]} as DocumentSubmission;
const appt={id:'appointment-source',schoolId:school.id,schoolName:school.schoolName,submissionId:sub.id,date:'2026-09-15',startTime:'13:00',endTime:'12:00',teamId:'team2',counselorName:'ครูหนึ่ง',status:'COMPLETED',note:'APPOINTMENT-SOURCE-NOTE',photos:[photo],reminders:[]} as Appointment;
const trip={id:'guidance-source',vehicleId:'',vehicleName:'',counselorId:'',createdAt:'2026-09-22',updatedAt:'2026-09-22',appointmentId:appt.id,date:'2026-09-22',teamId:'team2',workType:'แนะแนว',counselorName:'ครูหนึ่ง',summary:'GUIDANCE-SOURCE-NOTE',schools:[{schoolId:school.id,schoolName:school.schoolName,studentCount:21}],photos:[photo]} as FieldTrip;
const next={...sub,id:'next-letter',submissionDate:'2027-09-01',documentNumber:'NEXT-CYCLE'};
function Fixture(){
 const [mode,setMode]=useState('hub');const [cycle,setCycle]=useState('current');const [selected,setSelected]=useState<Appointment|null>(null);const [action,setAction]=useState('');const focus=useRef<HTMLElement|null>(null);
 const subs=cycle==='empty'?[]:cycle==='other'?[{...sub,status:'OTHER_ACTIVITY' as const,otherActivityDetails:'Open House'}]:cycle==='next'||cycle==='multiple'?[sub,next]:[sub];const appts=cycle==='empty'||cycle==='other'?[]:cycle==='multiple'?[appt,{...appt,id:'second-appointment',date:'2027-09-15',note:'SECOND-APPOINTMENT'}]:cycle==='active'?[{...appt,status:'CONFIRMED' as const}]:[appt];const trips=cycle==='empty'||cycle==='other'?[]:cycle==='active'||cycle==='legacy'?[]:cycle==='multiple'?[trip,{...trip,id:'second-trip',date:'2027-09-22',summary:'SECOND-GUIDANCE'}]:[trip];
 return <><nav style={{position:'fixed',zIndex:100,top:0,left:0,background:'white'}}><button onClick={()=>setMode(mode==='hub'?'report':'hub')}>สลับรายงาน</button><select aria-label="รอบทดสอบ" value={cycle} onChange={e=>setCycle(e.target.value)}><option value="empty">โรงเรียนอย่างเดียว</option><option value="other">กิจกรรมอื่น</option><option value="current">รอบเดิม</option><option value="next">รอบใหม่</option><option value="active">มีนัดหมาย</option><option value="multiple">หลายรายการ</option><option value="legacy">นัดหมายเก่าไม่มีผล</option></select></nav><output>{action}</output>
 {mode==='hub'?<SchoolDetailModal school={school} schools={[school]} submissions={subs} appointments={appts} fieldTrips={trips} onClose={()=>setAction('closed')} onEdit={()=>setAction('edit')} onNewSubmissionForSchool={()=>setAction('new-letter')} onNewAppointmentForSchool={()=>setAction('new-appointment')} onOpenAppointment={a=>{focus.current=document.activeElement as HTMLElement;setSelected(a);}}/>:<MonthlyReportsView schools={[school]} submissions={[sub]} fieldTrips={[trip]}/>}
 {selected&&<AppointmentDetailContent access={{canEdit:false,currentUser:null,users:[]}} appointment={selected} submissions={subs} fieldTrips={trips} onClose={()=>{setSelected(null);focus.current?.focus();}} onEdit={()=>{throw Error('unexpected mutation')}} onRecordTrip={()=>{throw Error('unexpected mutation')}}/>}</>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
