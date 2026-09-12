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
} from 'lucide-react';
import { School, DocumentSubmission, Appointment, FieldTrip, TeamId, SchoolStatus } from '../../types';
import { SchoolDetailModal } from './SchoolDetailModal';
import { SchoolFormModal } from './SchoolFormModal';
import { addSchool, updateSchool, deleteSchool } from '../../firebase/dbService';
import { useAuth } from '../../context/AuthContext';

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

  const [searchTerm, setSearchTerm] = useState('');
  const [teamFilter, setTeamFilter] = useState<'all' | TeamId>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | SchoolStatus>('all');
  const [districtFilter, setDistrictFilter] = useState<string>('all');

  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [schoolToEdit, setSchoolToEdit] = useState<School | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Unique districts for filter
  const districts = useMemo(() => {
    const list = Array.from(new Set(schools.map((s) => s.district).filter(Boolean))) as string[];
    return list.sort((a, b) => a.localeCompare(b, 'th'));
  }, [schools]);

  // Filtered schools
  const filteredSchools = useMemo(() => {
    return schools.filter((school) => {
      const matchSearch =
        !searchTerm ||
        school.schoolName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        school.teacherName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        school.district.toLowerCase().includes(searchTerm.toLowerCase());

      const matchTeam = teamFilter === 'all' || school.teamId === teamFilter;
      const matchStatus = statusFilter === 'all' || school.currentStatus === statusFilter;
      const matchDistrict = districtFilter === 'all' || school.district === districtFilter;

      return matchSearch && matchTeam && matchStatus && matchDistrict;
    });
  }, [schools, searchTerm, teamFilter, statusFilter, districtFilter]);

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
      DOCUMENT_SUBMITTED: { text: 'ยื่นหนังสือแล้ว', bg: 'bg-blue-50', textCol: 'text-blue-700' },
      WAITING_CONTACT: { text: 'รอติดต่อกลับ', bg: 'bg-amber-50', textCol: 'text-amber-700' },
      WAITING_APPOINTMENT: { text: 'รอนัดหมาย', bg: 'bg-indigo-50', textCol: 'text-indigo-700' },
      APPOINTED: { text: 'นัดหมายแล้ว', bg: 'bg-purple-50', textCol: 'text-purple-700' },
      GUIDANCE_COMPLETED: { text: 'ออกแนะแนวแล้ว', bg: 'bg-emerald-50', textCol: 'text-emerald-700' },
      CANCELLED: { text: 'ยกเลิก', bg: 'bg-red-50', textCol: 'text-red-700' },
    };
    const s = map[status] || map.NOT_STARTED;
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${s.bg} ${s.textCol}`}>
        {s.text}
      </span>
    );
  };

  return (
    <div className="space-y-5">
      {/* Top Title & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-[#087CC1]" />
            <span>ข้อมูลโรงเรียน ({schools.length} โรงเรียน)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            ฐานข้อมูลโรงเรียนมัธยมและขยายโอกาสเป้าหมายในการแนะแนวการศึกษา
          </p>
        </div>

        {canEdit && (
          <button
            onClick={() => {
              setSchoolToEdit(null);
              setIsFormOpen(true);
            }}
            id="btn-add-school"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#087CC1] hover:bg-[#075A9C] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>เพิ่มโรงเรียนใหม่</span>
          </button>
        )}
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
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#087CC1] focus:bg-white"
            />
          </div>

          {/* Team Filter */}
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setTeamFilter('all')}
              className={`flex-1 py-1 text-xs font-semibold rounded-lg transition-colors ${
                teamFilter === 'all' ? 'bg-white text-slate-800 shadow-2xs' : 'text-slate-500'
              }`}
            >
              ทั้งหมด
            </button>
            <button
              onClick={() => setTeamFilter('team1')}
              className={`flex-1 py-1 text-xs font-semibold rounded-lg transition-colors ${
                teamFilter === 'team1' ? 'bg-[#1976D2] text-white shadow-2xs' : 'text-[#1976D2]'
              }`}
            >
              สายที่ 1
            </button>
            <button
              onClick={() => setTeamFilter('team2')}
              className={`flex-1 py-1 text-xs font-semibold rounded-lg transition-colors ${
                teamFilter === 'team2' ? 'bg-[#F59E0B] text-white shadow-2xs' : 'text-[#F59E0B]'
              }`}
            >
              สายที่ 2
            </button>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:ring-2 focus:ring-[#087CC1]"
            >
              <option value="all">สถานะ: ทั้งหมด</option>
              <option value="NOT_STARTED">ยังไม่ดำเนินการ</option>
              <option value="DOCUMENT_SUBMITTED">ยื่นหนังสือแล้ว</option>
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
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:ring-2 focus:ring-[#087CC1]"
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
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
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
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold">
            <tr>
              <th className="py-3 px-4 w-12">สาย</th>
              <th className="py-3 px-4">ชื่อโรงเรียน</th>
              <th className="py-3 px-4">อำเภอ</th>
              <th className="py-3 px-4">ครูแนะแนว</th>
              <th className="py-3 px-4">เบอร์โทร</th>
              <th className="py-3 px-4 text-center">ม.3 / ม.6</th>
              <th className="py-3 px-4 text-center">สถานะ</th>
              <th className="py-3 px-4 text-right">จัดการ</th>
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
                return (
                  <tr
                    key={school.id}
                    onClick={() => setSelectedSchool(school)}
                    className="hover:bg-[#EAF6FD]/40 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-sm font-bold text-[10px] ${
                          isTeam1 ? 'bg-[#E3F2FD] text-[#1976D2]' : 'bg-[#FFF7E0] text-[#F59E0B]'
                        }`}
                      >
                        {isTeam1 ? 'สาย 1' : 'สาย 2'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800 text-sm">{school.schoolName}</div>
                      <div className="text-[11px] text-slate-400">{school.schoolId}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      อำเภอ{school.district}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">{school.teacherName || '-'}</div>
                      <div className="text-[10px] text-slate-400">{school.teacherPosition}</div>
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
                    <td className="py-3 px-4 text-center font-medium text-slate-700">
                      {school.studentM3 || 0} / {school.studentM6 || 0}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {getStatusBadge(school.currentStatus)}
                    </td>
                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedSchool(school)}
                          title="ดูรายละเอียด"
                          className="p-1.5 text-slate-500 hover:text-[#087CC1] hover:bg-slate-100 rounded-lg"
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
                            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-slate-100 rounded-lg"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => handleDelete(school)}
                            title="ลบ"
                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded-lg"
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

      {/* Mobile Card List View */}
      <div className="md:hidden space-y-3">
        {filteredSchools.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-sm">
            ไม่พบข้อมูลโรงเรียน
          </div>
        ) : (
          filteredSchools.map((school) => {
            const isTeam1 = school.teamId === 'team1';
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
                        {isTeam1 ? 'สาย 1' : 'สาย 2'}
                      </span>
                      {getStatusBadge(school.currentStatus)}
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
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-500">ครูแนะแนว: </span>
                    <span className="font-semibold text-slate-800">{school.teacherName || '-'}</span>
                  </div>
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
    </div>
  );
};
