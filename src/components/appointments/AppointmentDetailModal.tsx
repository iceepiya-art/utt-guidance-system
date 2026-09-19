import React, { useState } from 'react';
import {
  X,
  Calendar,
  Clock,
  Phone,
  PhoneCall,
  Car,
  Users,
  Bell,
  CheckCircle2,
  Edit2,
  AlertCircle,
  Compass,
  Send,
  Image as ImageIcon,
  Maximize2,
  FileText,
  Mail,
  UserCheck,
} from 'lucide-react';
import { Appointment, DocumentSubmission, NotificationLog } from '../../types';
import { formatThaiFullDate, formatThaiShortDate, getRelativeThaiDayLabel } from '../../utils/dateUtils';
import { sendManualNotificationTest } from '../../services/reminderService';
import { updateAppointment } from '../../firebase/dbService';
import { useAuth } from '../../context/AuthContext';

interface AppointmentDetailModalProps {
  appointment: Appointment | null;
  onClose: () => void;
  onEdit: (appointment: Appointment) => void;
  onRecordTrip: (appointment: Appointment) => void;
  submissions?: DocumentSubmission[];
}

export const AppointmentDetailModal: React.FC<AppointmentDetailModalProps> = ({
  appointment,
  onClose,
  onEdit,
  onRecordTrip,
  submissions = [],
}) => {
  const { canEdit, currentUser, users = [] } = useAuth();
  const [isCancelling, setIsCancelling] = useState(false);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null);
  const [fallbackSubmission, setFallbackSubmission] = useState<any | null>(null);

  const handleCancelAppointment = async () => {
    if (!appointment) return;
    if (!confirm(`ยืนยันการยกเลิกนัดหมาย "${appointment.schoolName}" หรือไม่?\n(ประวัติการยื่นหนังสือและรูปหลักฐานจะยังคงอยู่ และสามารถนัดหมายใหม่ได้)`)) return;
    setIsCancelling(true);
    try {
      await updateAppointment(appointment.id, { status: 'CANCELLED' }, currentUser);
      onClose();
    } catch (err: any) {
      alert(err?.message || 'ไม่สามารถยกเลิกนัดหมายได้');
    } finally {
      setIsCancelling(false);
    }
  };
  const [testingEmail, setTestingEmail] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleMarkCompleted = async () => {
    if (!appointment || !currentUser) return;
    try {
      setIsUpdating(true);
      await updateAppointment(appointment.id, { status: 'COMPLETED' }, currentUser);
      setIsUpdating(false);
      onClose();
    } catch (err: any) {
      alert(err?.message || 'ไม่สามารถบันทึกสถานะได้');
      setIsUpdating(false);
    }
  };

  if (!appointment) return null;

  const [fallbackPhotos, setFallbackPhotos] = useState<any[]>([]);

  // 1. Fallback guidance photos
  React.useEffect(() => {
    if (!appointment) return;
    fetch('/utt_full_guidance_appointments_with_photos.json')
      .then((res) => res.json())
      .then((data: any[]) => {
        const clean = (s: string) => (s || '').replace(/^(โรงเรียน|รร\.)\s*/, '').trim().toLowerCase();
        const apptClean = clean(appointment.schoolName);
        const match =
          data.find(
            (d: any) =>
              (clean(d.schoolName) === apptClean || d.schoolName === appointment.schoolName) &&
              (!appointment.date || !d.date || d.date === appointment.date)
          ) ||
          data.find(
            (d: any) => clean(d.schoolName) === apptClean || d.schoolName === appointment.schoolName
          );
        if (match && match.photos && match.photos.length > 0) {
          setFallbackPhotos(match.photos);
        }
      })
      .catch(() => {});
  }, [appointment]);

  // 2. Fallback lookup for linked letter submission from UTT archive
  React.useEffect(() => {
    if (!appointment) return;
    fetch('/utt_full_letters_with_photos.json')
      .then((res) => res.json())
      .then((data: any[]) => {
        const clean = (s: string) =>
          (s || '')
            .replace(/^(โรงเรียน|รร\.)\s*/, '')
            .replace(/\s+/g, '')
            .toLowerCase();
        const apptClean = clean(appointment.schoolName);
        const matches = data.filter((d: any) => {
          const sc = clean(d.schoolName);
          return sc.includes(apptClean) || apptClean.includes(sc);
        });
        if (matches.length > 0) {
          setFallbackSubmission(matches[0]);
        }
      })
      .catch(() => {});
  }, [appointment]);

  // 3. Linked Letter Submission (From active Firestore or fallback archive)
  const linkedSubmission = React.useMemo(() => {
    if (!submissions || !appointment) return null;
    const clean = (s: string) =>
      (s || '')
        .replace(/^(โรงเรียน|รร\.)\s*/, '')
        .replace(/\s+/g, '')
        .toLowerCase();
    const apptClean = clean(appointment.schoolName);
    return (
      submissions.find((s) => s.id === appointment.submissionId) ||
      submissions.find((s) => clean(s.schoolName) === apptClean) ||
      submissions.find((s) => clean(s.schoolName).includes(apptClean) || apptClean.includes(clean(s.schoolName)))
    );
  }, [submissions, appointment]);

  const effectiveSubmission = linkedSubmission || fallbackSubmission;

  // 4. Linked Counselor from Personnel (Users List in Settings)
  const matchedCounselorUser = React.useMemo(() => {
    if (!appointment?.counselorName || users.length === 0) return null;
    const clean = (s: string) =>
      (s || '').replace(/^(อ\.|อาจารย์|นาย|นาง|นางสาว)\s*/, '').trim().toLowerCase();
    const cClean = clean(appointment.counselorName);
    return (
      users.find((u) => u.id === appointment.counselorId) ||
      users.find((u) => {
        const uClean = clean(u.displayName);
        return uClean.includes(cClean) || cClean.includes(uClean);
      })
    );
  }, [users, appointment]);

  // Inherit teacher contact from linked submission if appointment doesn't have it
  const teacherNameDisplay =
    appointment.teacherName || effectiveSubmission?.teacherName || '';
  const teacherPhoneDisplay =
    appointment.teacherPhone || effectiveSubmission?.teacherPhone || '';
  const isInheritedTeacher =
    !appointment.teacherName && !!effectiveSubmission?.teacherName;

  // 5. Combined Photos (Appointment + Letter Submission)
  const allPhotos = React.useMemo(() => {
    const list: Array<{ id?: string; url: string; fileName?: string; tag?: string }> = [];

    // Appointment photos
    if (appointment?.photos) {
      appointment.photos.forEach((p) => {
        list.push({ ...p, tag: 'ภาพแนะแนว' });
      });
    }

    // Guidance fallback photos
    if (fallbackPhotos.length > 0) {
      fallbackPhotos.forEach((p) => {
        if (!list.some((existing) => existing.url === p.url)) {
          list.push({ ...p, tag: 'ภาพแนะแนว' });
        }
      });
    }

    // Linked submission photos (Letter)
    if (effectiveSubmission?.photos) {
      effectiveSubmission.photos.forEach((p: any) => {
        if (!list.some((existing) => existing.url === p.url)) {
          list.push({ ...p, tag: 'หลักฐานหนังสือ' });
        }
      });
    }

    return list;
  }, [appointment, fallbackPhotos, effectiveSubmission]);

  const isTeam1 = appointment.teamId === 'team1';
  const relativeDay = getRelativeThaiDayLabel(appointment.date);

  const handleTestEmail = async () => {
    setTestingEmail(true);
    setTestResult(null);
    try {
      const log = await sendManualNotificationTest(appointment);
      setTestResult(`ส่งอีเมลแจ้งเตือนสำเร็จ (บันทึก Log ID: ${log.id.substring(0, 8)}...)`);
    } catch (err: any) {
      setTestResult('เกิดข้อผิดพลาดในการส่งอีเมล');
    } finally {
      setTestingEmail(false);
    }
  };

  const getStatusBadge = () => {
    const config: Record<string, { label: string; color: string }> = {
      CONFIRMED: { label: 'ยืนยันแล้ว', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
      TENTATIVE: { label: 'รอยืนยัน', color: 'bg-amber-50 text-amber-700 border-amber-200' },
      COMPLETED: { label: 'ออกแนะแนวแล้ว', color: 'bg-blue-50 text-blue-700 border-blue-200' },
      CANCELLED: { label: 'ยกเลิก', color: 'bg-red-50 text-red-700 border-red-200' },
    };
    const c = config[appointment.status] || config.CONFIRMED;
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${c.color}`}>
        {c.label}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-start justify-between bg-slate-50/70 rounded-t-2xl">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-sm ${
                  isTeam1 ? 'bg-[#E3F2FD] text-[#1976D2]' : 'bg-[#FFF7E0] text-[#F59E0B]'
                }`}
              >
                {isTeam1 ? 'อุตรดิตถ์' : 'สุโขทัย'}
              </span>
              {getStatusBadge()}
            </div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">
              {appointment.schoolName}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Date & Time Highlights */}
          <div className="p-4 bg-gradient-to-br from-[#EAF6FD] to-white rounded-xl border border-[#087CC1]/20 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                <Calendar className="w-4 h-4 text-[#087CC1]" />
                <span>{formatThaiFullDate(appointment.date)}</span>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 bg-blue-100 text-[#075A9C] rounded-full">
                {relativeDay}
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-700 font-semibold text-xs">
              <Clock className="w-4 h-4 text-[#087CC1]" />
              <span>เวลา {appointment.startTime} - {appointment.endTime} น.</span>
            </div>
          </div>

          {/* Teacher Contact with Fast Call */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-bold text-[#075A9C] uppercase tracking-wider">
                ผู้ประสานงานของโรงเรียน
              </div>
              {isInheritedTeacher && (
                <span className="text-[10px] text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full font-medium">
                  เชื่อมโยงจากหน้ายื่นหนังสือ
                </span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-800 text-sm">
                  {teacherNameDisplay || 'ไม่ระบุชื่อครูแนะแนว'}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  เบอร์โทร: {teacherPhoneDisplay || '-'}
                </div>
              </div>
              {teacherPhoneDisplay && (
                <a
                  href={`tel:${teacherPhoneDisplay}`}
                  id="btn-call-teacher-from-appt"
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#087CC1] hover:bg-[#075A9C] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>โทรหาครู</span>
                </a>
              )}
            </div>
          </div>

          {/* Counselor & Personnel (Connected to Settings / Users List) */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <UserCheck className="w-4 h-4 text-[#087CC1]" />
                <span>อาจารย์ผู้รับผิดชอบ (จากระบบบุคลากร)</span>
              </div>
              {matchedCounselorUser && (
                <span className="text-[10px] font-semibold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                  ข้อมูลเชื่อมโยงตรงกัน
                </span>
              )}
            </div>

            <div className="flex items-start justify-between gap-2 pt-1">
              <div>
                <div className="font-bold text-slate-900 text-sm">
                  {matchedCounselorUser ? matchedCounselorUser.displayName : appointment.counselorName}
                </div>
                {matchedCounselorUser?.phone && (
                  <div className="flex items-center gap-1.5 text-xs text-[#087CC1] font-semibold mt-1">
                    <Phone className="w-3.5 h-3.5 shrink-0" />
                    <a href={`tel:${matchedCounselorUser.phone}`} className="hover:underline">
                      {matchedCounselorUser.phone}
                    </a>
                  </div>
                )}
                {matchedCounselorUser?.email && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                    <Mail className="w-3.5 h-3.5 shrink-0" />
                    <span>{matchedCounselorUser.email}</span>
                  </div>
                )}
                {appointment.teamMemberNames && (
                  <div className="text-slate-500 mt-1.5 text-xs">
                    <span className="font-medium text-slate-600">ทีมงาน: </span>
                    {appointment.teamMemberNames}
                  </div>
                )}
              </div>

              <div className="text-right shrink-0">
                <div className="inline-flex items-center gap-1 text-xs text-slate-600 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
                  <Car className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-medium">{appointment.vehicleName || effectiveSubmission?.vehicleName || (isTeam1 ? 'VIGO กข 9914' : 'MITSU บน 6738')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Linked Letter Submission Card (Connected to file_letter / Submissions) */}
          {effectiveSubmission && (
            <div className="p-3.5 bg-gradient-to-br from-sky-50/80 via-blue-50/50 to-indigo-50/60 rounded-xl border border-sky-200/90 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#087CC1]" />
                  <span className="text-xs font-bold text-slate-800">
                    ข้อมูลยื่นหนังสือที่เชื่อมโยง
                  </span>
                </div>
                <span className="text-[11px] font-bold px-2.5 py-0.5 bg-sky-100 text-[#075A9C] rounded-full border border-sky-200">
                  เลขที่ {effectiveSubmission.documentNumber || 'มีบันทึกยื่นหนังสือ'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-slate-700 pt-1">
                <div>
                  <span className="text-slate-500">วันที่ยื่น: </span>
                  <span className="font-semibold text-slate-800">
                    {formatThaiShortDate(effectiveSubmission.submissionDate)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">ผู้ยื่นหนังสือ: </span>
                  <span className="font-semibold text-slate-800">
                    {effectiveSubmission.submittedByName || effectiveSubmission.counselor || '-'}
                  </span>
                </div>
                {effectiveSubmission.otherActivityDetails && (
                  <div className="col-span-2 text-slate-600">
                    <span className="text-slate-500">กิจกรรม: </span>
                    <span>{effectiveSubmission.otherActivityDetails}</span>
                  </div>
                )}
                {effectiveSubmission.photos && effectiveSubmission.photos.length > 0 && (
                  <div className="col-span-2 text-[11px] text-sky-700 flex items-center gap-1 font-medium">
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>มีรูปภาพหลักฐานหนังสือราชการ {effectiveSubmission.photos.length} รูป (แสดงในแกลเลอรีด้านล่าง)</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Note */}
          {appointment.note && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700">
              <span className="font-bold">หมายเหตุ: </span>
              {appointment.note}
            </div>
          )}

          {/* Photo Gallery Section */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <ImageIcon className="w-4 h-4 text-[#087CC1]" />
                <span>รูปภาพกิจกรรม & เอกสารหลักฐาน</span>
              </div>
              <span className="text-[11px] font-semibold px-2 py-0.5 bg-sky-100 text-[#075A9C] rounded-full">
                {allPhotos.length} รูป
              </span>
            </div>
            {allPhotos.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                {allPhotos.map((photo, i) => (
                  <button
                    key={photo.id || i}
                    type="button"
                    onClick={() => setSelectedPhotoUrl(photo.url)}
                    className="group relative aspect-4/3 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 hover:shadow-md transition-all text-left cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-[#087CC1]"
                    title="คลิกเพื่อดูรูปภาพขนาดใหญ่"
                  >
                    <img
                      src={photo.url}
                      alt={photo.fileName || 'รูปภาพกิจกรรม'}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      loading="lazy"
                    />
                    {photo.tag && (
                      <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-black/60 text-white rounded text-[9px] font-medium backdrop-blur-xs">
                        {photo.tag}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Maximize2 className="w-5 h-5 text-white drop-shadow-md" />
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="py-4 text-center text-xs text-slate-400 bg-white rounded-lg border border-dashed border-slate-200">
                ยังไม่มีรูปภาพแนบในรายการนี้
              </div>
            )}
          </div>

          {/* Email Reminder Box */}
          <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#087CC1]" />
                <span className="text-xs font-bold text-slate-800">ระบบแจ้งเตือนทางอีเมล</span>
              </div>
              <button
                type="button"
                onClick={handleTestEmail}
                disabled={testingEmail}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#087CC1] hover:bg-[#075A9C] text-white text-[11px] font-semibold rounded-lg shadow-2xs transition-colors disabled:opacity-50"
              >
                <Send className="w-3 h-3" />
                <span>{testingEmail ? 'กำลังส่ง...' : 'ทดสอบส่งอีเมลเตือน'}</span>
              </button>
            </div>
            {testResult && (
              <p className="text-[11px] font-medium text-emerald-700 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                {testResult}
              </p>
            )}
            <p className="text-[11px] text-slate-500">
              ระบบส่งอีเมลแจ้งเตือนกำหนดการล่วงหน้า 1 วันไปยังอาจารย์ผู้รับผิดชอบ และหัวหน้างาน
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/80 rounded-b-2xl flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {canEdit && appointment.status !== 'CANCELLED' && appointment.status !== 'COMPLETED' && (
              <button
                type="button"
                onClick={handleCancelAppointment}
                disabled={isCancelling}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-semibold rounded-xl transition-colors disabled:opacity-50"
              >
                <X className="w-3.5 h-3.5" />
                <span>{isCancelling ? 'กำลังยกเลิก...' : 'ยกเลิกนัดหมาย'}</span>
              </button>
            )}

            {canEdit && (
              <button
                type="button"
                onClick={() => onEdit(appointment)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold rounded-xl transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>แก้ไขนัดหมาย</span>
              </button>
            )}
          </div>

          {canEdit && appointment.status !== 'CANCELLED' && appointment.status !== 'COMPLETED' && (
            <button
              type="button"
              onClick={handleMarkCompleted}
              disabled={isUpdating}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isUpdating ? 'กำลังบันทึก...' : 'เปลี่ยนสถานะเป็น: ออกแนะแนวแล้ว'}</span>
            </button>
          )}

          {appointment.status === 'COMPLETED' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-xl border border-emerald-200">
              <CheckCircle2 className="w-4 h-4" />
              <span>ออกแนะแนวเรียบร้อยแล้ว (แสดงในประวัติออกแนะแนว)</span>
            </span>
          )}
        </div>
      </div>

      {/* Photo Lightbox Modal */}
      {selectedPhotoUrl && (
        <div
          className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setSelectedPhotoUrl(null)}
        >
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setSelectedPhotoUrl(null)}
              className="absolute -top-12 right-0 p-2 text-white/80 hover:text-white bg-black/40 hover:bg-black/60 rounded-full transition-colors cursor-pointer"
              title="ปิด"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={selectedPhotoUrl}
              alt="รูปภาพขนาดใหญ่"
              className="max-h-[85vh] max-w-full object-contain rounded-xl shadow-2xl bg-black"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
};
