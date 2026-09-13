import { useAuth } from '../../context/AuthContext';
import React from 'react';
import {
  GraduationCap,
  FileCheck2,
  CalendarClock,
  CheckCircle2,
  Clock,
  Phone,
  ArrowRight,
  PlusCircle,
  Calendar,
  Compass,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { School, Appointment, FieldTrip } from '../../types';
import {
  formatThaiShortDate,
  formatThaiFullDate,
  getRelativeThaiDayLabel,
  getBuddhistYear,
} from '../../utils/dateUtils';
import { ActiveTab } from '../layout/AppLayout';

interface DashboardViewProps {
  schools: School[];
  appointments: Appointment[];
  fieldTrips: FieldTrip[];
  onNavigate: (tab: ActiveTab) => void;
  onSelectAppointment: (appointment: Appointment) => void;
  onNewSubmission: () => void;
  onNewAppointment: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  schools,
  appointments,
  fieldTrips,
  onNavigate,
  onSelectAppointment,
  onNewSubmission,
  onNewAppointment,
}) => {
  const { canEdit } = useAuth();
  // Statistics calculations from real data
  const totalSchools = schools.length;
  const submittedSchools = schools.filter(
    (s) => s.currentStatus !== 'NOT_STARTED' && s.currentStatus !== 'CANCELLED'
  ).length;
  const appointedSchools = schools.filter(
    (s) => s.currentStatus === 'APPOINTED'
  ).length;
  const completedSchools = schools.filter(
    (s) => s.currentStatus === 'GUIDANCE_COMPLETED'
  ).length;
  const pendingSchools = schools.filter(
    (s) => s.currentStatus === 'NOT_STARTED' || s.currentStatus === 'WAITING_CONTACT' || s.currentStatus === 'WAITING_APPOINTMENT'
  ).length;

  // Team 1 Breakdown
  const team1Schools = schools.filter((s) => s.teamId === 'team1');
  const team1Submitted = team1Schools.filter(
    (s) => s.currentStatus !== 'NOT_STARTED' && s.currentStatus !== 'CANCELLED'
  ).length;
  const team1Appointed = team1Schools.filter(
    (s) => s.currentStatus === 'APPOINTED'
  ).length;
  const team1Completed = team1Schools.filter(
    (s) => s.currentStatus === 'GUIDANCE_COMPLETED'
  ).length;
  const team1Percent = team1Schools.length > 0 ? Math.round((team1Completed / team1Schools.length) * 100) : 0;

  // Team 2 Breakdown
  const team2Schools = schools.filter((s) => s.teamId === 'team2');
  const team2Submitted = team2Schools.filter(
    (s) => s.currentStatus !== 'NOT_STARTED' && s.currentStatus !== 'CANCELLED'
  ).length;
  const team2Appointed = team2Schools.filter(
    (s) => s.currentStatus === 'APPOINTED'
  ).length;
  const team2Completed = team2Schools.filter(
    (s) => s.currentStatus === 'GUIDANCE_COMPLETED'
  ).length;
  const team2Percent = team2Schools.length > 0 ? Math.round((team2Completed / team2Schools.length) * 100) : 0;

  // Upcoming appointments (active, sorted by date ascending)
  const upcomingAppointments = [...appointments]
    .filter((a) => a.status !== 'CANCELLED')
    .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime))
    .slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Top Header & Fast Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">
            ระบบบริหารงานแนะแนวการศึกษา
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            วิทยาลัยเทคโนโลยีอุตรดิตถ์ • ปีการศึกษา {getBuddhistYear(new Date())}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            disabled={!canEdit} onClick={onNewSubmission}
            id="btn-quick-submit"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#087CC1] hover:bg-[#075A9C] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>ยื่นหนังสือใหม่</span>
          </button>
          <button
            disabled={!canEdit} onClick={onNewAppointment}
            id="btn-quick-appointment"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold rounded-xl shadow-xs transition-colors"
          >
            <Calendar className="w-4 h-4 text-[#087CC1]" />
            <span>สร้างนัดหมาย</span>
          </button>
        </div>
      </div>

      {/* Primary Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* Total Schools */}
        <div
          onClick={() => onNavigate('schools')}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:border-[#087CC1] transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">โรงเรียนทั้งหมด</span>
            <div className="w-8 h-8 rounded-xl bg-[#EAF6FD] text-[#087CC1] flex items-center justify-center">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">
            {totalSchools}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">เป้าหมายในจังหวัดอุตรดิตถ์</p>
        </div>

        {/* Submitted */}
        <div
          onClick={() => onNavigate('submissions')}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:border-[#087CC1] transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">ยื่นหนังสือแล้ว</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileCheck2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">
            {submittedSchools}
          </div>
          <p className="text-[11px] text-emerald-600 font-medium mt-1">
            {totalSchools > 0 ? Math.round((submittedSchools / totalSchools) * 100) : 0}% ของเป้าหมาย
          </p>
        </div>

        {/* Appointed */}
        <div
          onClick={() => onNavigate('appointments')}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:border-[#087CC1] transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">นัดหมายแล้ว</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <CalendarClock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">
            {appointedSchools}
          </div>
          <p className="text-[11px] text-amber-600 font-medium mt-1">
            มีกำหนดการลงปฏิทินแล้ว
          </p>
        </div>

        {/* Completed Guidance */}
        <div
          onClick={() => onNavigate('fieldTrips')}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:border-[#087CC1] transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">ออกแนะแนวแล้ว</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">
            {completedSchools}
          </div>
          <p className="text-[11px] text-emerald-600 font-medium mt-1">
            ลงพื้นที่จัดกิจกรรมสำเร็จ
          </p>
        </div>

        {/* Pending */}
        <div
          onClick={() => onNavigate('schools')}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:border-[#087CC1] transition-all cursor-pointer group col-span-2 sm:col-span-1"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">รอดำเนินการ</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">
            {pendingSchools}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">ยังไม่ยื่น / รอวันนัด</p>
        </div>
      </div>

      {/* Team Progress Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Team 1 Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#1976D2]" />
              <h2 className="font-bold text-slate-800 text-base">
                สายที่ 1 (โซนเมือง, ลับแล, ตรอน, พิชัย)
              </h2>
            </div>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#E3F2FD] text-[#1976D2]">
              {team1Percent}% สำเร็จ
            </span>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-2 text-center">
            <div className="p-2.5 bg-slate-50 rounded-xl">
              <div className="text-[11px] text-slate-500">เป้าหมาย</div>
              <div className="text-lg font-bold text-slate-800">{team1Schools.length}</div>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-xl">
              <div className="text-[11px] text-slate-500">ยื่นหนังสือ</div>
              <div className="text-lg font-bold text-[#1976D2]">{team1Submitted}</div>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-xl">
              <div className="text-[11px] text-slate-500">นัดหมายแล้ว</div>
              <div className="text-lg font-bold text-amber-600">{team1Appointed}</div>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-xl">
              <div className="text-[11px] text-slate-500">ออกแนะแนว</div>
              <div className="text-lg font-bold text-emerald-600">{team1Completed}</div>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>ความคืบหน้าการออกแนะแนว</span>
              <span>{team1Completed} / {team1Schools.length} โรงเรียน</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-[#1976D2] h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(team1Percent, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Team 2 Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#F59E0B]" />
              <h2 className="font-bold text-slate-800 text-base">
                สายที่ 2 (โซนท่าปลา, น้ำปาด, ฟากท่า, บ้านโคก, ทองแสนขัน)
              </h2>
            </div>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#FFF7E0] text-[#F59E0B]">
              {team2Percent}% สำเร็จ
            </span>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-2 text-center">
            <div className="p-2.5 bg-slate-50 rounded-xl">
              <div className="text-[11px] text-slate-500">เป้าหมาย</div>
              <div className="text-lg font-bold text-slate-800">{team2Schools.length}</div>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-xl">
              <div className="text-[11px] text-slate-500">ยื่นหนังสือ</div>
              <div className="text-lg font-bold text-[#F59E0B]">{team2Submitted}</div>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-xl">
              <div className="text-[11px] text-slate-500">นัดหมายแล้ว</div>
              <div className="text-lg font-bold text-amber-600">{team2Appointed}</div>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-xl">
              <div className="text-[11px] text-slate-500">ออกแนะแนว</div>
              <div className="text-lg font-bold text-emerald-600">{team2Completed}</div>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>ความคืบหน้าการออกแนะแนว</span>
              <span>{team2Completed} / {team2Schools.length} โรงเรียน</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-[#F59E0B] h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(team2Percent, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Appointments */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-[#087CC1]" />
            <h2 className="font-bold text-slate-800 text-lg">
              นัดหมายที่กำลังจะถึง
            </h2>
          </div>
          <button
            onClick={() => onNavigate('calendar')}
            className="text-xs font-semibold text-[#087CC1] hover:text-[#075A9C] flex items-center gap-1"
          >
            <span>ดูปฏิทินทั้งหมด</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {upcomingAppointments.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <Calendar className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm text-slate-500">ยังไม่มีรายการนัดหมายที่กำลังจะถึง</p>
            <button
              disabled={!canEdit} onClick={onNewAppointment}
              className="mt-3 px-3 py-1.5 bg-[#087CC1] text-white text-xs font-medium rounded-lg hover:bg-[#075A9C]"
            >
              + เพิ่มนัดหมายใหม่
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {upcomingAppointments.map((appt) => {
              const isTeam1 = appt.teamId === 'team1';
              const relativeDay = getRelativeThaiDayLabel(appt.date);

              return (
                <div
                  key={appt.id}
                  onClick={() => onSelectAppointment(appt)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer hover:shadow-md relative flex flex-col justify-between ${
                    isTeam1
                      ? 'border-[#1976D2]/30 bg-gradient-to-br from-white to-[#E3F2FD]/30'
                      : 'border-[#F59E0B]/30 bg-gradient-to-br from-white to-[#FFF7E0]/30'
                  }`}
                >
                  <div>
                    {/* Header with relative day badge & team */}
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          relativeDay === 'วันนี้'
                            ? 'bg-rose-100 text-rose-700 font-extrabold'
                            : relativeDay === 'พรุ่งนี้'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {relativeDay} ({formatThaiShortDate(appt.date)})
                      </span>
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-sm ${
                          isTeam1
                            ? 'bg-[#E3F2FD] text-[#1976D2]'
                            : 'bg-[#FFF7E0] text-[#F59E0B]'
                        }`}
                      >
                        {isTeam1 ? 'สายที่ 1' : 'สายที่ 2'}
                      </span>
                    </div>

                    {/* Time & School */}
                    <div className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{appt.startTime} - {appt.endTime} น.</span>
                    </div>
                    <div className="text-base font-bold text-slate-800 mt-1 truncate">
                      {appt.schoolName}
                    </div>

                    {/* Guidance Teacher & Contact */}
                    <div className="mt-2.5 pt-2.5 border-t border-slate-100 text-xs text-slate-600 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">ครูแนะแนว:</span>
                        <span className="font-medium text-slate-800">{appt.teacherName || '-'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">โทร:</span>
                        {appt.teacherPhone ? (
                          <a
                            href={`tel:${appt.teacherPhone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-[#087CC1] hover:underline font-semibold flex items-center gap-1"
                          >
                            <Phone className="w-3 h-3" />
                            <span>{appt.teacherPhone}</span>
                          </a>
                        ) : (
                          <span>-</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 text-[11px] text-slate-400 flex items-center justify-between">
                    <span>{appt.counselorName}</span>
                    <span className="text-[#087CC1] font-semibold flex items-center gap-0.5">
                      ดูรายละเอียด →
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
