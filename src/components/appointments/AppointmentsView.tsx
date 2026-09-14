import React, { useState, useMemo } from 'react';
import {
  CalendarCheck,
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
} from 'lucide-react';
import { Appointment, School, TeamId, AppointmentStatus } from '../../types';
import { formatThaiShortDate, getRelativeThaiDayLabel } from '../../utils/dateUtils';
import { AppointmentDetailModal } from './AppointmentDetailModal';
import { AppointmentFormModal } from './AppointmentFormModal';
import { createAppointment, updateAppointment, deleteAppointment } from '../../firebase/dbService';
import { useAuth } from '../../context/AuthContext';

interface AppointmentsViewProps {
  appointments: Appointment[];
  schools: School[];
  onRecordTrip: (appointment: Appointment) => void;
}

export const AppointmentsView: React.FC<AppointmentsViewProps> = ({
  appointments,
  schools,
  onRecordTrip,
}) => {
  const { currentUser, isAdmin, canEdit } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [teamFilter, setTeamFilter] = useState<'all' | TeamId>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | AppointmentStatus>('all');

  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [appointmentToEdit, setAppointmentToEdit] = useState<Appointment | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const filteredAppointments = useMemo(() => {
    return appointments.filter((appt) => {
      const matchSearch =
        !searchTerm ||
        appt.schoolName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appt.counselorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appt.teacherName?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchTeam = teamFilter === 'all' || appt.teamId === teamFilter;
      const matchStatus = statusFilter === 'all' || appt.status === statusFilter;

      return matchSearch && matchTeam && matchStatus;
    });
  }, [appointments, searchTerm, teamFilter, statusFilter]);

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
      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${c.bg} ${c.text}`}>
        {c.label}
      </span>
    );
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <CalendarCheck className="w-6 h-6 text-[#087CC1]" />
            <span>รายการนัดหมายแนะแนว ({appointments.length} รายการ)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            ตารางกำหนดการนัดหมายลงพื้นที่ วิทยาลัยเทคโนโลยีอุตรดิตถ์
          </p>
        </div>

        {canEdit && (
          <button
            onClick={() => {
              setAppointmentToEdit(null);
              setIsFormOpen(true);
            }}
            id="btn-add-appointment"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#087CC1] hover:bg-[#075A9C] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>สร้างนัดหมายใหม่</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาชื่อโรงเรียน, อาจารย์, ครูแนะแนว..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#087CC1] focus:bg-white"
            />
          </div>

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
              อุตรดิตถ์
            </button>
            <button
              onClick={() => setTeamFilter('team2')}
              className={`flex-1 py-1 text-xs font-semibold rounded-lg transition-colors ${
                teamFilter === 'team2' ? 'bg-[#F59E0B] text-white shadow-2xs' : 'text-[#F59E0B]'
              }`}
            >
              สุโขทัย
            </button>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:ring-2 focus:ring-[#087CC1]"
            >
              <option value="all">สถานะ: ทั้งหมด</option>
              <option value="CONFIRMED">ยืนยันแล้ว (Confirmed)</option>
              <option value="TENTATIVE">รอยืนยัน (Tentative)</option>
              <option value="COMPLETED">ออกแนะแนวแล้ว (Completed)</option>
              <option value="CANCELLED">ยกเลิก (Cancelled)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold">
            <tr>
              <th className="py-3 px-4">สาย</th>
              <th className="py-3 px-4">วันที่ / เวลา</th>
              <th className="py-3 px-4">โรงเรียน</th>
              <th className="py-3 px-4">อาจารย์ผู้รับผิดชอบ</th>
              <th className="py-3 px-4">ครูแนะแนว</th>
              <th className="py-3 px-4">ยานพาหนะ</th>
              <th className="py-3 px-4 text-center">สถานะ</th>
              <th className="py-3 px-4 text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredAppointments.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400">
                  ไม่พบข้อมูลนัดหมาย
                </td>
              </tr>
            ) : (
              filteredAppointments.map((appt) => {
                const isTeam1 = appt.teamId === 'team1';
                const relativeDay = getRelativeThaiDayLabel(appt.date);
                return (
                  <tr
                    key={appt.id}
                    onClick={() => setSelectedAppointment(appt)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-sm font-bold text-[10px] ${
                          isTeam1 ? 'bg-[#E3F2FD] text-[#1976D2]' : 'bg-[#FFF7E0] text-[#F59E0B]'
                        }`}
                      >
                        {isTeam1 ? 'อุตรดิตถ์' : 'สุโขทัย'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">
                        {formatThaiShortDate(appt.date)}
                        <span className="ml-1.5 text-[10px] text-slate-400">({relativeDay})</span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {appt.startTime} - {appt.endTime} น.
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800 text-sm">{appt.schoolName}</div>
                      {appt.note && <div className="text-[10px] text-slate-400 truncate max-w-xs">{appt.note}</div>}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">{appt.counselorName}</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[140px]">{appt.teamMemberNames}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-slate-800">{appt.teacherName || '-'}</div>
                      {appt.teacherPhone && (
                        <div className="text-[11px] text-[#087CC1] font-semibold">{appt.teacherPhone}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600 truncate max-w-[130px]">
                      {appt.vehicleName || '-'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {getStatusBadge(appt.status)}
                    </td>
                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedAppointment(appt)}
                          title="ดูรายละเอียด"
                          className="p-1.5 text-slate-500 hover:text-[#087CC1] hover:bg-slate-100 rounded-lg"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {canEdit && (
                          <button
                            onClick={() => {
                              setAppointmentToEdit(appt);
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
                            onClick={() => handleDelete(appt)}
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
                      {getStatusBadge(appt.status)}
                    </div>
                    <h3 className="font-bold text-slate-800 text-base">
                      {appt.schoolName}
                    </h3>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-bold text-[#087CC1] bg-[#EAF6FD] px-2 py-0.5 rounded-md">
                      {relativeDay}
                    </span>
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-xl text-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{formatThaiShortDate(appt.date)} • {appt.startTime} - {appt.endTime} น.</span>
                  </div>
                  <div>
                    <span className="text-slate-500">อาจารย์: </span>
                    <span className="font-medium text-slate-800">{appt.counselorName}</span>
                  </div>
                  {appt.teacherPhone && (
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-slate-500">ครูแนะแนว: {appt.teacherName}</span>
                      <a
                        href={`tel:${appt.teacherPhone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-[#087CC1] font-bold flex items-center gap-1"
                      >
                        <Phone className="w-3 h-3" />
                        <span>{appt.teacherPhone}</span>
                      </a>
                    </div>
                  )}
                </div>
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
        appointmentToEdit={appointmentToEdit}
        onSave={handleSaveAppointment}
      />
    </div>
  );
};
