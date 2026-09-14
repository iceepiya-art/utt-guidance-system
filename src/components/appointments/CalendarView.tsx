import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  Plus,
  Filter,
  CheckCircle2,
  Users,
  Car,
} from 'lucide-react';
import { Appointment, School, TeamId } from '../../types';
import {
  formatThaiMonthYear,
  formatThaiFullDate,
  getDaysInMonthGrid,
  getTodayISO,
  THAI_MONTHS,
  getBuddhistYear,
} from '../../utils/dateUtils';
import { AppointmentDetailModal } from './AppointmentDetailModal';
import { AppointmentFormModal } from './AppointmentFormModal';
import { createAppointment, updateAppointment } from '../../firebase/dbService';
import { useAuth } from '../../context/AuthContext';

interface CalendarViewProps {
  appointments: Appointment[];
  schools: School[];
  onRecordTrip: (appointment: Appointment) => void;
}

type ViewMode = 'month' | 'week' | 'day';

export const CalendarView: React.FC<CalendarViewProps> = ({
  appointments,
  schools,
  onRecordTrip,
}) => {
  const { currentUser, canEdit } = useAuth();

  const today = new Date();
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth()); // 0-11
  const [selectedDate, setSelectedDate] = useState<string>(getTodayISO());
  const [teamFilter, setTeamFilter] = useState<'all' | TeamId>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('month');

  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [appointmentToEdit, setAppointmentToEdit] = useState<Appointment | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [prefilledDate, setPrefilledDate] = useState<string | undefined>(undefined);

  // Month navigation
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleJumpToday = () => {
    const n = new Date();
    setCurrentYear(n.getFullYear());
    setCurrentMonth(n.getMonth());
    setSelectedDate(getTodayISO());
  };

  // Calendar matrix
  const daysGrid = useMemo(() => {
    return getDaysInMonthGrid(currentYear, currentMonth);
  }, [currentYear, currentMonth]);

  // Filtered appointments
  const filteredAppointments = useMemo(() => {
    return appointments.filter((appt) => {
      if (teamFilter !== 'all' && appt.teamId !== teamFilter) return false;
      return true;
    });
  }, [appointments, teamFilter]);

  // Appointments mapping by date
  const appointmentsByDate = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    for (const appt of filteredAppointments) {
      if (!map[appt.date]) map[appt.date] = [];
      map[appt.date].push(appt);
    }
    // sort by time
    Object.keys(map).forEach((d) => {
      map[d].sort((a, b) => a.startTime.localeCompare(b.startTime));
    });
    return map;
  }, [filteredAppointments]);

  // Selected date appointments
  const selectedDateAppointments = appointmentsByDate[selectedDate] || [];

  const handleSaveAppointment = async (apptData: Omit<Appointment, 'id'>) => {
    if (appointmentToEdit) {
      await updateAppointment(appointmentToEdit.id, apptData, currentUser);
    } else {
      await createAppointment(apptData, currentUser);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-[#087CC1]" />
            <h1 className="text-xl font-bold text-slate-800">
              ปฏิทินแผนงานแนะแนว
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            ตารางการออกแนะแนวการศึกษา แยกตามสายปฏิบัติงานและยานพาหนะ
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Team filter toggle */}
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setTeamFilter('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                teamFilter === 'all' ? 'bg-white text-slate-800 shadow-2xs' : 'text-slate-500'
              }`}
            >
              ทุกสาย
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

          {canEdit && (
            <button
              onClick={() => {
                setAppointmentToEdit(null);
                setPrefilledDate(selectedDate);
                setIsFormOpen(true);
              }}
              id="btn-calendar-add-appt"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#087CC1] hover:bg-[#075A9C] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>สร้างนัดหมาย</span>
            </button>
          )}
        </div>
      </div>

      {/* Month Navigation & View switch */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevMonth}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            title="เดือนก่อนหน้า"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-base sm:text-lg font-bold text-slate-800 tracking-tight min-w-[170px] text-center">
            {formatThaiMonthYear(currentYear, currentMonth)}
          </div>
          <button
            onClick={handleNextMonth}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            title="เดือนถัดไป"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleJumpToday}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
          >
            วันนี้
          </button>
        </div>
      </div>

      {/* Calendar Grid & Selected Day Schedule Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2 Cols: Monthly Calendar Grid */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          {/* Day of Week Header */}
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-bold text-slate-600 py-2.5">
            <div className="text-rose-500">อา.</div>
            <div>จ.</div>
            <div>อ.</div>
            <div>พ.</div>
            <div>พฤ.</div>
            <div>ศ.</div>
            <div className="text-amber-600">ส.</div>
          </div>

          {/* Calendar Cells */}
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
            {daysGrid.map((item, index) => {
              const dayAppts = appointmentsByDate[item.dateString] || [];
              const isSelected = item.dateString === selectedDate;

              return (
                <div
                  key={item.dateString || index}
                  onClick={() => setSelectedDate(item.dateString)}
                  className={`min-h-[85px] sm:min-h-[105px] p-1.5 sm:p-2 transition-all cursor-pointer flex flex-col justify-between ${
                    !item.isCurrentMonth ? 'bg-slate-50/60 opacity-40' : 'hover:bg-[#EAF6FD]/30'
                  } ${isSelected ? 'ring-2 ring-[#087CC1] ring-inset bg-[#EAF6FD]/20 z-10' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                        item.isToday
                          ? 'bg-[#087CC1] text-white shadow-xs'
                          : isSelected
                          ? 'bg-[#075A9C] text-white'
                          : 'text-slate-700'
                      }`}
                    >
                      {item.dayNumber}
                    </span>

                    {dayAppts.length > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700">
                        {dayAppts.length}
                      </span>
                    )}
                  </div>

                  {/* Appointments indicators / mini cards */}
                  <div className="mt-1 space-y-1 overflow-hidden">
                    {dayAppts.slice(0, 2).map((appt) => {
                      const isTeam1 = appt.teamId === 'team1';
                      return (
                        <div
                          key={appt.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAppointment(appt);
                          }}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-medium truncate ${
                            isTeam1
                              ? 'bg-[#E3F2FD] text-[#1976D2] border border-[#1976D2]/20'
                              : 'bg-[#FFF7E0] text-[#F59E0B] border border-[#F59E0B]/20'
                          }`}
                          title={`${appt.startTime} ${appt.schoolName}`}
                        >
                          <span className="font-bold">{appt.startTime.substring(0, 5)}</span>{' '}
                          {appt.schoolName}
                        </div>
                      );
                    })}
                    {dayAppts.length > 2 && (
                      <div className="text-[9px] text-slate-400 font-semibold px-1">
                        + อีก {dayAppts.length - 2} รายการ
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 1 Col: Selected Date Schedule & Details */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-4 sm:p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-xs font-bold text-[#087CC1] uppercase tracking-wider">
                  กำหนดการประจำวัน
                </span>
                <h3 className="text-base font-bold text-slate-800 mt-0.5">
                  {formatThaiFullDate(selectedDate)}
                </h3>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                {selectedDateAppointments.length} คิว
              </span>
            </div>

            {/* List of appointments on selected date */}
            <div className="mt-4 space-y-3 max-h-[480px] overflow-y-auto pr-1">
              {selectedDateAppointments.length === 0 ? (
                <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <CalendarIcon className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-500 font-medium">
                    ไม่มีกำหนดการนัดหมายในวันนี้
                  </p>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => {
                        setAppointmentToEdit(null);
                        setPrefilledDate(selectedDate);
                        setIsFormOpen(true);
                      }}
                      className="mt-3 px-3 py-1.5 bg-[#087CC1] hover:bg-[#075A9C] text-white text-xs font-semibold rounded-lg shadow-xs"
                    >
                      + เพิ่มนัดหมายวันดังกล่าว
                    </button>
                  )}
                </div>
              ) : (
                selectedDateAppointments.map((appt) => {
                  const isTeam1 = appt.teamId === 'team1';
                  return (
                    <div
                      key={appt.id}
                      onClick={() => setSelectedAppointment(appt)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer hover:shadow-md ${
                        isTeam1
                          ? 'border-[#1976D2]/30 bg-gradient-to-r from-white to-[#E3F2FD]/30'
                          : 'border-[#F59E0B]/30 bg-gradient-to-r from-white to-[#FFF7E0]/30'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-sm ${
                            isTeam1
                              ? 'bg-[#E3F2FD] text-[#1976D2]'
                              : 'bg-[#FFF7E0] text-[#F59E0B]'
                          }`}
                        >
                          {isTeam1 ? 'อุตรดิตถ์' : 'สุโขทัย'}
                        </span>
                        <div className="flex items-center gap-1 text-xs font-bold text-slate-700">
                          <Clock className="w-3.5 h-3.5 text-[#087CC1]" />
                          <span>{appt.startTime} - {appt.endTime} น.</span>
                        </div>
                      </div>

                      <div className="font-bold text-slate-800 text-sm">
                        {appt.schoolName}
                      </div>

                      <div className="mt-2 text-xs text-slate-600 space-y-1">
                        <div>
                          <span className="text-slate-400">อาจารย์: </span>
                          <span className="font-medium">{appt.counselorName}</span>
                        </div>
                        {appt.teacherPhone && (
                          <div>
                            <span className="text-slate-400">ครูแนะแนว: </span>
                            <span>{appt.teacherName} ({appt.teacherPhone})</span>
                          </div>
                        )}
                        <div className="text-slate-500 text-[11px] flex items-center gap-1 pt-1">
                          <Car className="w-3 h-3 text-slate-400" />
                          <span>{appt.vehicleName || 'รถตู้ส่วนกลาง'}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {canEdit && selectedDateAppointments.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setAppointmentToEdit(null);
                setPrefilledDate(selectedDate);
                setIsFormOpen(true);
              }}
              className="w-full py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4 text-[#087CC1]" />
              <span>เพิ่มนัดหมายในวันนี้</span>
            </button>
          )}
        </div>
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
        prefilledData={prefilledDate ? { date: prefilledDate } : null}
        onSave={handleSaveAppointment}
      />
    </div>
  );
};
