import { Pencil, Trash2, X } from 'lucide-react';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import React, { useState, useMemo, useEffect } from 'react';
import {
  FileText,
  Plus,
  Search,
  Phone,
  Calendar,
  Image as ImageIcon,
  CheckCircle,
  Clock,
  ChevronRight,
  Eye,
  Filter,
  Download,
} from 'lucide-react';
import { DocumentSubmission, School, TeamId, PostSubmissionStatus, Appointment } from '../../types';
import { formatThaiShortDate, THAI_MONTHS, getBuddhistYear } from '../../utils/dateUtils';
import { SubmissionFormModal } from './SubmissionFormModal';
import { SubmissionImportModal } from './SubmissionImportModal';
import { createDocumentSubmission, updateDocumentSubmission } from '../../firebase/dbService';
import { useAuth } from '../../context/AuthContext';

interface SubmissionsViewProps {
  submissions: DocumentSubmission[];
  schools: School[];
  appointments?: Appointment[];
  onOpenInstantAppointment: (submissionData: {
    submissionId?: string;
    schoolId: string;
    schoolName: string;
    teacherName: string;
    teacherPhone: string;
    teacherLine?: string;
    teamId: TeamId;
    vehicleId?: string;
    vehicleName?: string;
  }) => void;
}

export const SubmissionsView: React.FC<SubmissionsViewProps> = ({
  submissions,
  schools,
  appointments = [],
  onOpenInstantAppointment,
}) => {
  const { currentUser, canEdit, isAdmin } = useAuth();
  const [detail, setDetail] = useState<DocumentSubmission | null>(null);
  const [deleting, setDeleting] = useState<DocumentSubmission | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const getLinkedAppointment = (sub: DocumentSubmission) => {
    if (!appointments || appointments.length === 0) return null;
    const clean = (s: string) => (s || '').replace(/^(โรงเรียน|รร\.)\s*/, '').trim().toLowerCase();
    const subClean = clean(sub.schoolName);
    return (
      appointments.find((a) => a.submissionId === sub.id) ||
      appointments.find((a) => clean(a.schoolName) === subClean)
    );
  };

  const actions = (sub: DocumentSubmission) => (
    <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
      <button
        type="button"
        aria-label={`ดูรายละเอียด ${sub.schoolName}`}
        title="ดูรายละเอียด"
        onClick={() => setDetail(sub)}
        className="w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-500 hover:text-[#087CC1] hover:bg-sky-50 rounded-xl transition-colors border border-transparent hover:border-sky-200"
      >
        <Eye className="w-4 h-4" />
      </button>
      {canEdit && !sub.appointmentId && sub.status !== 'GUIDANCE_COMPLETED' && (
        <button
          type="button"
          aria-label={`สร้างนัดหมาย ${sub.schoolName}`}
          title="สร้างนัดหมาย"
          onClick={() =>
            onOpenInstantAppointment({
              submissionId: sub.id,
              schoolId: sub.schoolId,
              schoolName: sub.schoolName,
              teacherName: sub.teacherName,
              teacherPhone: sub.teacherPhone,
              teacherLine: sub.teacherLine,
              teamId: sub.teamId,
              vehicleId: sub.vehicleId,
              vehicleName: sub.vehicleName,
            })
          }
          className="w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors border border-transparent hover:border-emerald-200"
        >
          <Calendar className="w-4 h-4" />
        </button>
      )}
      {canEdit && (
        <button
          type="button"
          aria-label={`แก้ไข ${sub.schoolName}`}
          title="แก้ไข"
          onClick={() => {
            setSubmissionToEdit(sub);
            setIsFormOpen(true);
          }}
          className="w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-xl transition-colors border border-transparent hover:border-amber-200"
        >
          <Pencil className="w-4 h-4" />
        </button>
      )}
      {isAdmin && (
        <button
          type="button"
          aria-label={`ลบ ${sub.schoolName}`}
          title="ลบ"
          onClick={() => {
            setDeleteError('');
            setDeleting(sub);
          }}
          className="w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-200"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [teamFilter, setTeamFilter] = useState<'all' | TeamId>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  const isWaitingAppointment = (sub: DocumentSubmission) => {
    if (sub.status === 'APPOINTED') return false;
    if (sub.appointmentDate || sub.appointmentId) return false;
    if (sub.status === 'GUIDANCE_COMPLETED' || sub.fieldTripId) return false;
    const linked = getLinkedAppointment(sub);
    if (linked && linked.status !== 'CANCELLED') return false;
    return true;
  };

  const waitingSubmissions = useMemo(() => {
    return submissions.filter(isWaitingAppointment);
  }, [submissions, appointments]);

  const availableMonths = useMemo(() => {
    const monthCounts = new Map<string, number>();
    waitingSubmissions.forEach((s) => {
      if (s.submissionDate && s.submissionDate.length >= 7) {
        const key = s.submissionDate.substring(0, 7);
        monthCounts.set(key, (monthCounts.get(key) || 0) + 1);
      }
    });
    return Array.from(monthCounts.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, count]) => {
        const [y, m] = key.split('-');
        const monthIdx = parseInt(m, 10) - 1;
        const year = parseInt(y, 10);
        const label = `${THAI_MONTHS[monthIdx] || m} ${getBuddhistYear(year)}`;
        return { key, label, count };
      });
  }, [waitingSubmissions]);
  const [submissionToEdit, setSubmissionToEdit] = useState<DocumentSubmission | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedPhotoModal, setSelectedPhotoModal] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedPhotoModal) setSelectedPhotoModal(null);
        else if (detail) setDetail(null);
        else if (deleting) setDeleting(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [detail, deleting, selectedPhotoModal]);

  const filteredSubmissions = useMemo(() => {
    return waitingSubmissions.filter((sub) => {
      const matchSearch =
        !searchTerm ||
        sub.schoolName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.documentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.teacherName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.submittedByName?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchTeam = teamFilter === 'all' || sub.teamId === teamFilter;
      const matchMonth = selectedMonth === 'all' || sub.submissionDate.startsWith(selectedMonth);
      return matchSearch && matchTeam && matchMonth;
    });
  }, [waitingSubmissions, searchTerm, teamFilter, selectedMonth]);

  const handleSave = async (data: Omit<DocumentSubmission, 'id'>) => {
    if (submissionToEdit) { await updateDocumentSubmission(submissionToEdit.id, data, currentUser); return submissionToEdit.id; }
    return await createDocumentSubmission(data, currentUser);
  };

  const getStatusBadge = (status: PostSubmissionStatus) => {
    const config: Record<PostSubmissionStatus, { label: string; bg: string; text: string }> = {
      DOCUMENT_SUBMITTED: { label: 'ยื่นหนังสือแล้ว / รอนัดหมาย', bg: 'bg-blue-50', text: 'text-blue-700' },
      OTHER_ACTIVITY: { label: 'กิจกรรมอื่นๆ', bg: 'bg-emerald-50', text: 'text-emerald-700' },
      WAITING_CONTACT: { label: 'รอติดต่อกลับ', bg: 'bg-amber-50', text: 'text-amber-700' },
      CALL_LATER: { label: 'ขอให้ติดต่อภายหลัง', bg: 'bg-orange-50', text: 'text-orange-700' },
      WAITING_APPOINTMENT: { label: 'ยื่นหนังสือแล้ว / รอนัดหมาย', bg: 'bg-blue-50', text: 'text-blue-700' },
      APPOINTED: { label: 'นัดหมายแล้ว', bg: 'bg-purple-50', text: 'text-purple-700' },
      GUIDANCE_COMPLETED: { label: 'ออกแนะแนวแล้ว', bg: 'bg-emerald-50', text: 'text-emerald-700' },
      NOT_READY: { label: 'โรงเรียนยังไม่พร้อม', bg: 'bg-slate-100', text: 'text-slate-600' },
    };
    const c = config[status] || config.DOCUMENT_SUBMITTED;
    return (
      <span className={`inline-block px-3 py-1 rounded-full text-[13px] font-semibold whitespace-nowrap border border-transparent ${c.bg} ${c.text}`}>
        {c.label}
      </span>
    );
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-6 h-6 text-[#087CC1]" />
            <span>ข้อมูลการยื่นหนังสือ ({filteredSubmissions.length}{selectedMonth !== 'all' || teamFilter !== 'all' ? ` จาก ${waitingSubmissions.length}` : ''} รายการ)</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            บันทึกประวัติการยื่นหนังสือราชการ ข้อมูลครูแนะแนว และรอนัดหมายลงพื้นที่
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canEdit && (
            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              id="btn-import-utt-submissions"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>ดึงข้อมูลจาก UTT (126 รายการ)</span>
            </button>
          )}
          {canEdit && (
            <button
              onClick={() => { setSubmissionToEdit(null); setIsFormOpen(true); }}
              id="btn-add-submission"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#087CC1] hover:bg-[#075A9C] text-white text-sm font-semibold rounded-xl shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>บันทึกการยื่นหนังสือ</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาชื่อโรงเรียน, เลขที่หนังสือ, ครูแนะแนว, ผู้ยื่น..."
              className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#087CC1] focus:bg-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {/* Month Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 shrink-0">
              <Calendar className="w-4 h-4 text-[#087CC1] shrink-0" />
              <label htmlFor="submission-month-select" className="text-xs font-semibold text-slate-500 whitespace-nowrap">เดือน:</label>
              <select
                id="submission-month-select"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-sm font-semibold text-slate-700 outline-none cursor-pointer"
              >
                <option value="all">ทุกเดือน ({submissions.length})</option>
                {availableMonths.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.label} ({m.count})
                  </option>
                ))}
              </select>
            </div>

            {/* Team Toggle */}
            <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200 shrink-0">
              <button
                onClick={() => setTeamFilter('all')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  teamFilter === 'all' ? 'bg-white text-slate-800 shadow-2xs' : 'text-slate-500'
                }`}
              >
                ทั้งหมด
              </button>
              <button
                onClick={() => setTeamFilter('team1')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  teamFilter === 'team1' ? 'bg-[#1976D2] text-white shadow-2xs' : 'text-[#1976D2]'
                }`}
              >
                อุตรดิตถ์
              </button>
              <button
                onClick={() => setTeamFilter('team2')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  teamFilter === 'team2' ? 'bg-[#F59E0B] text-white shadow-2xs' : 'text-[#F59E0B]'
                }`}
              >
                สุโขทัย
              </button>
            </div>
          </div>
        </div>

        {/* Quick Month Filter Pills */}
        {availableMonths.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-2.5 border-t border-slate-100 text-xs">
            <span className="font-semibold text-slate-500 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-[#087CC1]" />
              แยกดูรายเดือน:
            </span>
            <button
              type="button"
              onClick={() => setSelectedMonth('all')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                selectedMonth === 'all'
                  ? 'bg-[#087CC1] text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              ทุกเดือน ({submissions.length})
            </button>
            {availableMonths.map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => setSelectedMonth(m.key)}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  selectedMonth === m.key
                    ? 'bg-[#087CC1] text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {m.label} ({m.count})
              </button>
            ))}
            {(selectedMonth !== 'all' || teamFilter !== 'all' || searchTerm) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedMonth('all');
                  setTeamFilter('all');
                  setSearchTerm('');
                }}
                className="ml-auto text-xs text-[#087CC1] hover:underline font-semibold"
              >
                ล้างตัวกรอง
              </button>
            )}
          </div>
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[1150px] border-collapse">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-sm font-semibold">
              <tr>
                <th className="py-3.5 px-3.5 w-14 min-w-[55px] text-center">ลำดับ</th>
                <th className="py-3.5 px-3.5 min-w-[180px]">ชื่อโรงเรียน</th>
                <th className="py-3.5 px-3.5 min-w-[110px]">เลขที่หนังสือ</th>
                <th className="py-3.5 px-3.5 min-w-[110px]">วันที่ยื่น</th>
                <th className="py-3.5 px-3.5 min-w-[90px] text-center">สาย</th>
                <th className="py-3.5 px-3.5 min-w-[200px]">ผู้ยื่น</th>
                <th className="py-3.5 px-3.5 min-w-[130px]">ครูแนะแนว</th>
                <th className="py-3.5 px-3.5 min-w-[120px]">เบอร์โทร</th>
                <th className="py-3.5 px-3.5 min-w-[95px] text-center">หลักฐาน</th>
                <th className="py-3.5 px-3.5 min-w-[140px] text-center">สถานะ</th>
                <th className="py-3.5 px-3.5 min-w-[120px]">หมายเหตุ</th>
                <th className="py-3.5 px-3.5 min-w-[150px] text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-10 text-center text-slate-400 text-sm">
                    ไม่พบรายการยื่นหนังสือ
                  </td>
                </tr>
              ) : (
                filteredSubmissions.map((sub, idx) => {
                  const isTeam1 = sub.teamId === 'team1';
                  const submitters = sub.submittedByNames && sub.submittedByNames.length > 0
                    ? sub.submittedByNames
                    : [sub.submittedByName || '-'];
                  const firstSubmitter = submitters[0];
                  const extraSubmitters = submitters.length - 1;
                  const linkedAppt = getLinkedAppointment(sub);

                  return (
                    <tr key={sub.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-3.5 text-center font-medium text-slate-400 text-sm">
                        {idx + 1}
                      </td>
                      <td className="py-3.5 px-3.5">
                        <div className="font-bold text-slate-900 text-sm leading-snug line-clamp-2">
                          {sub.schoolName}
                        </div>
                        {sub.status === 'OTHER_ACTIVITY' && sub.otherActivityDetails && (
                          <div className="text-[13px] text-emerald-700 font-medium mt-0.5">
                            กิจกรรม: {sub.otherActivityDetails}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-3.5 font-mono text-sm text-slate-700 whitespace-nowrap">
                        {sub.documentNumber || '-'}
                      </td>
                      <td className="py-3.5 px-3.5">
                        <div className="whitespace-nowrap font-medium text-slate-800 text-sm">
                          {formatThaiShortDate(sub.submissionDate)}
                        </div>
                        {sub.submissionTime && (
                          <div className="whitespace-nowrap text-[13px] text-slate-500 font-normal">
                            {sub.submissionTime} น.
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-3.5 text-center">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-md font-bold text-[12px] whitespace-nowrap ${
                            isTeam1 ? 'bg-[#E3F2FD] text-[#1976D2]' : 'bg-[#FFF7E0] text-[#F59E0B]'
                          }`}
                        >
                          {isTeam1 ? 'อุตรดิตถ์' : 'สุโขทัย'}
                        </span>
                      </td>
                      <td className="py-3.5 px-3.5 text-slate-800 text-sm">
                        <div className="font-medium text-slate-800">
                          {firstSubmitter}
                        </div>
                        {extraSubmitters > 0 && (
                          <div
                            className="text-[13px] text-sky-700 font-medium cursor-help"
                            title={submitters.join(', ')}
                          >
                            +{extraSubmitters} ท่าน
                          </div>
                        )}
                        {sub.appointmentDate ? (
                          <span className="block text-[13px] text-sky-700 font-medium mt-0.5 whitespace-nowrap">
                            นัด {formatThaiShortDate(sub.appointmentDate)} {sub.appointmentStartTime ? `(${sub.appointmentStartTime}–${sub.appointmentEndTime})` : ''}
                          </span>
                        ) : linkedAppt ? (
                          <span
                            className="block text-[13px] text-blue-700 font-semibold mt-0.5 whitespace-nowrap"
                            title={`นัดหมายแนะแนว: ${formatThaiShortDate(linkedAppt.date)} เวลา ${linkedAppt.startTime} น. โดย ${linkedAppt.counselorName}`}
                          >
                            นัด {formatThaiShortDate(linkedAppt.date)} ({linkedAppt.counselorName})
                          </span>
                        ) : null}
                        {sub.sameDayGuidance && (
                          <span className="block text-[13px] text-emerald-700 font-medium mt-0.5 whitespace-nowrap">
                            ยื่นหนังสือ + แนะแนว
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-3.5 font-medium text-slate-800 text-sm">
                        {sub.teacherName || '-'}
                      </td>
                      <td className="py-3.5 px-3.5">
                        {sub.teacherPhone ? (
                          <a
                            href={`tel:${sub.teacherPhone}`}
                            className="text-[#087CC1] hover:underline font-semibold text-sm whitespace-nowrap inline-flex items-center gap-1.5"
                          >
                            <Phone className="w-3.5 h-3.5 shrink-0" />
                            <span>{sub.teacherPhone}</span>
                          </a>
                        ) : (
                          <span className="text-slate-400 text-sm">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-3.5 text-center">
                        {sub.photos && sub.photos.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => setSelectedPhotoModal(sub.photos[0].url)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors"
                          >
                            <ImageIcon className="w-3.5 h-3.5 text-[#087CC1]" />
                            <span>{sub.photos.length} รูป</span>
                          </button>
                        ) : (
                          <span className="text-xs text-slate-300 font-medium">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-3.5 text-center">
                        {getStatusBadge(sub.status)}
                      </td>
                      <td className="py-3.5 px-3.5 text-slate-600 text-sm max-w-[160px] truncate" title={sub.note}>
                        {sub.note || '-'}
                      </td>
                      <td className="py-3.5 px-3.5 text-center">{actions(sub)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card List */}
      <div className="md:hidden space-y-3">
        {filteredSubmissions.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-sm">
            ไม่พบรายการยื่นหนังสือ
          </div>
        ) : (
          filteredSubmissions.map((sub) => {
            const isTeam1 = sub.teamId === 'team1';
            return (
              <div
                key={sub.id}
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-sm ${
                          isTeam1 ? 'bg-[#E3F2FD] text-[#1976D2]' : 'bg-[#FFF7E0] text-[#F59E0B]'
                        }`}
                      >
                        {isTeam1 ? 'อุตรดิตถ์' : 'สุโขทัย'}
                      </span>
                      {getStatusBadge(sub.status)}
                    </div>
                    <h3 className="font-bold text-slate-800 text-base">
                      {sub.schoolName}
                    </h3>
                    <div className="text-xs text-slate-500">
                      เลขที่: {sub.documentNumber} • วันที่ {formatThaiShortDate(sub.submissionDate)}
                    </div>
                  </div>
                </div>

                {actions(sub)}
                {/* Teacher contact */}
                <div className="p-2.5 bg-slate-50 rounded-xl text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">ครูแนะแนว:</span>
                    <span className="font-bold text-slate-800">{sub.teacherName || '-'}</span>
                  </div>
                  {sub.teacherPhone && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">เบอร์โทร:</span>
                      <a
                        href={`tel:${sub.teacherPhone}`}
                        className="text-[#087CC1] font-bold flex items-center gap-1"
                      >
                        <Phone className="w-3 h-3" />
                        <span>{sub.teacherPhone}</span>
                      </a>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-500">ผู้ยื่น:</span>
                    <span className="text-slate-700">{sub.submittedByName}{sub.appointmentDate && <span className="block text-xs text-sky-700">นัด {sub.appointmentDate} เวลา {sub.appointmentStartTime}–{sub.appointmentEndTime}</span>}{sub.sameDayGuidance && <span className="block text-xs text-sky-700">ยื่นหนังสือ + แนะแนว</span>}</span>
                  </div>
                </div>

                {/* Photos thumbnail preview if available */}
                {sub.photos && sub.photos.length > 0 && (
                  <div className="flex items-center gap-2 pt-1 overflow-x-auto">
                    {sub.photos.map((p, pIdx) => (
                      <img
                        key={p.id || pIdx}
                        src={p.url}
                        alt="หลักฐาน"
                        onClick={() => setSelectedPhotoModal(p.url)}
                        className="w-14 h-14 rounded-lg object-cover border border-slate-200 shrink-0 cursor-pointer"
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Lightbox Modal */}
      {selectedPhotoModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setSelectedPhotoModal(null)}
        >
          <div className="max-w-2xl max-h-[85vh] w-full" onClick={(e) => e.stopPropagation()}>
            <img
              src={selectedPhotoModal}
              alt="ภาพหลักฐาน"
              className="w-full h-auto max-h-[85vh] object-contain rounded-xl shadow-2xl"
            />
          </div>
        </div>
      )}

      {detail && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setDetail(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="รายละเอียดการยื่นหนังสือ"
            className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl my-auto overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center px-5 py-4 border-b border-slate-100 shrink-0 bg-white">
              <div>
                <h2 className="text-base font-bold text-slate-800">รายละเอียดการยื่นหนังสือ</h2>
                <p className="text-xs font-semibold text-sky-800 mt-0.5">{detail.schoolName}</p>
              </div>
              <button
                type="button"
                aria-label="ปิดรายละเอียด"
                onClick={() => setDetail(null)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-sm flex-1">
              <dl className="space-y-2.5">
                <div className="flex justify-between border-b border-slate-50 pb-2">
                  <dt className="text-slate-500">เลขที่หนังสือ</dt>
                  <dd className="font-medium text-slate-800">{detail.documentNumber || '-'}</dd>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-2">
                  <dt className="text-slate-500">วันที่และเวลายื่น</dt>
                  <dd className="font-medium text-slate-800">
                    {formatThaiShortDate(detail.submissionDate)} {detail.submissionTime ? `${detail.submissionTime} น.` : ''}
                  </dd>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-2">
                  <dt className="text-slate-500">สายการปฏิบัติงาน</dt>
                  <dd className="font-medium text-slate-800">
                    {detail.teamId === 'team1' ? 'อุตรดิตถ์ (สาย 1)' : 'สุโขทัย (สาย 2)'}
                  </dd>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-2">
                  <dt className="text-slate-500">ยานพาหนะ</dt>
                  <dd className="font-medium text-slate-800">{detail.vehicleName || 'ไม่ระบุ'}</dd>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-2">
                  <dt className="text-slate-500">อาจารย์ผู้ยื่น</dt>
                  <dd className="font-medium text-slate-800 text-right">
                    {detail.submittedByNames?.join(', ') || detail.submittedByName}
                  </dd>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-2">
                  <dt className="text-slate-500">ครูแนะแนว / เบอร์โทร</dt>
                  <dd className="font-medium text-slate-800">
                    {detail.teacherName || '-'} {detail.teacherPhone && `(${detail.teacherPhone})`}
                  </dd>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-2">
                  <dt className="text-slate-500">สถานะ</dt>
                  <dd>{getStatusBadge(detail.status)}</dd>
                </div>
                {detail.status === 'OTHER_ACTIVITY' && detail.otherActivityDetails && (
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                    <dt className="text-xs font-semibold text-emerald-800">กิจกรรมอื่นๆ ที่ดำเนินการ:</dt>
                    <dd className="font-medium text-emerald-900 mt-1">{detail.otherActivityDetails}</dd>
                  </div>
                )}
                {detail.appointmentDate && (
                  <div className="p-3 bg-sky-50 rounded-xl border border-sky-100 text-sky-900">
                    <dt className="text-xs font-semibold text-sky-800">นัดหมายแนะแนว</dt>
                    <dd className="mt-1 font-medium">
                      {formatThaiShortDate(detail.appointmentDate)} เวลา {detail.appointmentStartTime}–{detail.appointmentEndTime}
                    </dd>
                    {detail.appointmentNote && (
                      <p className="text-xs text-sky-700 mt-1">{detail.appointmentNote}</p>
                    )}
                  </div>
                )}
                <div>
                  <dt className="text-slate-500 mb-1">หมายเหตุ</dt>
                  <dd className="whitespace-pre-wrap p-3 bg-slate-50 rounded-xl text-slate-700 border border-slate-100">
                    {detail.note || '-'}
                  </dd>
                </div>
              </dl>

              {detail.photos && detail.photos.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-600 mb-2">
                    รูปถ่ายหลักฐาน ({detail.photos.length} รูป)
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {detail.photos.map((photo, i) => (
                      <button
                        key={photo.id || i}
                        type="button"
                        onClick={() => setSelectedPhotoModal(photo.url)}
                        className="cursor-pointer overflow-hidden rounded-xl border border-slate-200 hover:opacity-90 hover:shadow-md transition-all text-left"
                      >
                        <img
                          src={photo.url}
                          alt={`หลักฐาน ${i + 1}`}
                          className="w-full aspect-square object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer with Clear Close Button */}
            <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-end bg-slate-50 shrink-0">
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
      {deleting && <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"><div role="alertdialog" aria-modal="true" aria-label="ยืนยันลบการยื่นหนังสือ" className="bg-white rounded-2xl p-5 max-w-md w-full space-y-4">
        <h2 className="font-bold">ลบรายการยื่นหนังสือ?</h2><p className="text-sm">{deleting.schoolName} — {deleting.documentNumber}</p>
        {deleting.appointmentId || deleting.fieldTripId ? <p className="text-sm text-amber-700">รายการนี้เชื่อมกับนัดหมายหรือผลแนะแนว กรุณาจัดการรายการที่เชื่อมก่อน จึงจะลบได้</p> : <p className="text-sm text-slate-600">จะลบเฉพาะประวัติการยื่นหนังสือนี้ ข้อมูลโรงเรียนและนัดหมายอื่นจะยังอยู่</p>}
        {deleteError && <p role="alert" className="text-sm text-red-600">{deleteError}</p>}
        <div className="flex justify-end gap-3"><button disabled={busy} onClick={() => setDeleting(null)}>ยกเลิก</button><button disabled={busy || !!deleting.appointmentId || !!deleting.fieldTripId} className="px-4 py-2 rounded-lg bg-red-600 text-white disabled:opacity-40" onClick={async () => { if (!isAdmin) return; setBusy(true); try { await deleteDoc(doc(db, 'documentSubmissions', deleting.id)); setDeleting(null); } catch { setDeleteError('ลบไม่สำเร็จ กรุณาลองอีกครั้ง'); } finally { setBusy(false); } }}>{busy ? 'กำลังลบ...' : 'ยืนยันลบ'}</button></div>
      </div></div>}
      {/* Form Modal */}
      <SubmissionFormModal
        key={isFormOpen ? submissionToEdit?.id || "new" : "closed"}
        submissionToEdit={submissionToEdit}
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        schools={schools}
        onSave={handleSave}
        onOpenInstantAppointment={onOpenInstantAppointment}
      />

      {/* UTT Import Modal */}
      <SubmissionImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => setIsImportModalOpen(false)}
        existingSubmissions={submissions}
        schools={schools}
      />
    </div>
  );
};
