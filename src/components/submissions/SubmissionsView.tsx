import { submissionPeople, activityPeople } from '../../utils/schoolActivityHistory';
import { getSubmissionWorkflow, getSubmissionWorkflowNote } from '../../utils/submissionWorkflow';
import { getGuidanceResults } from '../../utils/guidanceResults';
import { FieldTripDetailModal } from '../trips/FieldTripDetailModal';
import { formatAppointmentTime } from '../../utils/appointmentUtils';
import { SubmissionDetailModal } from './SubmissionDetailModal';
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
import { DocumentSubmission, School, TeamId, Appointment, FieldTrip } from '../../types';
import { formatThaiShortDate, THAI_MONTHS, getBuddhistYear } from '../../utils/dateUtils';
import { SubmissionFormModal } from './SubmissionFormModal';
import { SubmissionImportModal } from './SubmissionImportModal';
import { createDocumentSubmission, updateDocumentSubmission } from '../../firebase/dbService';
import { useAuth } from '../../context/AuthContext';
import { getSelectablePersonnel, resolvePersonnelDisplayName } from '../../utils/personnelSelector';
import { getSubmissionDisplayStatus, isNormalGuidanceActivity } from '../../utils/submissionUtils';
import { resolveSchoolRelation, formatSchoolDisplayName, getCleanSchoolCode } from '../../utils/schoolStatus';

interface SubmissionsViewProps {
  submissions: DocumentSubmission[];
  schools: School[];
  appointments?: Appointment[];
  fieldTrips?: FieldTrip[];
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
  onSelectAppointment?: (appt: Appointment) => void;
}

