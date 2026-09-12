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

interface SchoolDetailModalProps {
  school: School | null;
  submissions: DocumentSubmission[];
  appointments: Appointment[];
  fieldTrips: FieldTrip[];
  onClose: () => void;
  onEdit: (school: School) => void;
  onNewSubmissionForSchool: (school: School) => void;
  onNewAppointmentForSchool: (school: School) => void;
}

export const SchoolDetailModal: React.FC<SchoolDetailModalProps> = ({
  school,
  submissions,
  appointments,
  fieldTrips,
  onClose,
  onEdit,
  onNewSubmissionForSchool,
  onNewAppointmentForSchool,
}) => {
  if (!school) return null;

  const isTeam1 = school.teamId === 'team1';

  // Filter school's specific history
  const schoolSubmissions = submissions.filter((s) => s.schoolId === school.id);
  const schoolAppointments = appointments.filter((a) => a.schoolId === school.id);
  const schoolTrips = fieldTrips.filter((t) =>
    t.schools?.some((s) => s.schoolId === school.id || s.schoolName === school.schoolName)
  );

  const getStatusBadge = () => {
    const config: Record<string, { label: string; color: string }> = {
      NOT_STARTED: { label: 'ยังไม่ดำเนินการ', color: 'bg-slate-100 text-slate-700 border-slate-200' },
      DOCUMENT_SUBMITTED: { label: 'ยื่นหนังสือแล้ว', color: 'bg-blue-50 text-blue-700 border-blue-200' },
      WAITING_CONTACT: { label: 'รอติดต่อกลับ', color: 'bg-amber-50 text-amber-700 border-amber-200' },
      WAITING_APPOINTMENT: { label: 'รอนัดหมาย', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
      APPOINTED: { label: 'นัดหมายแล้ว', color: 'bg-purple-50 text-purple-700 border-purple-200' },
      GUIDANCE_COMPLETED: { label: 'ออกแนะแนวแล้ว', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
      CANCELLED: { label: 'ยกเลิก', color: 'bg-red-50 text-red-700 border-red-200' },
    };
    const c = config[school.currentStatus] || config.NOT_STARTED;
    return (
      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${c.color}`}>
        {c.label}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-start justify-between bg-slate-50/70 rounded-t-2xl">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-xs font-mono font-bold text-slate-400 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                {school.schoolId || 'SCH'}
              </span>
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-sm ${
                  isTeam1 ? 'bg-[#E3F2FD] text-[#1976D2]' : 'bg-[#FFF7E0] text-[#F59E0B]'
                }`}
              >
                {isTeam1 ? 'สายที่ 1 (โซนเมือง)' : 'สายที่ 2 (โซนรอบนอก)'}
              </span>
              {getStatusBadge()}
            </div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">
              {school.schoolName}
            </h2>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>อำเภอ{school.district} • จังหวัด{school.province}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-5">
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
          {school.note && (
            <div className="p-3 bg-amber-50/60 border border-amber-200/70 rounded-xl text-xs text-amber-900">
              <span className="font-bold">หมายเหตุ: </span>
              {school.note}
            </div>
          )}

          {/* Activity Timeline Workflow */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-[#087CC1]" />
              <span>ลำดับขั้นตอนการดำเนินงาน (Activity Timeline)</span>
            </h3>

            <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {/* Step 1: School Profile */}
              <div className="relative">
                <div className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white" />
                <div className="text-xs font-bold text-slate-800">1. บันทึกข้อมูลโรงเรียน</div>
                <div className="text-[11px] text-slate-500">
                  เพิ่มเข้าระบบเมื่อ {formatThaiShortDate(school.createdAt)}
                </div>
              </div>

              {/* Step 2: Document Submission */}
              <div className="relative">
                <div
                  className={`absolute -left-6 top-0.5 w-4 h-4 rounded-full border-2 border-white ${
                    schoolSubmissions.length > 0 ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                />
                <div className="text-xs font-bold text-slate-800">2. ยื่นหนังสือประสานงาน</div>
                {schoolSubmissions.length > 0 ? (
                  <div className="text-[11px] text-slate-600 mt-1 space-y-1">
                    {schoolSubmissions.map((sub) => (
                      <div key={sub.id} className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                        <div>เลขที่: {sub.documentNumber} • วันที่: {formatThaiShortDate(sub.submissionDate)}</div>
                        <div className="text-slate-500">ผู้ยื่น: {sub.submittedByName}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-400">ยังไม่มีประวัติยื่นหนังสือ</div>
                )}
              </div>

              {/* Step 3: Appointment */}
              <div className="relative">
                <div
                  className={`absolute -left-6 top-0.5 w-4 h-4 rounded-full border-2 border-white ${
                    schoolAppointments.length > 0 ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                />
                <div className="text-xs font-bold text-slate-800">3. นัดหมายแนะแนว</div>
                {schoolAppointments.length > 0 ? (
                  <div className="text-[11px] text-slate-600 mt-1 space-y-1">
                    {schoolAppointments.map((appt) => (
                      <div key={appt.id} className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="font-medium text-slate-800">
                          วันที่ {formatThaiFullDate(appt.date)} เวลา {appt.startTime} - {appt.endTime} น.
                        </div>
                        <div className="text-slate-500">
                          อาจารย์: {appt.counselorName} • สถานะ: {appt.status}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-400">ยังไม่มีนัดหมาย</div>
                )}
              </div>

              {/* Step 4: Guidance Field Trip */}
              <div className="relative">
                <div
                  className={`absolute -left-6 top-0.5 w-4 h-4 rounded-full border-2 border-white ${
                    schoolTrips.length > 0 ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                />
                <div className="text-xs font-bold text-slate-800">4. ออกปฏิบัติงานแนะแนว</div>
                {schoolTrips.length > 0 ? (
                  <div className="text-[11px] text-slate-600 mt-1 space-y-1">
                    {schoolTrips.map((trip) => (
                      <div key={trip.id} className="p-2 bg-emerald-50/60 rounded-lg border border-emerald-200">
                        <div className="font-semibold text-emerald-900">
                          วันที่ {formatThaiShortDate(trip.date)} • {trip.workType}
                        </div>
                        <div className="text-slate-600">
                          รถ: {trip.vehicleName} • อาจารย์: {trip.counselorName}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-400">ยังไม่ได้ออกปฏิบัติงาน</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/80 rounded-b-2xl flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => onEdit(school)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold rounded-xl transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>แก้ไขข้อมูล</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onNewSubmissionForSchool(school)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-blue-50 text-[#087CC1] border border-[#087CC1]/30 text-xs font-semibold rounded-xl transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>ยื่นหนังสือ</span>
            </button>
            <button
              type="button"
              onClick={() => onNewAppointmentForSchool(school)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#087CC1] hover:bg-[#075A9C] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>สร้างนัดหมาย</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
