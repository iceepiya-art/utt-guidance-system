import type { DocumentSubmission } from '../../types';
import { TripVehiclePicker } from '../common/TripVehiclePicker';
import { SchoolPicker } from '../common/SchoolPicker';
import React, { useState, useEffect } from 'react';
import { X, Save, Compass, Plus, Trash2, Calendar, Clock, Car, Users, AlertCircle } from 'lucide-react';
import { School, FieldTrip, TeamId, PhotoItem, Appointment } from '../../types';
import { PhotoUploader } from '../common/PhotoUploader';
import { getTodayISO } from '../../utils/dateUtils';
import { useAuth } from '../../context/AuthContext';

interface FieldTripFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  schools: School[];
  prefilledAppointment?: Appointment | null;
  prefilledSubmission?: Omit<DocumentSubmission, 'id'> | null;
  tripToEdit?: FieldTrip | null;
  onSave: (tripData: Omit<FieldTrip, 'id'>) => Promise<string | void>;
}

const VEHICLES = [
  { id: 'veh_01', name: 'รถตู้โตโยต้า คอมมิวเตอร์ (นข-4521 อต)' },
  { id: 'veh_02', name: 'รถตู้โตโยต้า คอมมิวเตอร์ (นข-8842 อต)' },
  { id: 'veh_03', name: 'รถกระบะสี่ประตู อีซูซุ (กข-1234 อต)' },
  { id: 'veh_personal', name: 'รถยนต์ส่วนบุคคลของอาจารย์' },
];

const WORK_TYPES = [
  'แนะแนวการศึกษา ม.3',
  'แนะแนวการศึกษา ม.6',
  'แนะแนวการศึกษา ม.3 และ ม.6',
  'ประชาสัมพันธ์หลักสูตร ปวช. / ปวส.',
  'จัดนิทรรศการเปิดโลกอาชีพ',
  'รับสมัครและสอบสัมภาษณ์นักศึกษาใหม่',
];

