import { SchoolImportModal } from './SchoolImportModal';
import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Filter,
  Phone,
  Eye,
  Edit2,
  Trash2,
  GraduationCap,
  ChevronRight,
  MapPin,
  Users,
  CalendarCheck,
} from 'lucide-react';
import { School, DocumentSubmission, Appointment, FieldTrip, TeamId, SchoolStatus } from '../../types';
import { SchoolDetailModal } from './SchoolDetailModal';
import { SchoolFormModal } from './SchoolFormModal';
import { addSchool, updateSchool, deleteSchool } from '../../firebase/dbService';
import { useAuth } from '../../context/AuthContext';
import { getSchoolEffectiveStatus } from '../../utils/schoolStatus';

export type SchoolScopeFilter =
  | 'waiting'
  | 'waiting_appointment'
  | 'waiting_contact'
  | 'completed'
  | 'not_started'
  | 'all';

interface SchoolsViewProps {
  schools: School[];
  submissions: DocumentSubmission[];
  appointments: Appointment[];
  fieldTrips: FieldTrip[];
  onNewSubmissionForSchool: (school: School) => void;
  onNewAppointmentForSchool: (school: School) => void;
}

export const SchoolsView: React.FC<SchoolsViewProps> = ({
  schools,
  submissions,
  appointments,
  fieldTrips,
  onNewSubmissionForSchool,
  onNewAppointmentForSchool,
}) => {
  const { currentUser, isAdmin, canEdit } = useAuth();

  // Scope filter: defaults to 'waiting' (รอนัดหมาย & รอติดต่อกลับ) per user requirement
  const [scopeFilter, setScopeFilter] = useState<SchoolScopeFilter>('waiting');
  const [searchTerm, setSearchTerm] = useState('');
  const [teamFilter, setTeamFilter] = useState<'all' | TeamId>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | SchoolStatus>('all');
  const [districtFilter, setDistrictFilter] = useState<string>('all');

  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [schoolToEdit, setSchoolToEdit] = useState<School | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Unique districts for filter
  const districts = useMemo(() => {
    const list = Array.from(new Set(schools.map((s) => s.district).filter(Boolean))) as string[];
    return list.sort((a, b) => a.localeCompare(b, 'th'));
  }, [schools]);

  // Effective dynamic status mapping
  const schoolStatusMap = useMemo(() => {
    const map = new Map<string, SchoolStatus>();
    schools.forEach((s) => {
      map.set(s.id, getSchoolEffectiveStatus(s, submissions, appointments, fieldTrips));
    });
    return map;
  }, [schools, submissions, appointments, fieldTrips]);

  // Scope Counts
  const scopeCounts = useMemo(() => {
    let waiting = 0;
    let waitingAppt = 0;
    let waitingContact = 0;
    let completed = 0;
    let notStarted = 0;

    schools.forEach((s) => {
      const st = schoolStatusMap.get(s.id) || s.currentStatus;
      if (st === 'DOCUMENT_SUBMITTED' || st === 'WAITING_APPOINTMENT') {
        waitingAppt++;
        waiting++;
      } else if (st === 'WAITING_CONTACT') {
        waitingContact++;
        waiting++;
      } else if (st === 'GUIDANCE_COMPLETED') {
        completed++;
      } else if (st === 'NOT_STARTED') {
        notStarted++;
      }
    });

    return {
      all: schools.length,
      waiting,
      waitingAppt,
      waitingContact,
      completed,
      notStarted,
    };
  }, [schools, schoolStatusMap]);

  // Filtered schools
  const filteredSchools = useMemo(() => {
    return schools.filter((school) => {
      const matchSearch =
        !searchTerm ||
        school.schoolName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        school.teacherName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        school.district.toLowerCase().includes(searchTerm.toLowerCase());

      const effectiveStatus = schoolStatusMap.get(school.id) || school.currentStatus;

      // Scope match
      let matchScope = true;
      if (scopeFilter === 'waiting') {
        matchScope =
          effectiveStatus === 'DOCUMENT_SUBMITTED' ||
          effectiveStatus === 'WAITING_APPOINTMENT' ||
          effectiveStatus === 'WAITING_CONTACT';
      } else if (scopeFilter === 'waiting_appointment') {
        matchScope =
          effectiveStatus === 'DOCUMENT_SUBMITTED' || effectiveStatus === 'WAITING_APPOINTMENT';
      } else if (scopeFilter === 'waiting_contact') {
        matchScope = effectiveStatus === 'WAITING_CONTACT';
      } else if (scopeFilter === 'completed') {
        matchScope = effectiveStatus === 'GUIDANCE_COMPLETED';
      } else if (scopeFilter === 'not_started') {
        matchScope = effectiveStatus === 'NOT_STARTED';
      }

      const matchTeam = teamFilter === 'all' || school.teamId === teamFilter;
      const matchStatus = statusFilter === 'all' || effectiveStatus === statusFilter;
      const matchDistrict = districtFilter === 'all' || school.district === districtFilter;

      return matchSearch && matchScope && matchTeam && matchStatus && matchDistrict;
    });
  }, [schools, searchTerm, scopeFilter, teamFilter, statusFilter, districtFilter, schoolStatusMap]);

  const handleSaveSchool = async (data: Omit<School, 'id'>) => {
    if (schoolToEdit) {
      await updateSchool(schoolToEdit.id, data, currentUser);
    } else {
      await addSchool(data, currentUser);
    }
  };

  const handleDelete = async (school: School) => {
    if (!isAdmin) return;
    if (confirm(`ยืนยันการลบข้อมูล "${school.schoolName}" หรือไม่?`)) {
      await deleteSchool(school.id, school.schoolName, currentUser);
      if (selectedSchool?.id === school.id) setSelectedSchool(null);
    }
  };

  const getStatusBadge = (status: SchoolStatus) => {
    const map: Record<SchoolStatus, { text: string; bg: string; textCol: string }> = {
      NOT_STARTED: { text: 'ยังไม่ดำเนินการ', bg: 'bg-slate-100', textCol: 'text-slate-600' },
      DOCUMENT_SUBMITTED: { text: 'ยื่นหนังสือแล้ว / รอนัดหมาย', bg: 'bg-blue-50', textCol: 'text-blue-700' },
      WAITING_CONTACT: { text: 'รอติดต่อกลับ', bg: 'bg-amber-50', textCol: 'text-amber-700' },
      WAITING_APPOINTMENT: { text: 'รอนัดหมาย', bg: 'bg-indigo-50', textCol: 'text-indigo-700' },
      APPOINTED: { text: 'นัดหมายแล้ว', bg: 'bg-purple-50', textCol: 'text-purple-700' },
      GUIDANCE_COMPLETED: { text: 'ออกแนะแนวแล้ว', bg: 'bg-emerald-50', textCol: 'text-emerald-700' },
      CANCELLED: { text: 'ยกเลิก', bg: 'bg-red-50', textCol: 'text-red-700' },
    };
    const s = map[status] || map.NOT_STARTED;
    return (
      <span className={`px-3 py-1 rounded-full text-[13px] font-semibold whitespace-nowrap ${s.bg} ${s.textCol}`}>
        {s.text}
      </span>
    );
  };

  return (
    <div className="space-y-5">
      {/* Top Title & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-[#087CC1]" />
            <span>
              {scopeFilter === 'waiting'
                ? `รร. ที่รอนัดหมายและรอติดต่อกลับ (${filteredSchools.length} โรงเรียน)`
                : scopeFilter === 'waiting_appointment'
                ? `รร. ที่รอนัดหมาย (${filteredSchools.length} โรงเรียน)`
                : scopeFilter === 'waiting_contact'
                ? `รร. ที่รอติดต่อกลับ (${filteredSchools.length} โรงเรียน)`
                : scopeFilter === 'completed'
                ? `รร. ที่ออกแนะแนวแล้ว (${filteredSchools.length} โรงเรียน)`
                : scopeFilter === 'not_started'
                ? `รร. ที่ยังไม่ดำเนินการ (${filteredSchools.length} โรงเรียน)`
                : `ข้อมูลโรงเรียนทั้งหมด (${schools.length} โรงเรียน)`}
            </span>
          </h1>
          <p className="text-[13px] sm:text-sm text-slate-500 mt-1">
            {scopeFilter === 'waiting'
              ? 'รายชื่อโรงเรียนเป้าหมายที่ยื่นหนังสือแล้ว อยู่ระหว่างรอนัดหมายหรือรอประสานงานติดต่อกลับ'
              : 'ฐานข้อมูลโรงเรียนมัธยมและขยายโอกาสเป้าหมายในการแนะแนวการศึกษา'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canEdit && (
            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 hover:bg-sky-100 transition-colors"
            >
              นำเข้าจาก Excel
            </button>
          )}
          {canEdit && (
            <button
              onClick={() => {
                setSchoolToEdit(null);
                setIsFormOpen(true);
              }}
              id="btn-add-school"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#087CC1] hover:bg-[#075A9C] text-white text-sm font-semibold rounded-xl shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่มโรงเรียนใหม่</span>
            </button>
          )}
        </div>
      </div>

      {/* Scope Tabs (Default to 'waiting' per user instruction) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => {
            setScopeFilter('waiting');
            setStatusFilter('all');
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${
            scopeFilter === 'waiting'
              ? 'bg-[#087CC1] text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span>รอนัดหมาย &amp; รอติดต่อกลับ</span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              scopeFilter === 'waiting'
                ? 'bg-white/20 text-white'
                : 'bg-amber-100 text-amber-800'
            }`}
          >
            {scopeCounts.waiting}
          </span>
        </button>

        <button
          onClick={() => {
            setScopeFilter('waiting_appointment');
            setStatusFilter('all');
          }}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${
            scopeFilter === 'waiting_appointment'
              ? 'bg-[#087CC1] text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span>รอนัดหมาย</span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              scopeFilter === 'waiting_appointment'
                ? 'bg-white/20 text-white'
                : 'bg-indigo-100 text-indigo-800'
            }`}
          >
            {scopeCounts.waitingAppt}
          </span>
        </button>

        <button
          onClick={() => {
            setScopeFilter('waiting_contact');
            setStatusFilter('all');
          }}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${
            scopeFilter === 'waiting_contact'
              ? 'bg-[#087CC1] text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span>รอติดต่อกลับ</span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              scopeFilter === 'waiting_contact'
                ? 'bg-white/20 text-white'
                : 'bg-amber-100 text-amber-800'
            }`}
          >
            {scopeCounts.waitingContact}
          </span>
        </button>

        <button
          onClick={() => {
            setScopeFilter('completed');
            setStatusFilter('all');
          }}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${
            scopeFilter === 'completed'
              ? 'bg-[#087CC1] text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span>ออกแนะแนวแล้ว</span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              scopeFilter === 'completed'
                ? 'bg-white/20 text-white'
                : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            {scopeCounts.completed}
          </span>
        </button>

        <button
          onClick={() => {
            setScopeFilter('not_started');
            setStatusFilter('all');
          }}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${
            scopeFilter === 'not_started'
              ? 'bg-[#087CC1] text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span>ยังไม่ดำเนินการ</span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              scopeFilter === 'not_started'
                ? 'bg-white/20 text-white'
                : 'bg-slate-100 text-slate-700'
            }`}
          >
            {scopeCounts.notStarted}
          </span>
        </button>

        <button
          onClick={() => {
            setScopeFilter('all');
            setStatusFilter('all');
          }}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${
            scopeFilter === 'all'
              ? 'bg-slate-800 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span>ทั้งหมด</span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              scopeFilter === 'all'
                ? 'bg-white/20 text-white'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {scopeCounts.all}
          </span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Search box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาชื่อโรงเรียน, ครูแนะแนว, อำเภอ..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#087CC1] focus:bg-white"
            />
          </div>

          {/* Team Filter */}
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setTeamFilter('all')}
              className={`flex-1 py-1 text-xs sm:text-sm font-semibold rounded-lg transition-colors ${
                teamFilter === 'all' ? 'bg-white text-slate-800 shadow-2xs' : 'text-slate-500'
              }`}
            >
              ทั้งหมด
            </button>
            <button
              onClick={() => setTeamFilter('team1')}
              className={`flex-1 py-1 text-xs sm:text-sm font-semibold rounded-lg transition-colors ${
                teamFilter === 'team1' ? 'bg-[#1976D2] text-white shadow-2xs' : 'text-[#1976D2]'
              }`}
            >
              อุตรดิตถ์
            </button>
            <button
              onClick={() => setTeamFilter('team2')}
              className={`flex-1 py-1 text-xs sm:text-sm font-semibold rounded-lg transition-colors ${
                teamFilter === 'team2' ? 'bg-[#F59E0B] text-white shadow-2xs' : 'text-[#F59E0B]'
              }`}
            >
              สุโขทัย
            </button>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:ring-2 focus:ring-[#087CC1]"
            >
              <option value="all">สถานะ: ทั้งหมด</option>
              <option value="NOT_STARTED">ยังไม่ดำเนินการ</option>
              <option value="DOCUMENT_SUBMITTED">ยื่นหนังสือแล้ว / รอนัดหมาย</option>
              <option value="WAITING_CONTACT">รอติดต่อกลับ</option>
              <option value="WAITING_APPOINTMENT">รอนัดหมาย</option>
              <option value="APPOINTED">นัดหมายแล้ว</option>
              <option value="GUIDANCE_COMPLETED">ออกแนะแนวแล้ว</option>
              <option value="CANCELLED">ยกเลิก</option>
            </select>
          </div>

          {/* District Filter */}
          <div>
            <select
              value={districtFilter}
              onChange={(e) => setDistrictFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:ring-2 focus:ring-[#087CC1]"
            >
              <option value="all">อำเภอ: ทั้งหมด ({districts.length} อำเภอ)</option>
              {districts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between text-[13px] text-slate-500 pt-1">
          <span>พบ {filteredSchools.length} จากทั้งหมด {schools.length} โรงเรียน</span>
          {(searchTerm || teamFilter !== 'all' || statusFilter !== 'all' || districtFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setTeamFilter('all');
                setStatusFilter('all');
                setDistrictFilter('all');
              }}
              className="text-[#087CC1] hover:underline font-semibold"
            >
              ล้างตัวกรอง
            </button>
          )}
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[1050px]">
          <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold text-sm">
            <tr>
              <th className="py-3.5 px-4 whitespace-nowrap min-w-[90px]">สาย</th>
              <th className="py-3.5 px-4 min-w-[200px]">ชื่อโรงเรียน</th>
              <th className="py-3.5 px-4 whitespace-nowrap min-w-[110px]">อำเภอ</th>
              <th className="py-3.5 px-4 min-w-[150px]">ครูแนะแนว</th>
              <th className="py-3.5 px-4 whitespace-nowrap min-w-[130px]">เบอร์โทร</th>
              <th className="py-3.5 px-4 text-center whitespace-nowrap min-w-[100px]">ม.3 / ม.6</th>
              <th className="py-3.5 px-4 text-center whitespace-nowrap min-w-[140px]">สถานะ</th>
              <th className="py-3.5 px-4 text-right whitespace-nowrap min-w-[130px]">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredSchools.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400">
                  ไม่พบข้อมูลโรงเรียนตามเงื่อนไขที่ค้นหา
                </td>
              </tr>
            ) : (
              filteredSchools.map((school) => {
                const isTeam1 = school.teamId === 'team1';
                const effectiveStatus = schoolStatusMap.get(school.id) || school.currentStatus;
                return (
                  <tr
                    key={school.id}
                    onClick={() => setSelectedSchool(school)}
                    className="hover:bg-[#EAF6FD]/40 cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-md font-semibold text-xs whitespace-nowrap ${
                          isTeam1 ? 'bg-[#E3F2FD] text-[#1976D2]' : 'bg-[#FFF7E0] text-[#F59E0B]'
                        }`}
                      >
                        {isTeam1 ? 'อุตรดิตถ์' : 'สุโขทัย'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800 text-sm">{school.schoolName}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{school.schoolId}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 text-sm whitespace-nowrap">
                      อำเภอ{school.district}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800 text-sm">{school.teacherName || '-'}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{school.teacherPosition}</div>
                    </td>
                    <td className="py-3 px-4">
                      {school.teacherPhone ? (
                        <a
                          href={`tel:${school.teacherPhone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-[#087CC1] hover:underline font-semibold flex items-center gap-1"
                        >
                          <Phone className="w-3 h-3" />
                          <span>{school.teacherPhone}</span>
                        </a>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center font-medium text-slate-700 text-sm whitespace-nowrap">
                      {school.studentM3 || 0} / {school.studentM6 || 0}
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {getStatusBadge(effectiveStatus)}
                    </td>
                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {canEdit &&
                          (effectiveStatus === 'DOCUMENT_SUBMITTED' ||
                            effectiveStatus === 'WAITING_APPOINTMENT' ||
                            effectiveStatus === 'WAITING_CONTACT') && (
                            <button
                              onClick={() => onNewAppointmentForSchool(school)}
                              title="สร้างนัดหมายสำหรับโรงเรียนนี้"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg border border-emerald-200 transition-colors shrink-0 shadow-2xs"
                            >
                              <CalendarCheck className="w-3.5 h-3.5" />
                              <span>สร้างนัดหมาย</span>
                            </button>
                          )}
                        <button
                          onClick={() => setSelectedSchool(school)}
                          title="ดูรายละเอียด"
                          className="w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-500 hover:text-[#087CC1] hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {canEdit && (
                          <button
                            onClick={() => {
                              setSchoolToEdit(school);
                              setIsFormOpen(true);
                            }}
                            title="แก้ไข"
                            className="w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-500 hover:text-amber-600 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => handleDelete(school)}
                            title="ลบ"
                            className="w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded-lg transition-colors"
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

      {/* Mobile Card List View */}
      <div className="md:hidden space-y-3">
        {filteredSchools.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-sm">
            ไม่พบข้อมูลโรงเรียน
          </div>
        ) : (
          filteredSchools.map((school) => {
            const isTeam1 = school.teamId === 'team1';
            const effectiveStatus = schoolStatusMap.get(school.id) || school.currentStatus;
            return (
              <div
                key={school.id}
                onClick={() => setSelectedSchool(school)}
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
                      {getStatusBadge(effectiveStatus)}
                    </div>
                    <h3 className="font-bold text-slate-800 text-base leading-snug">
                      {school.schoolName}
                    </h3>
                    <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span>อำเภอ{school.district}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
                </div>

                {/* Teacher contact row */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs gap-2">
                  <div className="min-w-0">
                    <span className="text-slate-500">ครูแนะแนว: </span>
                    <span className="font-semibold text-slate-800">{school.teacherName || '-'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {canEdit &&
                      (effectiveStatus === 'DOCUMENT_SUBMITTED' ||
                        effectiveStatus === 'WAITING_APPOINTMENT' ||
                        effectiveStatus === 'WAITING_CONTACT') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onNewAppointmentForSchool(school);
                          }}
                          className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-lg font-semibold flex items-center gap-1 border border-emerald-200"
                        >
                          <CalendarCheck className="w-3 h-3" />
                          <span>นัดหมาย</span>
                        </button>
                      )}
                    {school.teacherPhone && (
                      <a
                        href={`tel:${school.teacherPhone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="px-2.5 py-1 bg-[#EAF6FD] text-[#087CC1] rounded-lg font-semibold flex items-center gap-1"
                      >
                        <Phone className="w-3 h-3" />
                        <span>{school.teacherPhone}</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Detail Modal */}
      {selectedSchool && (
        <SchoolDetailModal
          school={selectedSchool}
          submissions={submissions}
          appointments={appointments}
          fieldTrips={fieldTrips}
          onClose={() => setSelectedSchool(null)}
          onEdit={(sch) => {
            setSelectedSchool(null);
            setSchoolToEdit(sch);
            setIsFormOpen(true);
          }}
          onNewSubmissionForSchool={(sch) => {
            setSelectedSchool(null);
            onNewSubmissionForSchool(sch);
          }}
          onNewAppointmentForSchool={(sch) => {
            setSelectedSchool(null);
            onNewAppointmentForSchool(sch);
          }}
        />
      )}

      {/* Form Modal */}
      <SchoolFormModal
        schoolToEdit={schoolToEdit}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSchoolToEdit(null);
        }}
        onSave={handleSaveSchool}
      />
      <SchoolImportModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} onSuccess={() => {}} existingSchools={schools}/>
    </div>
  );
};