export const SubmissionsView: React.FC<SubmissionsViewProps> = ({
  submissions,
  schools,
  appointments = [],
  fieldTrips = [],
  onOpenInstantAppointment,
  onSelectAppointment,
}) => {
  const { currentUser, canEdit, isAdmin, users } = useAuth();
  const selectablePersonnel = useMemo(() => getSelectablePersonnel(users), [users]);
  const results = useMemo(() => getGuidanceResults(fieldTrips, appointments, submissions, schools), [fieldTrips, appointments, submissions, schools]);
  const [resultDetail, setResultDetail] = useState<FieldTrip | null>(null);
  const [detail, setDetail] = useState<DocumentSubmission | null>(null);
  const [deleting, setDeleting] = useState<DocumentSubmission | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const getLinkedAppointment = (sub: DocumentSubmission): Appointment | null => {
    return getSubmissionWorkflow(sub, appointments, results).appointment || null;
  };

  const getDisplaySubmitters = (sub: DocumentSubmission): string[] => submissionPeople(sub).map(p => p.name);

  const actions = (sub: DocumentSubmission) => {
    const linked = getLinkedAppointment(sub);

    return (
      <div
        className="flex items-center justify-center gap-1 whitespace-nowrap"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          aria-label={`ดูรายละเอียด ${sub.schoolName}`}
          title="ดูรายละเอียด"
          onClick={(e) => {
            e.stopPropagation();
            setDetail(sub);
          }}
          className="w-8 h-8 min-w-[32px] min-h-[32px] flex items-center justify-center text-slate-500 hover:text-[#087CC1] hover:bg-sky-50 rounded-lg transition-colors border border-transparent hover:border-sky-200"
        >
          <Eye className="w-4 h-4" />
        </button>
        {canEdit && (
          linked ? (
            <button
              type="button"
              aria-label={`ดูนัดหมาย ${sub.schoolName}`}
              title="ดูนัดหมาย (มีนัดหมายแล้ว)"
              onClick={(e) => {
                e.stopPropagation();
                onSelectAppointment?.(linked);
              }}
              className="w-8 h-8 min-w-[32px] min-h-[32px] flex items-center justify-center text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors border border-transparent hover:border-purple-200"
            >
              <Calendar className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              aria-label={`สร้างนัดหมาย ${sub.schoolName}`}
              title="สร้างนัดหมาย"
              onClick={(e) => {
                e.stopPropagation();
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
                });
              }}
              className="w-8 h-8 min-w-[32px] min-h-[32px] flex items-center justify-center text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors border border-transparent hover:border-emerald-200"
            >
              <Calendar className="w-4 h-4" />
            </button>
          )
        )}
        {canEdit && (
          <button
            type="button"
            aria-label={`แก้ไข ${sub.schoolName}`}
            title="แก้ไข"
            onClick={(e) => {
              e.stopPropagation();
              setSubmissionToEdit(sub);
              setIsFormOpen(true);
            }}
            className="w-8 h-8 min-w-[32px] min-h-[32px] flex items-center justify-center text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors border border-transparent hover:border-amber-200"
          >
            <Pencil className="w-4 h-4" />
          </button>
        )}
        {isAdmin && (
          <button
            type="button"
            aria-label={`ลบ ${sub.schoolName}`}
            title="ลบ"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteError('');
              setDeleting(sub);
            }}
            className="w-8 h-8 min-w-[32px] min-h-[32px] flex items-center justify-center text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  };
  const [searchTerm, setSearchTerm] = useState('');
  const [teamFilter, setTeamFilter] = useState<'all' | TeamId>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  const availableMonths = useMemo(() => {
    const monthCounts = new Map<string, number>();
    submissions.forEach((s) => {
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
  }, [submissions]);
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
    return submissions.filter((sub) => {
      const displayNames = getDisplaySubmitters(sub).join(' ');
      const matchSearch =
        !searchTerm ||
        sub.schoolName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.documentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.teacherName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.submittedByName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        displayNames.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (sub.otherActivityDetails && sub.otherActivityDetails.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (sub.note && sub.note.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchTeam = teamFilter === 'all' || sub.teamId === teamFilter;
      const matchMonth = selectedMonth === 'all' || sub.submissionDate.startsWith(selectedMonth);
      return matchSearch && matchTeam && matchMonth;
    });
  }, [submissions, selectablePersonnel, searchTerm, teamFilter, selectedMonth]);

  const isFiltered = searchTerm.trim() !== '' || teamFilter !== 'all' || selectedMonth !== 'all';

  const handleSave = async (data: Omit<DocumentSubmission, 'id'>) => {
    if (submissionToEdit) { await updateDocumentSubmission(submissionToEdit.id, data, currentUser); return submissionToEdit.id; }
    return await createDocumentSubmission(data, currentUser);
  };

  const team1Count = useMemo(() => submissions.filter((s) => s.teamId === 'team1').length, [submissions]);
  const team2Count = useMemo(() => submissions.filter((s) => s.teamId === 'team2').length, [submissions]);

  const getStatusBadge = (sub: DocumentSubmission) => {
    const workflow = getSubmissionWorkflow(sub, appointments, results);
    const c = workflow.display;
    return <div className="space-y-1">
      <span className={`inline-block px-3 py-1 rounded-full text-[13px] font-semibold whitespace-nowrap ${c.bg} ${c.text}`}>{c.label}</span>
      {workflow.appointment && !workflow.result && <div className="text-xs text-slate-500">{formatThaiShortDate(workflow.appointment.date)}<br />{formatAppointmentTime(workflow.appointment.startTime, workflow.appointment.endTime)}</div>}
      {workflow.result && <button type="button" className="block text-xs text-sky-700 underline" onClick={e => {e.stopPropagation();setResultDetail(workflow.result!);}}>ดูผลและรูปกิจกรรม</button>}
    </div>;
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-6 h-6 text-[#087CC1]" />
            <span>ข้อมูลการยื่นหนังสือ ({isFiltered ? `${filteredSubmissions.length} จาก ${submissions.length}` : submissions.length} รายการ)</span>
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
              id="submission-search-input"
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
                id="btn-filter-team-all"
                onClick={() => setTeamFilter('all')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  teamFilter === 'all' ? 'bg-white text-slate-800 shadow-2xs' : 'text-slate-500'
                }`}
              >
                ทั้งหมด ({submissions.length})
              </button>
              <button
                id="btn-filter-team-1"
                onClick={() => setTeamFilter('team1')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  teamFilter === 'team1' ? 'bg-[#1976D2] text-white shadow-2xs' : 'text-[#1976D2]'
                }`}
              >
                อุตรดิตถ์ ({team1Count})
              </button>
              <button
                id="btn-filter-team-2"
                onClick={() => setTeamFilter('team2')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  teamFilter === 'team2' ? 'bg-[#F59E0B] text-white shadow-2xs' : 'text-[#F59E0B]'
                }`}
              >
                สุโขทัย ({team2Count})
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
          <table className="w-full text-left text-sm min-w-[880px] lg:min-w-[900px] border-collapse">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-sm font-semibold">
              <tr>
                <th className="py-2.5 px-2 w-12 min-w-[48px] text-center">ลำดับ</th>
                <th className="py-2.5 px-2.5 min-w-[150px]">ชื่อโรงเรียน</th>
                <th className="py-2.5 px-2 min-w-[90px]">เลขที่หนังสือ</th>
                <th className="py-2.5 px-2 min-w-[90px]">วันที่ยื่น</th>
                <th className="py-2.5 px-2 min-w-[65px] text-center">สาย</th>
                <th className="py-2.5 px-2.5 min-w-[140px]">ผู้ยื่น</th>
                <th className="py-2.5 px-2 min-w-[120px]">ครูแนะแนว / เบอร์โทร</th>
                <th className="py-2.5 px-2 min-w-[75px] text-center">หลักฐาน</th>
                <th className="py-2.5 px-2 min-w-[100px] text-center">สถานะ</th>
                <th className="py-2.5 px-2 min-w-[120px] hidden 2xl:table-cell">หมายเหตุ</th>
                <th className="py-2.5 px-2 min-w-[90px] text-center">จัดการ</th>
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
                  const displaySubmitters = getDisplaySubmitters(sub);
                  const displayStatus = getSubmissionDisplayStatus(sub);

                  const matchedSchool = resolveSchoolRelation(sub.schoolId, schools);
                  const cleanSchoolCode = getCleanSchoolCode(matchedSchool?.schoolId) || getCleanSchoolCode(sub.schoolId);

                  return (
                    <tr
                      key={sub.id}
                      tabIndex={0}
                      role="button"
                      aria-label={`ดูรายละเอียดการยื่นหนังสือ ${sub.schoolName}`}
                      onClick={() => setDetail(sub)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          const target = e.target as HTMLElement;
                          if (target.tagName !== 'BUTTON' && target.tagName !== 'A' && target.tagName !== 'INPUT') {
                            e.preventDefault();
                            setDetail(sub);
                          }
                        }
                      }}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors focus:outline-none focus-visible:bg-sky-50/60"
                    >
                      <td className="py-2.5 px-2 text-center font-medium text-slate-400 text-sm">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-2.5">
                        <div className="font-bold text-slate-900 text-sm leading-snug line-clamp-2">
                          {formatSchoolDisplayName(sub.schoolName)}
                        </div>
                        {cleanSchoolCode && (
                          <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                            {cleanSchoolCode}
                          </div>
                        )}
                        {displayStatus.isOtherActivity && sub.otherActivityDetails && (
                          <div className="text-[12px] text-emerald-700 font-medium mt-0.5">
                            กิจกรรม: {sub.otherActivityDetails}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-2 font-mono text-sm text-slate-700 whitespace-nowrap">
                        {sub.documentNumber || '-'}
                      </td>
                      <td className="py-2.5 px-2">
                        <div className="whitespace-nowrap font-medium text-slate-800 text-sm">
                          {formatThaiShortDate(sub.submissionDate)}
                        </div>
                        {sub.submissionTime && (
                          <div className="whitespace-nowrap text-[12px] text-slate-500 font-normal">
                            {sub.submissionTime} น.
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md font-bold text-[11px] whitespace-nowrap ${
                            isTeam1 ? 'bg-[#E3F2FD] text-[#1976D2]' : 'bg-[#FFF7E0] text-[#F59E0B]'
                          }`}
                        >
                          {isTeam1 ? 'อุตรดิตถ์' : 'สุโขทัย'}
                        </span>
                      </td>
                      <td className="py-2.5 px-2.5 text-slate-800 text-sm">
                        <div className="space-y-0.5">
                          {displaySubmitters.map((name, sIdx) => (
                            <div key={sIdx} className="font-medium text-slate-800 whitespace-nowrap leading-tight">
                              {name}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-slate-800 text-sm">
                        <div className="font-medium text-slate-800">{sub.teacherName || '-'}</div>
                        {sub.teacherPhone && (
                          <div className="text-[12px] text-[#087CC1] font-semibold mt-0.5 whitespace-nowrap">
                            <a
                              href={`tel:${sub.teacherPhone}`}
                              onClick={(e) => e.stopPropagation()}
                              className="hover:underline inline-flex items-center gap-1"
                            >
                              <Phone className="w-3 h-3 shrink-0" />
                              <span>{sub.teacherPhone}</span>
                            </a>
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                        {sub.photos && sub.photos.length > 0 ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPhotoModal(sub.photos[0].url);
                            }}
                            className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer"
                          >
                            <ImageIcon className="w-3.5 h-3.5 text-[#087CC1]" />
                            <span>{sub.photos.length} รูป</span>
                          </button>
                        ) : (
                          <span className="text-xs text-slate-300 font-medium">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        {getStatusBadge(sub)}
                      </td>
                      <td className="py-2.5 px-2 text-slate-600 text-sm max-w-[160px] truncate hidden 2xl:table-cell" title={getSubmissionWorkflowNote(sub, appointments, results)}>
                        {getSubmissionWorkflowNote(sub, appointments, results) || '-'}
                      </td>
                      <td className="py-2.5 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                        {actions(sub)}
                      </td>
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
            const displaySubmitters = getDisplaySubmitters(sub);
            const displayStatus = getSubmissionDisplayStatus(sub);

            const matchedSchool = resolveSchoolRelation(sub.schoolId, schools);
            const cleanSchoolCode = getCleanSchoolCode(matchedSchool?.schoolId) || getCleanSchoolCode(sub.schoolId);

            return (
              <div
                key={sub.id}
                tabIndex={0}
                role="button"
                aria-label={`ดูรายละเอียดการยื่นหนังสือ ${sub.schoolName}`}
                onClick={() => setDetail(sub)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    const target = e.target as HTMLElement;
                    if (target.tagName !== 'BUTTON' && target.tagName !== 'A' && target.tagName !== 'INPUT' && target.tagName !== 'IMG') {
                      e.preventDefault();
                      setDetail(sub);
                    }
                  }
                }}
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5 cursor-pointer hover:border-sky-300 hover:shadow-sm active:bg-slate-50/80 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087CC1]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-sm ${
                          isTeam1 ? 'bg-[#E3F2FD] text-[#1976D2]' : 'bg-[#FFF7E0] text-[#F59E0B]'
                        }`}
                      >
                        {isTeam1 ? 'อุตรดิตถ์' : 'สุโขทัย'}
                      </span>
                      {getStatusBadge(sub)}
                    </div>
                    <div className="font-bold text-slate-800 text-base">
                      {formatSchoolDisplayName(sub.schoolName)}
                    </div>
                    {cleanSchoolCode && (
                      <div className="text-[12px] font-mono text-slate-400 mt-0.5">
                        {cleanSchoolCode}
                      </div>
                    )}
                    {displayStatus.isOtherActivity && sub.otherActivityDetails && (
                      <div className="text-[12px] text-emerald-700 font-medium mt-0.5">
                        กิจกรรม: {sub.otherActivityDetails}
                      </div>
                    )}
                    <div className="text-xs text-slate-500 mt-1">
                      เลขที่: {sub.documentNumber} • วันที่ {formatThaiShortDate(sub.submissionDate)}
                    </div>
                  </div>
                </div>

                <div onClick={(e) => e.stopPropagation()}>
                  {actions(sub)}
                </div>

                <p className="text-xs text-slate-600">หมายเหตุเพิ่มเติม: {getSubmissionWorkflowNote(sub, appointments, results) || '-'}</p>
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
                        onClick={(e) => e.stopPropagation()}
                        className="text-[#087CC1] font-bold flex items-center gap-1 hover:underline"
                      >
                        <Phone className="w-3 h-3" />
                        <span>{sub.teacherPhone}</span>
                      </a>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-500">ผู้ยื่น:</span>
                    <span className="text-slate-700 font-medium">
                      {displaySubmitters.join(', ')}
                    </span>
                  </div>
                </div>

                {/* Photos thumbnail preview if available */}
                {sub.photos && sub.photos.length > 0 && (
                  <div className="flex items-center gap-2 pt-1 overflow-x-auto" onClick={(e) => e.stopPropagation()}>
                    {sub.photos.map((p, pIdx) => (
                      <img
                        key={p.id || pIdx}
                        src={p.url}
                        alt="หลักฐาน"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPhotoModal(p.url);
                        }}
                        className="w-14 h-14 rounded-lg object-cover border border-slate-200 shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
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

      {resultDetail && <FieldTripDetailModal selectedTrip={resultDetail} responsibleNames={activityPeople(resultDetail).map(p => p.name)} onClose={() => setResultDetail(null)} onPhoto={setSelectedPhotoModal} />}
      {detail && <SubmissionDetailModal statusOverride={getSubmissionWorkflow(detail, appointments, results).display} noteOverride={getSubmissionWorkflowNote(detail, appointments, results)} detail={detail} submitterNames={getDisplaySubmitters(detail)} onClose={() => setDetail(null)} onPhoto={setSelectedPhotoModal} onEdit={(sub) => { setDetail(null); setSubmissionToEdit(sub); setIsFormOpen(true); }} />}
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