export const FieldTripFormModal: React.FC<FieldTripFormModalProps> = ({
  isOpen,
  onClose,
  schools,
  prefilledAppointment,
  prefilledSubmission,
  tripToEdit,
  onSave,
}) => {
  const { currentUser, users } = useAuth();

  const [date, setDate] = useState<string>(getTodayISO());
  const [departureTime, setDepartureTime] = useState<string>('08:00');
  const [returnTime, setReturnTime] = useState<string>('');
  const [teamId, setTeamId] = useState<TeamId>('team1');
  const [counselorName, setCounselorName] = useState<string>(currentUser?.displayName || 'อ.ปิยะ สุขสมบูรณ์');
  const [counselorId, setCounselorId] = useState<string>(currentUser?.id || 'usr_counselor_1');
  const [teamMemberNames, setTeamMemberNames] = useState<string>('อ.สมศักดิ์ วงศ์สว่าง, นายกิตติ (ฝ่ายโสต)');
  const [workType, setWorkType] = useState<string>('แนะแนวการศึกษา ม.3 และ ม.6');
  const [vehicleId, setVehicleId] = useState<string>('mitsu-6738');
  const [vehicleName, setVehicleName] = useState<string>('MITSU บน 6738');
  const [summary, setSummary] = useState<string>('');
  const [issues, setIssues] = useState<string>('');
  const [photos, setPhotos] = useState<PhotoItem[]>([]);

  // Trip Schools list (support multiple schools in one day trip!)
  const [tripSchools, setTripSchools] = useState<
    Array<{ schoolId: string; schoolName: string; timeSlot?: string; studentCount?: number; notes?: string }>
  >([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tripToEdit) {
      setDate(tripToEdit.date);
      setDepartureTime(tripToEdit.departureTime || '08:00');
      setReturnTime(tripToEdit.returnTime || '');
      setTeamId(tripToEdit.teamId);
      setCounselorName(tripToEdit.counselorName);
      setCounselorId(tripToEdit.counselorId);
      setTeamMemberNames(tripToEdit.teamMemberNames || '');
      setWorkType(tripToEdit.workType);
      setVehicleId(tripToEdit.vehicleId || 'mitsu-6738');
      setVehicleName(tripToEdit.vehicleName || 'MITSU บน 6738');
      setSummary(tripToEdit.summary || '');
      setIssues(tripToEdit.issues || '');
      setPhotos(tripToEdit.photos || []);
      setTripSchools(tripToEdit.schools || []);
    } else if (prefilledSubmission) {
      setDate(prefilledSubmission.submissionDate);
      setTeamId(prefilledSubmission.teamId);
      setTeamMemberNames(prefilledSubmission.submittedByNames?.join(', ') || prefilledSubmission.submittedByName);
      setTripSchools([{ schoolId: prefilledSubmission.schoolId, schoolName: prefilledSubmission.schoolName, timeSlot: '', studentCount: 0 }]);
    } else if (prefilledAppointment) {
      setDate(prefilledAppointment.date);
      setTeamId(prefilledAppointment.teamId);
      setCounselorName(prefilledAppointment.counselorName);
      setCounselorId(prefilledAppointment.counselorId);
      setTeamMemberNames(prefilledAppointment.teamMemberNames || '');
      if (prefilledAppointment.vehicleId) setVehicleId(prefilledAppointment.vehicleId);
      if (prefilledAppointment.vehicleName) setVehicleName(prefilledAppointment.vehicleName);

      setTripSchools([
        {
          schoolId: prefilledAppointment.schoolId,
          schoolName: prefilledAppointment.schoolName,
          timeSlot: `${prefilledAppointment.startTime} - ${prefilledAppointment.endTime} น.`,
          studentCount: 50,
          notes: prefilledAppointment.note || '',
        },
      ]);
    } else if (schools.length > 0 && tripSchools.length === 0) {
      setTripSchools([
        {
          schoolId: schools[0].id,
          schoolName: schools[0].schoolName,
          timeSlot: '09:00 - 11:30 น.',
          studentCount: 40,
        },
      ]);
    }
  }, [tripToEdit, prefilledAppointment, prefilledSubmission, schools]);

  const handleAddSchoolRow = () => {
    if (schools.length === 0) return;
    setTripSchools((prev) => [
      ...prev,
      {
        schoolId: schools[0].id,
        schoolName: schools[0].schoolName,
        timeSlot: '13:00 - 14:30 น.',
        studentCount: 30,
      },
    ]);
  };

  const handleUpdateSchoolRow = (
    index: number,
    field: 'schoolId' | 'timeSlot' | 'studentCount' | 'notes',
    value: any
  ) => {
    setTripSchools((prev) => {
      const updated = [...prev];
      if (field === 'schoolId') {
        const found = schools.find((s) => s.id === value);
        updated[index] = {
          ...updated[index],
          schoolId: value,
          schoolName: found ? found.schoolName : '',
        };
      } else {
        updated[index] = {
          ...updated[index],
          [field]: value,
        };
      }
      return updated;
    });
  };

  const handleRemoveSchoolRow = (index: number) => {
    setTripSchools((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleVehicleChange = (vehId: string) => {
    setVehicleId(vehId);
    const v = VEHICLES.find((item) => item.id === vehId);
    if (v) setVehicleName(v.name);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tripSchools.length === 0) {
      setError('กรุณาระบุอย่างน้อย 1 โรงเรียนในการออกแนะแนว');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await onSave({
        date,
        departureTime,
        returnTime,
        teamId,
        counselorName,
        counselorId,
        teamMemberNames,
        workType,
        vehicleId,
        vehicleName,
        schools: tripSchools,
        summary,
        issues,
        photos,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'บันทึกข้อมูลไม่สำเร็จ');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-2xl">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Compass className="w-5 h-5 text-[#087CC1]" />
              <span>{tripToEdit ? 'แก้ไขบันทึกการออกแนะแนว' : 'บันทึกการออกแนะแนวการศึกษา'}</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              บันทึกผลการปฏิบัติงานจริง สถิตินักเรียน และภาพกิจกรรมลงพื้นที่
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
              {error}
            </div>
          )}

          {/* Date, Times & Team */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                วันที่ออกแนะแนว
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                เวลาออกเดินทาง
              </label>
              <input
                type="time"
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                สายการปฏิบัติงาน
              </label>
              <select
                value={teamId}
                onChange={(e) => setTeamId(e.target.value as TeamId)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
              >
                <option value="team1">อุตรดิตถ์</option>
                <option value="team2">สุโขทัย</option>
              </select>
            </div>
          </div>

          {/* Work Type & Vehicle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ประเภทงาน / กิจกรรม
              </label>
              <select
                value={workType}
                onChange={(e) => setWorkType(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium"
              >
                {WORK_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ยานพาหนะ
              </label>
              <TripVehiclePicker value={vehicleId} name={vehicleName} disabled={isSubmitting} onChange={(id, name) => { setVehicleId(id); setVehicleName(name); }} />
            </div>
          </div>

          {/* Counselor & Team members */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                อาจารย์ผู้รับผิดชอบ
              </label>
              <select aria-label="อาจารย์ผู้รับผิดชอบ" value={counselorId} onChange={e => { const user = users.find(u => u.id === e.target.value); if(user) { setCounselorId(user.id); setCounselorName(user.displayName); } }} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs">
                {!users.some(u => u.active && u.id === counselorId) && <option value={counselorId}>{counselorName || 'เลือกอาจารย์'}</option>}
                {users.filter(u => u.active).map(u => <option key={u.id} value={u.id}>{u.displayName}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ผู้ร่วมเดินทาง
              </label>
              <input
                type="text"
                value={teamMemberNames}
                onChange={(e) => setTeamMemberNames(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
              />
            </div>
          </div>

          {/* Multiple Schools In Trip */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-[#075A9C] uppercase tracking-wider">
                  โรงเรียนที่เข้าจัดกิจกรรม (รองรับหลายโรงเรียนใน 1 ทริป)
                </h3>
              </div>
              <button
                type="button"
                onClick={handleAddSchoolRow}
                className="inline-flex items-center gap-1 px-3 py-1 bg-white hover:bg-slate-100 text-[#087CC1] border border-[#087CC1]/30 rounded-lg text-xs font-semibold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ เพิ่มโรงเรียน</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {tripSchools.map((item, index) => (
                <div
                  key={index}
                  className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-medium text-slate-500 mb-0.5">
                        โรงเรียน #{index + 1}
                      </label>
                      <SchoolPicker schools={schools} value={item.schoolId} onChange={id => handleUpdateSchoolRow(index, 'schoolId', id)} disabled={isSubmitting}/>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 mb-0.5">
                        ช่วงเวลาจัดกิจกรรม
                      </label>
                      <input
                        type="text"
                        value={item.timeSlot || ''}
                        onChange={(e) => handleUpdateSchoolRow(index, 'timeSlot', e.target.value)}
                        placeholder="09:00 - 11:30"
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                      />
                    </div>

                    <div className="flex items-center gap-1.5">
                      <div className="flex-1">
                        <label className="block text-[11px] font-medium text-slate-500 mb-0.5">
                          นร. เข้าร่วม (คน)
                        </label>
                        <input
                          type="number"
                          value={item.studentCount || ''}
                          onChange={(e) =>
                            handleUpdateSchoolRow(index, 'studentCount', Number(e.target.value))
                          }
                          placeholder="จำนวน"
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold"
                        />
                      </div>
                      {tripSchools.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSchoolRow(index)}
                          className="mt-4 p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary & Issues */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                สรุปผลการปฏิบัติงาน
              </label>
              <textarea
                rows={3}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="เช่น นักเรียนให้ความสนใจสาขาช่างยนต์และคอมพิวเตอร์เป็นอย่างมาก แจกใบสมัครไป 45 ชุด"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ปัญหา / อุปสรรค / ข้อเสนอแนะ
              </label>
              <textarea
                rows={3}
                value={issues}
                onChange={(e) => setIssues(e.target.value)}
                placeholder="เช่น ปลั๊กไฟเวทีไม่พอ เครื่องเสียงโรงเรียนมีเสียงฮัม"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
              />
            </div>
          </div>

          {/* Photos Upload Section */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              รูปภาพกิจกรรมแนะแนว (กล้องถ่ายรูป หรือคลังรูปภาพ)
            </label>
            <PhotoUploader
              photos={photos}
              onChange={setPhotos}
              folder="guidance-activities"
              schoolId={tripSchools[0]?.schoolId || 'field_trip'}
            />
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#087CC1] hover:bg-[#075A9C] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'กำลังบันทึก...' : 'บันทึกข้อมูลการออกแนะแนว'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
