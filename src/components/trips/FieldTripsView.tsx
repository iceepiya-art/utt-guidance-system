import React, { useState, useMemo } from 'react';
import {
  Compass,
  Plus,
  Search,
  Calendar,
  Clock,
  Car,
  Users,
  Image as ImageIcon,
  Edit2,
  Trash2,
  Eye,
  GraduationCap,
} from 'lucide-react';
import { Appointment, DocumentSubmission, FieldTrip, School, TeamId } from '../../types';
import { formatThaiShortDate, THAI_MONTHS, getBuddhistYear } from '../../utils/dateUtils';
import { FieldTripFormModal } from './FieldTripFormModal';
import { createFieldTrip, updateFieldTrip, deleteFieldTrip } from '../../firebase/dbService';
import { useAuth } from '../../context/AuthContext';

interface FieldTripsViewProps {
  fieldTrips: FieldTrip[];
  schools: School[];
  submissions: DocumentSubmission[];
  appointments: Appointment[];
}

export const FieldTripsView: React.FC<FieldTripsViewProps> = ({
  fieldTrips,
  schools,
  submissions,
  appointments,
}) => {
  const { currentUser, isAdmin, canEdit } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [teamFilter, setTeamFilter] = useState<'all' | TeamId>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [tripToEdit, setTripToEdit] = useState<FieldTrip | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<FieldTrip | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  // Merge fieldTrips with completed appointments from the appointment system
  const combinedTrips = useMemo(() => {
    const list: FieldTrip[] = fieldTrips.filter((ft) => !ft.workType || ft.workType.includes('แนะแนว'));

    const cleanSchool = (s: string) =>
      (s || '').replace(/^(โรงเรียน|รร\.)\s*/, '').trim().toLowerCase();

    // Identify only completed guidance appointments
    const completedAppts = appointments.filter((appt) => appt.status === 'COMPLETED');

    completedAppts.forEach((appt) => {
      const apptSchoolClean = cleanSchool(appt.schoolName);

      const isAlreadyInTrips = list.some((ft) => {
        if (ft.appointmentId && ft.appointmentId === appt.id) return true;
        if (ft.date === appt.date) {
          return ft.schools?.some((s) => cleanSchool(s.schoolName) === apptSchoolClean);
        }
        return false;
      });

      if (!isAlreadyInTrips) {
        const matchedSub = submissions.find(
          (s) => s.id === appt.submissionId || cleanSchool(s.schoolName) === apptSchoolClean
        );
        const vehName =
          appt.vehicleName ||
          matchedSub?.vehicleName ||
          (appt.teamId === 'team1' ? 'VIGO กข 9914 (กระบะ 4 ประตู)' : 'MITSU บน 6738 (กระบะ 4 ประตู)');
        const vehId =
          appt.vehicleId ||
          matchedSub?.vehicleId ||
          (appt.teamId === 'team1' ? 'vigo-9914' : 'mitsu-6738');

        list.push({
          id: `completed_appt_${appt.id}`,
          appointmentId: appt.id,
          submissionId: appt.submissionId,
          date: appt.date,
          departureTime: appt.startTime || '08:30',
          returnTime: appt.endTime || '12:00',
          teamId: appt.teamId,
          vehicleId: vehId,
          vehicleName: vehName,
          workType: appt.workType || 'แนะแนวการศึกษา',
          counselorId: appt.counselorId || '',
          counselorName: appt.counselorName || 'อ.ประชา กัปปนารก',
          teamMemberNames: appt.teamMemberNames || '',
          schools: [
            {
              schoolId: appt.schoolId,
              schoolName: appt.schoolName,
              timeSlot: `${appt.startTime || '08:30'} - ${appt.endTime || '12:00'} น.`,
              note: appt.note,
            },
          ],
          photos: appt.photos || matchedSub?.photos || [],
          summary: appt.note || `ออกแนะแนวเรียบร้อยแล้ว ณ ${appt.schoolName}`,
          createdAt: appt.createdAt || appt.date,
          updatedAt: appt.updatedAt || appt.date,
        });
      }
    });

    return list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [fieldTrips, appointments, submissions]);

  const availableMonths = useMemo(() => {
    const map = new Map<string, number>();
    combinedTrips.forEach((t) => {
      if (t.date && t.date.length >= 7) {
        const m = t.date.substring(0, 7);
        map.set(m, (map.get(m) || 0) + 1);
      }
    });
    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, count]) => {
        const [y, m] = key.split('-');
        const label = `${THAI_MONTHS[parseInt(m, 10) - 1]} ${getBuddhistYear(parseInt(y, 10))}`;
        return { key, label, count };
      });
  }, [combinedTrips]);

  const filteredTrips = useMemo(() => {
    return combinedTrips.filter((trip) => {
      const matchSearch =
        !searchTerm ||
        trip.counselorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trip.workType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trip.schools?.some((s) => s.schoolName.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchTeam = teamFilter === 'all' || trip.teamId === teamFilter;
      const matchMonth = selectedMonth === 'all' || (trip.date && trip.date.startsWith(selectedMonth));
      return matchSearch && matchTeam && matchMonth;
    });
  }, [combinedTrips, searchTerm, teamFilter, selectedMonth]);

  const handleSave = async (data: Omit<FieldTrip, 'id'>) => {
    if (tripToEdit) {
      await updateFieldTrip(tripToEdit.id, data, currentUser);
    } else {
      await createFieldTrip(data, currentUser);
    }
  };

  const handleDelete = async (trip: FieldTrip) => {
    if (!isAdmin) return;
    if (confirm(`ยืนยันการลบประวัติการออกแนะแนววันที่ ${formatThaiShortDate(trip.date)} หรือไม่?`)) {
      if (trip.id.startsWith('completed_appt_') && trip.appointmentId) {
        // If it's derived from an appointment, we can mark the appointment not completed or remove
        alert('รายการนี้เชื่อมโยงจากหน้านัดหมาย สามารถเปลี่ยนสถานะได้ที่หน้านัดหมาย');
      } else {
        await deleteFieldTrip(trip.id, currentUser);
      }
    }
  };

  return (
    <div className="space-y-5">
      {/* Header - No separate add button needed per user requirement */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Compass className="w-6 h-6 text-[#087CC1]" />
            <span>ประวัติการออกแนะแนว ({combinedTrips.length} ครั้ง)</span>
          </h1>
          <p className="text-[13px] sm:text-sm text-slate-500 mt-1">
            บันทึกโรงเรียนที่ออกแนะแนวแล้ว เชื่อมโยงอัตโนมัติจากการเปลี่ยนสถานะในหน้านัดหมาย
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาชื่อโรงเรียน, อาจารย์, กิจกรรม..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#087CC1] focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200 shrink-0 w-full sm:w-auto">
            <button
              onClick={() => setTeamFilter('all')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-colors ${
                teamFilter === 'all' ? 'bg-white text-slate-800 shadow-2xs' : 'text-slate-500'
              }`}
            >
              ทั้งหมด
            </button>
            <button
              onClick={() => setTeamFilter('team1')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-colors ${
                teamFilter === 'team1' ? 'bg-[#1976D2] text-white shadow-2xs' : 'text-[#1976D2]'
              }`}
            >
              อุตรดิตถ์
            </button>
            <button
              onClick={() => setTeamFilter('team2')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-colors ${
                teamFilter === 'team2' ? 'bg-[#F59E0B] text-white shadow-2xs' : 'text-[#F59E0B]'
              }`}
            >
              สุโขทัย
            </button>
          </div>
        </div>

        {/* Month Pills */}
        {availableMonths.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-slate-100 no-scrollbar">
            <span className="text-xs font-semibold text-slate-400 whitespace-nowrap mr-1 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
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
              ทุกเดือน ({combinedTrips.length})
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

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[1050px]">
          <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold text-sm">
            <tr>
              <th className="py-3.5 px-4 whitespace-nowrap min-w-[90px]">สาย</th>
              <th className="py-3.5 px-4 whitespace-nowrap min-w-[120px]">วันที่ / เวลา</th>
              <th className="py-3.5 px-4 min-w-[200px]">โรงเรียนที่จัดกิจกรรม</th>
              <th className="py-3.5 px-4 min-w-[130px]">กิจกรรม</th>
              <th className="py-3.5 px-4 min-w-[180px]">อาจารย์ผู้รับผิดชอบ</th>
              <th className="py-3.5 px-4 min-w-[110px]">ยานพาหนะ</th>
              <th className="py-3.5 px-4 text-center min-w-[100px] whitespace-nowrap">รูปกิจกรรม</th>
              <th className="py-3.5 px-4 text-right min-w-[140px] whitespace-nowrap">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredTrips.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400">
                  ไม่พบรายการออกแนะแนว
                </td>
              </tr>
            ) : (
              filteredTrips.map((trip) => {
                const isTeam1 = trip.teamId === 'team1';
                return (
                  <tr key={trip.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-md font-semibold text-xs whitespace-nowrap ${
                          isTeam1 ? 'bg-[#E3F2FD] text-[#1976D2]' : 'bg-[#FFF7E0] text-[#F59E0B]'
                        }`}
                      >
                        {isTeam1 ? 'อุตรดิตถ์' : 'สุโขทัย'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800 text-sm whitespace-nowrap">
                        {formatThaiShortDate(trip.date)}
                      </div>
                      <div className="text-xs text-slate-500 whitespace-nowrap mt-0.5">
                        {trip.departureTime || '08:00'} - {trip.returnTime || '15:30'} น.
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        {trip.schools?.map((s, sIdx) => (
                          <div key={sIdx} className="font-semibold text-slate-800 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#087CC1]" />
                            <span>{s.schoolName}</span>
                            {s.studentCount ? (
                              <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md whitespace-nowrap">
                                ({s.studentCount} คน)
                              </span>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">
                      {trip.workType}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800 text-sm">{trip.counselorName}</div>
                      <div className="text-xs text-slate-500 line-clamp-2 max-w-[180px] mt-0.5">{trip.teamMemberNames}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 text-sm">
                      {trip.vehicleName || '-'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {trip.photos && trip.photos.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => setSelectedPhoto(trip.photos[0].url)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium whitespace-nowrap"
                        >
                          <ImageIcon className="w-3.5 h-3.5 text-[#087CC1]" />
                          <span>{trip.photos.length} รูป</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-300">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setSelectedTrip(trip)}
                          title="ดูรายละเอียด"
                          className="w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-500 hover:text-[#087CC1] hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {canEdit && (
                          <button
                            onClick={() => {
                              setTripToEdit(trip);
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
                            onClick={() => handleDelete(trip)}
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

      {/* Mobile Card List */}
      <div className="md:hidden space-y-3">
        {filteredTrips.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-sm">
            ไม่พบประวัติการออกแนะแนว
          </div>
        ) : (
          filteredTrips.map((trip) => {
            const isTeam1 = trip.teamId === 'team1';
            return (
              <div
                key={trip.id}
                onClick={() => setSelectedTrip(trip)}
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5 cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-sm ${
                          isTeam1 ? 'bg-[#E3F2FD] text-[#1976D2]' : 'bg-[#FFF7E0] text-[#F59E0B]'
                        }`}
                      >
                        {isTeam1 ? 'อุตรดิตถ์' : 'สุโขทัย'}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">
                        {formatThaiShortDate(trip.date)}
                      </span>
                    </div>
                    <div className="font-bold text-slate-800 text-base">
                      {trip.schools?.map((s) => s.schoolName).join(', ') || 'ออกแนะแนว'}
                    </div>
                    <div className="text-xs text-[#087CC1] font-medium mt-0.5">
                      {trip.workType}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                  <span>อาจารย์: {trip.counselorName}</span>
                  {trip.photos && trip.photos.length > 0 && (
                    <span className="text-[#087CC1] font-semibold flex items-center gap-1">
                      <ImageIcon className="w-3 h-3" />
                      {trip.photos.length} รูป
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Trip Details Popup Modal */}
      {selectedTrip && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSelectedTrip(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 shadow-2xl border border-slate-200 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-bold text-[#087CC1]">สรุปผลการออกแนะแนว</span>
                <h3 className="text-base font-bold text-slate-800 mt-0.5">
                  วันที่ {formatThaiShortDate(selectedTrip.date)}
                </h3>
              </div>
              <button
                onClick={() => setSelectedTrip(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <div className="font-bold text-slate-800">โรงเรียนที่จัดกิจกรรม:</div>
                {selectedTrip.schools?.map((s, idx) => (
                  <div key={idx} className="flex justify-between text-slate-700">
                    <span>• {s.schoolName} ({s.timeSlot || 'ช่วงเวลาปกติ'})</span>
                    <span className="font-semibold text-emerald-700">{s.studentCount || 0} คน</span>
                  </div>
                ))}
              </div>

              {selectedTrip.summary && (
                <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl">
                  <div className="font-bold text-[#075A9C] mb-1">ผลการปฏิบัติงาน:</div>
                  <p className="text-slate-700 leading-relaxed">{selectedTrip.summary}</p>
                </div>
              )}

              {selectedTrip.issues && (
                <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl">
                  <div className="font-bold text-amber-900 mb-1">ปัญหา / อุปสรรค:</div>
                  <p className="text-slate-700 leading-relaxed">{selectedTrip.issues}</p>
                </div>
              )}

              {/* Photos inside modal */}
              {selectedTrip.photos && selectedTrip.photos.length > 0 && (
                <div>
                  <div className="font-bold text-slate-800 mb-2">รูปภาพกิจกรรม:</div>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedTrip.photos.map((p, idx) => (
                      <img
                        key={p.id || idx}
                        src={p.url}
                        alt="ภาพกิจกรรม"
                        onClick={() => setSelectedPhoto(p.url)}
                        className="w-full aspect-square object-cover rounded-lg border border-slate-200 cursor-pointer hover:opacity-90"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="max-w-2xl max-h-[85vh] w-full" onClick={(e) => e.stopPropagation()}>
            <img
              src={selectedPhoto}
              alt="ภาพกิจกรรม"
              className="w-full h-auto max-h-[85vh] object-contain rounded-xl shadow-2xl"
            />
          </div>
        </div>
      )}

      {/* Form Modal */}
      <FieldTripFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setTripToEdit(null);
        }}
        schools={schools}
        submissions={submissions}
        appointments={appointments}
        tripToEdit={tripToEdit}
        onSave={handleSave}
      />
    </div>
  );
};
