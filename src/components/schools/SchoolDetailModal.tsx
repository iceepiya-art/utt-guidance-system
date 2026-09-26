import { SchoolTimelineStep } from './SchoolTimelineStep';
import { hasActualGuidance } from '../../utils/actualGuidance';
import { getSchoolActivityHistory, submissionPeople, activityPeople, type SchoolHistoryTarget } from '../../utils/schoolActivityHistory';
import { SubmissionDetailModal } from '../submissions/SubmissionDetailModal';
import { FieldTripDetailModal } from '../trips/FieldTripDetailModal';
import { getSchoolContactSuggestion } from '../../utils/dataCompleteness';
import React from 'react';
import {
  X,
  Phone,
  MessageSquare,
  Clock,
  MapPin,
  Users,
  GraduationCap,
  Calendar,
  FileText,
  Compass,
  Edit2,
  PhoneCall,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { School, DocumentSubmission, Appointment, FieldTrip } from '../../types';
import { formatThaiShortDate, formatThaiFullDate } from '../../utils/dateUtils';
import { formatAppointmentTime } from '../../utils/appointmentUtils';
import { formatSchoolDisplayName, getCleanSchoolCode, getSchoolWorkflow, SCHOOL_STATUS_LABELS } from '../../utils/schoolStatus';

interface SchoolDetailModalProps {
  school: School | null;
  schools?: School[];
  submissions: DocumentSubmission[];
  appointments: Appointment[];
  fieldTrips: FieldTrip[];
  canEdit?: boolean;
  onRecordTrip?: (appointment: Appointment) => void;
  onOpenAppointment?: (appointment: Appointment) => void;
  onClose: () => void;
  onEdit: (school: School) => void;
  onNewSubmissionForSchool: (school: School) => void;
  onNewAppointmentForSchool: (school: School) => void;
}

export const SchoolDetailModal: React.FC<SchoolDetailModalProps> = ({
  school,
  schools,
  submissions,
  appointments,
  fieldTrips,
  canEdit = true,
  onOpenAppointment,
  onRecordTrip,
  onClose,
  onEdit,
  onNewSubmissionForSchool,
  onNewAppointmentForSchool,
}) => {
  const [selectedSource, setSelectedSource] = React.useState<SchoolHistoryTarget | null>(null);
  const [selectedPhoto, setSelectedPhoto] = React.useState<string | null>(null);
  const opener = React.useRef<HTMLElement | null>(null);
  const workflow = React.useMemo(() => school ? getSchoolWorkflow(school, submissions, appointments, fieldTrips, schools) : null, [school, schools, submissions, appointments, fieldTrips]);
  const history = React.useMemo(() => school ? getSchoolActivityHistory(school, schools || [school], submissions, appointments, fieldTrips) : [], [school, schools, submissions, appointments, fieldTrips]);
  if (!school || !workflow) return null;
  const contactSuggestion = canEdit && (!school.teacherName || !school.teacherPhone) ? getSchoolContactSuggestion(school, schools || [school], submissions) : undefined;
  const isTeam1 = school.teamId === 'team1';
  const schoolSubmissions = workflow.current.submissions.slice(0,1);
  const schoolTrips = workflow.current.trips.slice(0,1);
  const pendingAppointments = workflow.schoolAppointments.filter(a=>a.status !== 'CANCELLED' && !hasActualGuidance(a, workflow.schoolTrips));
  const pendingAppointmentIds = new Set(pendingAppointments.map(a=>a.id));
  const activeAppointment = workflow.current.appointments.find(a=>pendingAppointmentIds.has(a.id));
  const latestAppointment = workflow.schoolAppointments[0];
  const selectedResult = selectedSource?.sourceType === 'GUIDANCE' ? fieldTrips.find(t=>t.id===selectedSource.sourceId) : undefined;
  const selectedSubmission = selectedSource?.sourceType === 'SUBMISSION' ? submissions.find(t=>t.id===selectedSource.sourceId) : undefined;
  const openSource = (target:SchoolHistoryTarget) => {
    opener.current = document.activeElement as HTMLElement;
    if(target.sourceType === 'APPOINTMENT') {
      const appointment=appointments.find(a=>a.id===target.sourceId);
      if(appointment) onOpenAppointment?.(appointment);
    } else setSelectedSource(target);
  };
  const closeSource=()=>{setSelectedSource(null);opener.current?.focus();};

  return (
    <div role="dialog" aria-modal="true" aria-label="รายละเอียดโรงเรียน" className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-start justify-between bg-slate-50/70 rounded-t-2xl">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              {getCleanSchoolCode(school.schoolId) && (
                <span className="text-xs font-mono font-bold text-slate-400 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                  {getCleanSchoolCode(school.schoolId)}
                </span>
              )}
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-sm ${
                  isTeam1 ? 'bg-[#E3F2FD] text-[#1976D2]' : 'bg-[#FFF7E0] text-[#F59E0B]'
                }`}
              >
                {isTeam1 ? 'อุตรดิตถ์' : 'สุโขทัย'}
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">
              {formatSchoolDisplayName(school.schoolName)}
            </h2>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>อำเภอ{school.district} • จังหวัด{school.province}</span>
            </div>
          </div>
          <button
            aria-label="ปิดรายละเอียดโรงเรียน"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-5">
          {contactSuggestion && <div className="p-3 rounded-xl border border-amber-200 bg-amber-50 text-sm">
            <p>พบข้อมูลติดต่อจากรายการยื่นหนังสือวันที่ {formatThaiShortDate(contactSuggestion.submissionDate)}: {contactSuggestion.teacherName} · {contactSuggestion.teacherPhone}</p>
            <button type="button" className="mt-2 text-sky-800 underline" onClick={() => onEdit({ ...school, teacherName: contactSuggestion.teacherName, teacherPhone: contactSuggestion.teacherPhone })}>ใช้ข้อมูลติดต่อนี้ในแบบแก้ไขโรงเรียน</button>
          </div>}
          {/* Quick Contact & Dial Guidance Teacher */}
          <div className="bg-gradient-to-r from-[#EAF6FD] to-white p-4 rounded-xl border border-[#087CC1]/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-[#075A9C] uppercase tracking-wider">
                  ผู้ประสานงาน / ครูแนะแนว
                </div>
                <div className="text-base font-bold text-slate-800 mt-0.5">
                  {school.teacherName || 'ยังไม่ระบุชื่อครูแนะแนว'}
                </div>
                <div className="text-xs text-slate-600">
                  {school.teacherPosition || 'ครูแนะแนว'}
                </div>
                {school.preferredContactTime && (
                  <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                    <Clock className="w-3 h-3 text-[#087CC1]" />
                    <span>สะดวก: {school.preferredContactTime}</span>
                  </div>
                )}
              </div>

              {/* Direct Call & Line */}
              <div className="flex items-center gap-2">
                {school.teacherPhone ? (
                  <a
                    href={`tel:${school.teacherPhone}`}
                    id="btn-call-teacher"
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#087CC1] hover:bg-[#075A9C] text-white font-semibold rounded-xl text-sm shadow-xs transition-colors"
                  >
                    <PhoneCall className="w-4 h-4 animate-bounce" />
                    <span>โทรหาครูแนะแนว</span>
                  </a>
                ) : (
                  <span className="text-xs text-slate-400 italic">ไม่มีเบอร์โทร</span>
                )}
                {school.teacherLine && (
                  <div className="px-3 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                    <span>LINE: {school.teacherLine}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* School Details Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-500 block mb-1">ระดับชั้นที่เปิดสอน</span>
              <span className="font-bold text-slate-800 text-sm">{school.educationLevels || '-'}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-500 block mb-1">นักเรียน ม.3</span>
              <span className="font-bold text-slate-800 text-sm">
                {school.studentM3 ? `${school.studentM3} คน` : '-'}
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-500 block mb-1">นักเรียน ม.6</span>
              <span className="font-bold text-slate-800 text-sm">
                {school.studentM6 ? `${school.studentM6} คน` : '-'}
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-500 block mb-1">เบอร์โทรโรงเรียน</span>
              <span className="font-bold text-slate-800 text-sm">{school.schoolPhone || '-'}</span>
            </div>
          </div>

          {/* Note */}
          {school.note && (workflow.status === 'GUIDANCE_COMPLETED' ? (
            <details className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
              <summary className="cursor-pointer font-semibold">หมายเหตุเดิมก่อนจบงาน (ดูประวัติ)</summary>
              <p className="mt-2">{school.note}</p>
            </details>
          ) : (
            <div className="p-3 bg-amber-50/60 border border-amber-200/70 rounded-xl text-xs text-amber-900">
              <span className="font-bold">หมายเหตุ: </span>
              {school.note}
            </div>
          ))}

          <section aria-label="ลำดับขั้นตอนการดำเนินงาน">
            <h3 className="text-sm font-bold text-slate-800 mb-3">ลำดับขั้นตอนการดำเนินงาน (Activity Timeline)</h3>
            <p role="status" className="mb-4 rounded-xl bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-800">สถานะ: {SCHOOL_STATUS_LABELS[workflow.status]}</p>
            <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              <div className="relative">
                <div className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white" />
                <div className="text-sm font-bold text-slate-800">1. บันทึกข้อมูลโรงเรียน</div>
                <p className="text-xs text-slate-500">{school.createdAt ? `เพิ่มเข้าระบบเมื่อ ${formatThaiShortDate(school.createdAt)}` : 'ไม่ระบุวันที่เพิ่มเข้าระบบ'}</p>
              </div>
              <SchoolTimelineStep title="2. ยื่นหนังสือประสานงาน" items={history.filter(i=>i.sourceType==='SUBMISSION')}
                empty="ยังไม่มีประวัติยื่นหนังสือ" onOpen={openSource} />
              <SchoolTimelineStep title="3. นัดหมายแนะแนว" items={history.filter(i=>i.sourceType==='APPOINTMENT')}
                summary={latestAppointment ? `ล่าสุด ${formatThaiShortDate(latestAppointment.date)} เวลา ${formatAppointmentTime(latestAppointment.startTime, latestAppointment.endTime)}${hasActualGuidance(latestAppointment, workflow.schoolTrips) ? ' · ออกแนะแนวแล้ว' : latestAppointment.status === 'CANCELLED' ? ' · ยกเลิกนัดหมาย' : ''}` : undefined}
                empty="ยังไม่มีประวัตินัดหมาย" onOpen={openSource} />
              <SchoolTimelineStep title="4. ออกปฏิบัติงานแนะแนว" items={history.filter(i=>i.sourceType==='GUIDANCE')}
                empty="ยังไม่มีบันทึกผลออกแนะแนวที่เชื่อมกับโรงเรียนนี้" onOpen={openSource} />
              {!schoolTrips.length && activeAppointment && <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900"><p>มีนัดหมายเดิม แต่ยังไม่พบรายการบันทึกผลที่เชื่อมโยง หากดำเนินการแล้ว สามารถบันทึกผลจากนัดหมายนี้ได้</p>{canEdit && onRecordTrip && <button type="button" onClick={() => onRecordTrip(activeAppointment)} className="mt-2 rounded-lg bg-[#087CC1] px-4 py-2 text-white">บันทึกผลแนะแนวจากนัดหมายเดิม</button>}</div>}
            </div>
          </section>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/80 rounded-b-2xl flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            disabled={!canEdit}
            onClick={() => onEdit(school)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold rounded-xl transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>แก้ไขข้อมูล</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!canEdit}
              onClick={() => onNewSubmissionForSchool(school)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-blue-50 text-[#087CC1] border border-[#087CC1]/30 text-xs font-semibold rounded-xl transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{history.length ? 'ยื่นหนังสือรอบใหม่' : 'ยื่นหนังสือ'}</span>
            </button>
            <button
              type="button"
              disabled={!activeAppointment && !schoolTrips.length && (!canEdit || !schoolSubmissions.length)}
              onClick={() => activeAppointment ? openSource({sourceType:'APPOINTMENT',sourceId:activeAppointment.id}) : schoolTrips[0] ? openSource({sourceType:'GUIDANCE',sourceId:schoolTrips[0].id}) : onNewAppointmentForSchool(school)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#087CC1] hover:bg-[#075A9C] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{activeAppointment ? 'ดูนัดหมายที่มีอยู่' : schoolTrips.length ? 'ดูผลแนะแนว' : 'สร้างนัดหมาย'}</span>
            </button>
          </div>
        </div>
      </div>
      {selectedSubmission && <SubmissionDetailModal detail={selectedSubmission} submitterNames={submissionPeople(selectedSubmission).map(p=>p.name)} onClose={closeSource} onPhoto={setSelectedPhoto} />}
      {selectedResult && <FieldTripDetailModal selectedTrip={selectedResult} responsibleNames={activityPeople(selectedResult).map(p=>p.name)} onClose={closeSource} onPhoto={setSelectedPhoto} />}
      {selectedPhoto && <div role="dialog" aria-label="รูปกิจกรรมขนาดเต็ม" className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4" onClick={() => setSelectedPhoto(null)}><button type="button" aria-label="ปิดรูปกิจกรรม" className="absolute top-4 right-4 text-white p-3" onClick={() => setSelectedPhoto(null)}>✕</button><img src={selectedPhoto} alt="หลักฐานกิจกรรมแนะแนว" className="max-w-full max-h-[90vh] object-contain" /></div>}
    </div>
  );
};
