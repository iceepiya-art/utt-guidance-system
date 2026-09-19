import React, { useState, useMemo } from 'react';
import {
  CalendarCheck,
  Calendar,
  Plus,
  Search,
  Clock,
  Car,
  Phone,
  Filter,
  Eye,
  Edit2,
  Trash2,
  Compass,
  Download,
  Image as ImageIcon,
  CheckCircle2,
} from 'lucide-react';
import { Appointment, DocumentSubmission, School, TeamId, AppointmentStatus } from '../../types';
import { formatThaiShortDate, getRelativeThaiDayLabel, THAI_MONTHS, getBuddhistYear } from '../../utils/dateUtils';
import { AppointmentDetailModal } from './AppointmentDetailModal';
import { AppointmentFormModal } from './AppointmentFormModal';
import { AppointmentImportModal } from './AppointmentImportModal';
import { createAppointment, updateAppointment, deleteAppointment } from '../../firebase/dbService';
import { useAuth } from '../../context/AuthContext';

interface AppointmentsViewProps {
  appointments: Appointment[];
  schools: School[];
  submissions: DocumentSubmission[];
  onRecordTrip: (appointment: Appointment) => void;
}

export const AppointmentsView: React.FC<AppointmentsViewProps> = ({
  appointments,
  schools,
  submissions,
  onRecordTrip,
}) => {
  const { currentUser, isAdmin, canEdit } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [teamFilter, setTeamFilter] = useState<'all' | TeamId>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | AppointmentStatus>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  // Appointments that haven't done guidance yet (นัดหมายและยังไม่ได้แนะแนว)
  const pendingAppointments = useMemo(() => {
    return appointments.filter((a) => a.status !== 'COMPLETED');
  }, [appointments]);

  const availableMonths = useMemo(() => {
    const monthCounts = new Map<string, number>();
    pendingAppointments.forEach((a) => {
      if (a.date && a.date.length >= 7) {
        const key = a.date.substring(0, 7);
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
  }, [pendingAppointments]);

  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [appointmentToEdit, setAppointmentToEdit] = useState<Appointment | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const filteredAppointments = useMemo(() => {
    return pendingAppointments.filter((appt) => {
      const matchSearch =
        !searchTerm ||
        appt.schoolName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appt.counselorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appt.teacherName?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchTeam = teamFilter === 'all' || appt.teamId === teamFilter;
      const matchStatus = statusFilter === 'all' || appt.status === statusFilter;
      const matchMonth = selectedMonth === 'all' || appt.date.startsWith(selectedMonth);

      return matchSearch && matchTeam && matchStatus && matchMonth;
    });
  }, [pendingAppointments, searchTerm, teamFilter, statusFilter, selectedMonth]);

  const handleSaveAppointment = async (data: Omit<Appointment, 'id'>) => {
    if (appointmentToEdit) {
      await updateAppointment(appointmentToEdit.id, data, currentUser);
    } else {
      await createAppointment(data, currentUser);
    }
  };

  const handleDelete = async (appt: Appointment) => {
    if (!isAdmin) return;
    if (confirm(`ยืนยันการลบนัดหมาย "${appt.schoolName}" หรือไม่?`)) {
      await deleteAppointment(appt.id, appt.schoolName, currentUser);
      if (selectedAppointment?.id === appt.id) setSelectedAppointment(null);
    }
  };

  const getStatusBadge = (status: AppointmentStatus) => {
    const config: Record<AppointmentStatus, { label: string; bg: string; text: string }> = {
      CONFIRMED: { label: 'ยืนยันแล้ว', bg: 'bg-emerald-50', text: 'text-emerald-700' },
      PENDING: { label: 'รอยืนยัน', bg: 'bg-amber-50', text: 'text-amber-700' },
      TENTATIVE: { label: 'รอยืนยัน', bg: 'bg-amber-50', text: 'text-amber-700' },
      COMPLETED: { label: 'ออกแนะแนวแล้ว', bg: 'bg-blue-50', text: 'text-blue-700' },
      RESCHEDULED: { label: 'เลื่อนนัด', bg: 'bg-purple-50', text: 'text-purple-700' },
      CANCELLED: { label: 'ยกเลิก', bg: 'bg-red-50', text: 'text-red-700' },
    };
    const c = config[status] || config.CONFIRMED;
    return (
      <span className={`inline-block px-3 py-1 rounded-full text-[13px] font-semibold whitespace-nowrap ${c.bg} ${c.text}`}>
        {c.label}
      </span>
    );
  };

  const getApptPhotosCount = (appt: Appointment) => {
    let count = appt.photos?.length || 0;
    if (count === 0 && submissions) {
      const match = submissions.find(
        (s) =>
          s.id === appt.submissionId ||
          (s.schoolName === appt.schoolName && s.photos && s.photos.length > 0)
      );
      if (match?.photos) count += match.photos.length;
    }
    return count;
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
            <CalendarCheck className="w-6 h-6 text-[#087CC1]" />
            <span>รายการนัดหมายแนะแนว ({filteredAppointments.length}{selectedMonth !== 'all' || teamFilter !== 'all' || statusFilter !== 'all' ? ` จาก ${pendingAppointments.length}` : ''} รายการ)</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            ตารางกำหนดการนัดหมายลงพื้นที่ วิทยาลัยเทคโนโลยีอุตรดิตถ์ (รอลงพื้นที่แนะแนว)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canEdit && (
            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              id="btn-import-utt-appointments"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>ดึงข้อมูลจาก UTT (49 รายการ)</span>
            </button>
          )}
          {canEdit && (
            <button
              onClick={() => {
                setAppointmentToEdit(null);
                setIsFormOpen(true);
              }}
              id="btn-add-appointment"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#087CC1] hover:bg-[#075A9C] text-white text-sm font-semibold rounded-xl shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>สร้างนัดหมายใหม่</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาชื่อโรงเรียน, อาจารย์..."
              className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#087CC1] focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
            <Calendar className="w-4 h-4 text-[#087CC1] shrink-0" />
            <label htmlFor="appt-month-select" className="text-xs font-semibold text-slate-500 whitespace-nowrap">เดือน:</label>
            <select
              id="appt-month-select"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-sm font-semibold text-slate-700 outline-none cursor-pointer w-full"
            >
              <option value="all">ทุกเดือน ({appointments.length})</option>
              {availableMonths.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label} ({m.count})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setTeamFilter('all')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                teamFilter === 'all' ? 'bg-white text-slate-800 shadow-2xs' : 'text-slate-500'
              }`}
            >
              ทั้งหมด
            </button>
            <button
              onClick={() => setTeamFilter('team1')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                teamFilter === 'team1' ? 'bg-[#1976D2] text-white shadow-2xs' : 'text-[#1976D2]'
              }`}
            >
              อุตรดิตถ์
            </button>
            <button
              onClick={() => setTeamFilter('team2')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                teamFilter === 'team2' ? 'bg-[#F59E0B] text-white shadow-2xs' : 'text-[#F59E0B]'
              }`}
            >
              สุโขทัย
            </button>
          </div>

          <div>
            <select
              aria-label="กรองตามสถานะ"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:ring-2 focus:ring-[#087CC1]"
            >
              <option value="all">สถานะ: ทั้งหมด</option>
              <option value="CONFIRMED">ยืนยันแล้ว (Confirmed)</option>
              <option value="TENTATIVE">รอยืนยัน (Tentative)</option>
              <option value="CANCELLED">ยกเลิก (Cancelled)</option>
            </select>
          </div>
        </div>

        {/* Quick Month Filter Pills */}
        {availableMonths.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-slate-100 no-scrollbar">
            <span className="text-xs font-semibold text-slate-400 whitespace-nowrap mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" />
              <span>เดือน:</span>
            </span>
            <button
              type="button"
              onClick={() => setSelectedMonth('all')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedMonth === 'all'
                  ? 'bg-[#087CC1] text-white shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              ทุกเดือน ({appointments.length})
            </button>
            {availableMonths.map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => setSelectedMonth(m.key)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedMonth === m.key
                    ? 'bg-[#087CC1] text-white shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {m.label} ({m.count})
              </button>
            ))}

            {(selectedMonth !== 'all' || teamFilter !== 'all' || statusFilter !== 'all' || searchTerm) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedMonth('all');
                  setTeamFilter('all');
                  setStatusFilter('all');
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

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[1050px] border-collapse">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-sm font-semibold">
              <tr>
                <th className="py-3.5 px-3.5 min-w-[90px] text-center">สาย</th>
                <th className="py-3.5 px-3.5 min-w-[150px]">วันที่ / เวลา</th>
                <th className="py-3.5 px-3.5 min-w-[200px]">โรงเรียน</th>
                <th className="py-3.5 px-3.5 min-w-[170px]">อาจารย์ผู้รับผิดชอบ</th>
                <th className="py-3.5 px-3.5 min-w-[140px]">ครูแนะแนว</th>
                <th className="py-3.5 px-3.5 min-w-[130px]">ยานพาหนะ</th>
                <th className="py-3.5 px-3.5 min-w-[95px] text-center">รูปภาพ</th>
                <th className="py-3.5 px-3.5 min-w-[125px] text-center">สถานะ</th>
                <th className="py-3.5 px-3.5 min-w-[130px] text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAppointments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400 text-sm">
                    ไม่พบข้อมูลนัดหมาย
                  </td>
                </tr>
              ) : (
                filteredAppointments.map((appt) => {
                  const isTeam1 = appt.teamId === 'team1';
                  const relativeDay = getRelativeThaiDayLabel(appt.date);
                  const photosCount = getApptPhotosCount(appt);

                  const cleanSchool = (s: string) =>
                    (s || '').replace(/^(โรงเรียน|รร\.)\s*/, '').trim().toLowerCase();
                  const apptClean = cleanSchool(appt.schoolName);
                  const matchedSub = submissions.find(
                    (s) => s.id === appt.submissionId || cleanSchool(s.schoolName) === apptClean
                  );
                  const matchedSchool = schools.find(
                    (s) => s.id === appt.schoolId || cleanSchool(s.schoolName) === apptClean
                  );

                  const teacherDisplay =
                    appt.teacherName ||
                    matchedSub?.teacherName ||
                    matchedSchool?.teacherName ||
                    matchedSchool?.contactPerson ||
                    '-';
                  const phoneDisplay =
                    appt.teacherPhone ||
                    matchedSub?.teacherPhone ||
                    matchedSchool?.teacherPhone ||
                    matchedSchool?.contactPhone;

                  const vehicleDisplay =
                    appt.vehicleName ||
                    matchedSub?.vehicleName ||
                    (isTeam1 ? 'VIGO กข 9914 (กระบะ 4 ประตู)' : 'MITSU บน 6738 (กระบะ 4 ประตู)');

                  return (
                    <tr
                      key={appt.id}
                      onClick={() => setSelectedAppointment(appt)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 px-3.5 text-center">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-md font-bold text-[12px] whitespace-nowrap ${
                            isTeam1 ? 'bg-[#E3F2FD] text-[#1976D2]' : 'bg-[#FFF7E0] text-[#F59E0B]'
                          }`}
                        >
                          {isTeam1 ? 'อุตรดิตถ์' : 'สุโขทัย'}
                        </span>
                      </td>
                      <td className="py-3.5 px-3.5">
                        <div className="whitespace-nowrap font-medium text-slate-900 text-sm">
                          {formatThaiShortDate(appt.date)}
                          <span className="ml-1.5 text-xs text-sky-700 font-normal">({relativeDay})</span>
                        </div>
                        <div className="whitespace-nowrap text-[13px] text-slate-500 font-normal mt-0.5">
                          เวลา {appt.startTime} - {appt.endTime} น.
                        </div>
                      </td>
                      <td className="py-3.5 px-3.5">
                        <div className="font-bold text-slate-900 text-sm leading-snug line-clamp-2">{appt.schoolName}</div>
                        {appt.note && <div className="text-[13px] text-slate-500 line-clamp-1 max-w-xs mt-0.5" title={appt.note}>{appt.note}</div>}
                      </td>
                      <td className="py-3.5 px-3.5 text-slate-800 text-sm">
                        <div className="font-medium text-slate-800">{appt.counselorName}</div>
                        {appt.teamMemberNames && (
                          <div className="text-[13px] text-slate-500 line-clamp-1 max-w-[160px]" title={appt.teamMemberNames}>
                            ทีมงาน: {appt.teamMemberNames}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-3.5 text-slate-800 text-sm">
                        <div className="font-medium text-slate-800">{teacherDisplay}</div>
                        {phoneDisplay && (
                          <div className="text-[13px] text-[#087CC1] font-semibold mt-0.5 whitespace-nowrap">
                            <a href={`tel:${phoneDisplay}`} onClick={(e) => e.stopPropagation()} className="hover:underline">
                              {phoneDisplay}
                            </a>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-3.5 text-slate-700 text-sm">
                        <div className="truncate max-w-[140px]" title={vehicleDisplay}>
                          {vehicleDisplay}
                        </div>
                      </td>
                      <td className="py-3.5 px-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                        {photosCount > 0 ? (
                          <button
                            type="button"
                            onClick={() => setSelectedAppointment(appt)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer"
                            title="คลิกเพื่อดูรูปภาพ"
                          >
                            <ImageIcon className="w-3.5 h-3.5 text-[#087CC1]" />
                            <span>{photosCount} รูป</span>
                          </button>
                        ) : (
                          <span className="text-xs text-slate-300 font-medium">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-3.5 text-center">
                        {getStatusBadge(appt.status)}
                      </td>
                      <td className="py-3.5 px-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                          {canEdit && appt.status !== 'COMPLETED' && appt.status !== 'CANCELLED' && (
                            <button
                              type="button"
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (
                                  confirm(
                                    `ยืนยันการเปลี่ยนสถานะ "${appt.schoolName}" เป็น "ออกแนะแนวแล้ว" หรือไม่?\n(ข้อมูลจะไปแสดงในหน้าประวัติการออกแนะแนวทันที)`
                                  )
                                ) {
                                  await updateAppointment(appt.id, { status: 'COMPLETED' }, currentUser);
                                }
                              }}
                              title="เปลี่ยนสถานะเป็น: ออกแนะแนวแล้ว"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-xl border border-emerald-200 transition-colors"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>ออกแนะแนวแล้ว</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedAppointment(appt)}
                            aria-label={`ดูรายละเอียด ${appt.schoolName}`}
                            title="ดูรายละเอียด"
                            className="w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-500 hover:text-[#087CC1] hover:bg-sky-50 rounded-xl transition-colors border border-transparent hover:border-sky-200"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => {
                                setAppointmentToEdit(appt);
                                setIsFormOpen(true);
                              }}
                              aria-label={`แก้ไขนัดหมาย ${appt.schoolName}`}
                              title="แก้ไข"
                              className="w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-xl transition-colors border border-transparent hover:border-amber-200"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleDelete(appt)}
                              aria-label={`ลบนัดหมาย ${appt.schoolName}`}
                              title="ลบ"
                              className="w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-200"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {filteredAppointments.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-sm">
            ไม่พบข้อมูลนัดหมาย
          </div>
        ) : (
          filteredAppointments.map((appt) => {
            const isTeam1 = appt.teamId === 'team1';
            const relativeDay = getRelativeThaiDayLabel(appt.date);
            const photosCount = getApptPhotosCount(appt);

            const cleanSchool = (s: string) =>
              (s || '').replace(/^(โรงเรียน|รร\.)\s*/, '').trim().toLowerCase();
            const apptClean = cleanSchool(appt.schoolName);
            const matchedSub = submissions.find(
              (s) => s.id === appt.submissionId || cleanSchool(s.schoolName) === apptClean
            );
            const matchedSchool = schools.find(
              (s) => s.id === appt.schoolId || cleanSchool(s.schoolName) === apptClean
            );

            const teacherDisplay =
              appt.teacherName ||
              matchedSub?.teacherName ||
              matchedSchool?.teacherName ||
              matchedSchool?.contactPerson ||
              '-';
            const phoneDisplay =
              appt.teacherPhone ||
              matchedSub?.teacherPhone ||
              matchedSchool?.teacherPhone ||
              matchedSchool?.contactPhone;

            const vehicleDisplay =
              appt.vehicleName ||
              matchedSub?.vehicleName ||
              (isTeam1 ? 'VIGO กข 9914 (กระบะ 4 ประตู)' : 'MITSU บน 6738 (กระบะ 4 ประตู)');
            return (
              <div
                key={appt.id}
                onClick={() => setSelectedAppointment(appt)}
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3 cursor-pointer"
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
                      {photosCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-sky-50 text-[#087CC1] rounded-md text-[11px] font-semibold border border-sky-100">
                          <ImageIcon className="w-3 h-3" />
                          <span>{photosCount} รูป</span>
                        </span>
                      )}
                      {getStatusBadge(appt.status)}
                    </div>
                    <h3 className="font-bold text-slate-800 text-base">
                      {appt.schoolName}
                    </h3>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold px-2 py-0.5 bg-blue-50 text-[#075A9C] rounded-full">
                      {relativeDay}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#087CC1]" />
                    <span>{formatThaiShortDate(appt.date)} {appt.startTime} น.</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Car className="w-3.5 h-3.5 text-amber-500" />
                    <span className="truncate">{vehicleDisplay}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <div>
                    <span className="text-slate-400">ผู้รับผิดชอบ: </span>
                    <span className="font-medium text-slate-700">{appt.counselorName}</span>
                  </div>
                  {phoneDisplay && (
                    <div onClick={(e) => e.stopPropagation()}>
                      <a
                        href={`tel:${phoneDisplay}`}
                        className="inline-flex items-center gap-1 text-[#087CC1] hover:underline font-semibold"
                      >
                        <Phone className="w-3 h-3" />
                        <span>{phoneDisplay}</span>
                      </a>
                    </div>
                  )}
                </div>

                {canEdit && appt.status !== 'COMPLETED' && appt.status !== 'CANCELLED' && (
                  <div className="pt-2 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={async () => {
                        if (
                          confirm(
                            `ยืนยันการเปลี่ยนสถานะ "${appt.schoolName}" เป็น "ออกแนะแนวแล้ว" หรือไม่?\n(ข้อมูลจะไปแสดงในหน้าประวัติการออกแนะแนวทันที)`
                          )
                        ) {
                          await updateAppointment(appt.id, { status: 'COMPLETED' }, currentUser);
                        }
                      }}
                      className="w-full py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg border border-emerald-200 flex items-center justify-center gap-1 transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>เปลี่ยนสถานะเป็น: ออกแนะแนวแล้ว</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Appointment Detail Modal */}
      {selectedAppointment && (
        <AppointmentDetailModal
          appointment={selectedAppointment}
          onClose={() => setSelectedAppointment(null)}
          onEdit={(appt) => {
            setSelectedAppointment(null);
            setAppointmentToEdit(appt);
            setIsFormOpen(true);
          }}
          onRecordTrip={(appt) => {
            setSelectedAppointment(null);
            onRecordTrip(appt);
          }}
          submissions={submissions}
        />
      )}

      {/* Form Modal */}
      <AppointmentFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setAppointmentToEdit(null);
        }}
        schools={schools}
        submissions={submissions}
        appointmentToEdit={appointmentToEdit}
        onSave={handleSaveAppointment}
      />

      {/* UTT Appointment Import Modal */}
      <AppointmentImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => setIsImportModalOpen(false)}
        existingAppointments={appointments}
        schools={schools}
      />
    </div>
  );
};
