import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Download,
  Printer,
  Calendar,
  Filter,
  CheckCircle2,
  Users,
  Compass,
  FileCheck,
  TrendingUp,
} from 'lucide-react';
import { School, DocumentSubmission, Appointment, FieldTrip, TeamId } from '../../types';
import {
  THAI_MONTHS,
  getBuddhistYear,
  formatThaiMonthYear,
  formatThaiShortDate,
} from '../../utils/dateUtils';
import { exportMonthlyReportToExcel, exportSchoolsToExcel } from '../../utils/excelExport';

interface MonthlyReportsViewProps {
  schools: School[];
  submissions: DocumentSubmission[];
  appointments: Appointment[];
  fieldTrips: FieldTrip[];
}

export const MonthlyReportsView: React.FC<MonthlyReportsViewProps> = ({
  schools,
  submissions,
  appointments,
  fieldTrips,
}) => {
  const today = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth()); // 0-11
  const [teamFilter, setTeamFilter] = useState<'all' | TeamId>('all');

  // Filter items matching the selected month and year
  const monthString = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;

  const monthlySubmissions = useMemo(() => {
    return submissions.filter((s) => {
      const matchMonth = s.submissionDate.startsWith(monthString);
      const matchTeam = teamFilter === 'all' || s.teamId === teamFilter;
      return matchMonth && matchTeam;
    });
  }, [submissions, monthString, teamFilter]);

  const monthlyAppointments = useMemo(() => {
    return appointments.filter((a) => {
      const matchMonth = a.date.startsWith(monthString);
      const matchTeam = teamFilter === 'all' || a.teamId === teamFilter;
      return matchMonth && matchTeam;
    });
  }, [appointments, monthString, teamFilter]);

  const monthlyTrips = useMemo(() => {
    return fieldTrips.filter((t) => {
      const matchMonth = t.date.startsWith(monthString);
      const matchTeam = teamFilter === 'all' || t.teamId === teamFilter;
      return matchMonth && matchTeam;
    });
  }, [fieldTrips, monthString, teamFilter]);

  // Total Students reached this month
  const totalStudentsReached = useMemo(() => {
    let count = 0;
    monthlyTrips.forEach((trip) => {
      trip.schools?.forEach((s) => {
        count += s.studentCount || 0;
      });
    });
    return count;
  }, [monthlyTrips]);

  // Unique schools visited this month
  const uniqueVisitedSchools = useMemo(() => {
    const set = new Set<string>();
    monthlyTrips.forEach((t) => {
      t.schools?.forEach((s) => set.add(s.schoolName));
    });
    return Array.from(set);
  }, [monthlyTrips]);

  // Team 1 vs Team 2 comparison stats
  const team1Trips = fieldTrips.filter(
    (t) => t.teamId === 'team1' && t.date.startsWith(monthString)
  );
  const team2Trips = fieldTrips.filter(
    (t) => t.teamId === 'team2' && t.date.startsWith(monthString)
  );

  let team1Students = 0;
  team1Trips.forEach((t) => t.schools?.forEach((s) => (team1Students += s.studentCount || 0)));

  let team2Students = 0;
  team2Trips.forEach((t) => t.schools?.forEach((s) => (team2Students += s.studentCount || 0)));

  const handleExportExcel = () => {
    const monthName = `${THAI_MONTHS[selectedMonth]} ${getBuddhistYear(selectedYear)}`;
    exportMonthlyReportToExcel(schools, monthlyTrips, monthlySubmissions, monthName);
  };

  const handleExportAllSchools = () => {
    exportSchoolsToExcel(schools);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-[#087CC1]" />
            <span>รายงานสรุปผลการแนะแนวประจำเดือน</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            วิทยาลัยเทคโนโลยีอุตรดิตถ์ • สรุปยอดการยื่นหนังสือ การลงพื้นที่ และจำนวนนักเรียน
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportExcel}
            id="btn-export-monthly-excel"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>ส่งออก Excel (.xlsx)</span>
          </button>
          <button
            type="button"
            onClick={handleExportAllSchools}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold rounded-xl shadow-xs transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>ส่งออกรายชื่อโรงเรียน</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold rounded-xl shadow-xs transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>พิมพ์รายงาน</span>
          </button>
        </div>
      </div>

      {/* Filter Bar: Month, Year, Team */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-600">ประจำเดือน:</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#087CC1]"
          >
            {THAI_MONTHS.map((m, idx) => (
              <option key={m} value={idx}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-600">ปี พ.ศ.:</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#087CC1]"
          >
            {[selectedYear - 1, selectedYear, selectedYear + 1].map((y) => (
              <option key={y} value={y}>
                {getBuddhistYear(y)}
              </option>
            ))}
          </select>
        </div>

        {/* Team Filter */}
        <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200 ml-auto">
          <button
            onClick={() => setTeamFilter('all')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
              teamFilter === 'all' ? 'bg-white text-slate-800 shadow-2xs' : 'text-slate-500'
            }`}
          >
            รวมทุกสาย
          </button>
          <button
            onClick={() => setTeamFilter('team1')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
              teamFilter === 'team1' ? 'bg-[#1976D2] text-white shadow-2xs' : 'text-[#1976D2]'
            }`}
          >
            อุตรดิตถ์
          </button>
          <button
            onClick={() => setTeamFilter('team2')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
              teamFilter === 'team2' ? 'bg-[#F59E0B] text-white shadow-2xs' : 'text-[#F59E0B]'
            }`}
          >
            สุโขทัย
          </button>
        </div>
      </div>

      {/* KPI Highlight Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">ยื่นหนังสือเดือนนี้</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold text-slate-800">
            {monthlySubmissions.length}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">ฉบับประสานงานโรงเรียน</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">ออกแนะแนวแล้ว</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Compass className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold text-slate-800">
            {monthlyTrips.length}
          </div>
          <p className="text-[11px] text-emerald-600 font-medium mt-1">
            {uniqueVisitedSchools.length} โรงเรียนเป้าหมาย
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">นักเรียนที่เข้าร่วม</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold text-slate-800">
            {totalStudentsReached.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">คน (ม.3 และ ม.6)</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">นัดหมายในเดือน</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold text-slate-800">
            {monthlyAppointments.length}
          </div>
          <p className="text-[11px] text-amber-600 font-medium mt-1">รายการกำหนดการ</p>
        </div>
      </div>

      {/* Team Comparison Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#1976D2]" />
              <h3 className="font-bold text-slate-800">อุตรดิตถ์</h3>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-sm bg-[#E3F2FD] text-[#1976D2]">
              {team1Trips.length} ทริป
            </span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-center">
            <div className="p-3 bg-slate-50 rounded-xl">
              <div className="text-xs text-slate-500">ออกแนะแนว</div>
              <div className="text-xl font-bold text-[#1976D2]">{team1Trips.length} ครั้ง</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <div className="text-xs text-slate-500">นักเรียนเข้าร่วม</div>
              <div className="text-xl font-bold text-slate-800">{team1Students.toLocaleString()} คน</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#F59E0B]" />
              <h3 className="font-bold text-slate-800">สุโขทัย</h3>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-sm bg-[#FFF7E0] text-[#F59E0B]">
              {team2Trips.length} ทริป
            </span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-center">
            <div className="p-3 bg-slate-50 rounded-xl">
              <div className="text-xs text-slate-500">ออกแนะแนว</div>
              <div className="text-xl font-bold text-[#F59E0B]">{team2Trips.length} ครั้ง</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <div className="text-xs text-slate-500">นักเรียนเข้าร่วม</div>
              <div className="text-xl font-bold text-slate-800">{team2Students.toLocaleString()} คน</div>
            </div>
          </div>
        </div>
      </div>

      <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <h3 className="p-4 font-bold text-slate-800">สรุปการยื่นหนังสือ ({monthlySubmissions.length} รายการ)</h3>
        <div className="overflow-x-auto"><table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-600"><tr><th className="p-3">วันที่ยื่น</th><th className="p-3">โรงเรียน</th><th className="p-3">อาจารย์ผู้ยื่น</th></tr></thead>
          <tbody>{monthlySubmissions.map(s => <tr key={s.id} className="border-t border-slate-100"><td className="p-3 whitespace-nowrap">{s.submissionDate}</td><td className="p-3">{s.schoolName}{s.sameDayGuidance && <span className="block text-xs text-sky-700">ยื่นหนังสือ + แนะแนว</span>}</td><td className="p-3">{s.submittedByNames?.length ? s.submittedByNames.join(', ') : s.submittedByName}</td></tr>)}
          {!monthlySubmissions.length && <tr><td colSpan={3} className="p-4 text-center text-slate-500">ไม่มีการยื่นหนังสือในเดือนและสายที่เลือก</td></tr>}</tbody>
        </table></div>
      </section>
      {/* Monthly Trips Detail Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-slate-800 text-sm">
            รายการออกแนะแนวประจำเดือน {THAI_MONTHS[selectedMonth]} {getBuddhistYear(selectedYear)}
          </h2>
          <span className="text-xs text-slate-400 font-medium">
            รวม {monthlyTrips.length} รายการ
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold">
              <tr>
                <th className="py-3 px-4">วันที่</th>
                <th className="py-3 px-4">สาย</th>
                <th className="py-3 px-4">โรงเรียนที่จัดกิจกรรม</th>
                <th className="py-3 px-4">อาจารย์ผู้รับผิดชอบ</th>
                <th className="py-3 px-4 text-center">จำนวนนักเรียน</th>
                <th className="py-3 px-4">รายละเอียดกิจกรรม</th>
                <th className="py-3 px-4 text-center">รูปกิจกรรม</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {monthlyTrips.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    ไม่มีรายการออกแนะแนวในเดือนที่เลือก
                  </td>
                </tr>
              ) : (
                monthlyTrips.map((trip) => {
                  const isTeam1 = trip.teamId === 'team1';
                  const students = trip.schools?.reduce((acc, s) => acc + (s.studentCount || 0), 0) || 0;
                  return (
                    <tr key={trip.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {formatThaiShortDate(trip.date)}
                      </td>
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
                        {trip.schools?.map((s, idx) => (
                          <div key={idx} className="font-semibold text-slate-800 mb-1">
                            <div>{s.schoolName}</div>
                            <div className="text-[11px] font-normal text-slate-500">
                              {s.timeSlot || 'ไม่ระบุเวลา'}{s.notes ? ` · ${s.notes}` : ''}
                            </div>
                          </div>
                        ))}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {trip.counselorName}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-emerald-700">
                        {students} คน
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs">
                        <div className="font-semibold text-slate-700">{trip.workType}</div>
                        <div className="text-[11px] text-slate-500 line-clamp-2" title={trip.summary || trip.issues || ''}>
                          {trip.summary || trip.issues || '-'}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {trip.photos?.length ? (
                          <div className="flex items-center justify-center gap-1">
                            {trip.photos.slice(0, 3).map((photo, index) => (
                              <img
                                key={photo.id || index}
                                src={photo.url}
                                alt={photo.fileName || 'รูปกิจกรรม'}
                                className="w-8 h-8 rounded-md object-cover border border-slate-200"
                              />
                            ))}
                            <span className="text-[11px] font-semibold text-slate-600">{trip.photos.length} รูป</span>
                          </div>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
