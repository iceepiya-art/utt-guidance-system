import type { DocumentSubmission } from '../../types';
import { TripVehiclePicker } from '../common/TripVehiclePicker';
import { SchoolPicker } from '../common/SchoolPicker';
import React, { useState, useEffect } from 'react';
import { X, Save, Compass, Plus, Trash2, Calendar, Clock, Car, Users, AlertCircle, Coins, Fuel } from 'lucide-react';
import { School, FieldTrip, TeamId, PhotoItem, Appointment, Vehicle, ApprovalStatus } from '../../types';
import { PhotoUploader } from '../common/PhotoUploader';
import { getTodayISO } from '../../utils/dateUtils';
import { useAuth } from '../../context/AuthContext';
import { subscribeVehicles } from '../../firebase/dbService';

interface FieldTripFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  schools: School[];
  prefilledAppointment?: Appointment | null;
  prefilledSubmission?: Omit<DocumentSubmission, 'id'> | null;
  tripToEdit?: FieldTrip | null;
  onSave: (tripData: Omit<FieldTrip, 'id'>) => Promise<string | void>;
}

const DEFAULT_VEHICLES: Vehicle[] = [
  { id: 'veh_01', vehicleName: 'รถตู้โตโยต้า คอมมิวเตอร์ (นข-4521 อต)', registrationNumber: 'นข-4521 อต', active: true },
  { id: 'veh_02', vehicleName: 'รถตู้โตโยต้า คอมมิวเตอร์ (นข-8842 อต)', registrationNumber: 'นข-8842 อต', active: true },
  { id: 'veh_03', vehicleName: 'รถกระบะสี่ประตู อีซูซุ (กข-1234 อต)', registrationNumber: 'กข-1234 อต', active: true },
  { id: 'veh_personal', vehicleName: 'รถยนต์ส่วนบุคคลของอาจารย์', registrationNumber: 'ส่วนบุคคล', active: true },
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
  const { currentUser, users, isAdmin, isManager } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>(DEFAULT_VEHICLES);

  useEffect(() => {
    return subscribeVehicles((list) => {
      if (list && list.length > 0) setVehicles(list);
    });
  }, []);

  const counselors = React.useMemo(() => {
    const activeStaff = users.filter((u) => u.active && u.role !== 'VIEWER');
    if (activeStaff.length > 0) {
      return activeStaff.map((u) => ({ id: u.id, name: u.displayName, teamId: u.teamId || 'team1' }));
    }
    return [
      { id: 'usr_counselor_1', name: 'อ.ปิยะ สุขสมบูรณ์', teamId: 'team1' as TeamId },
      { id: 'usr_staff_1', name: 'อ.สมศักดิ์ วงศ์สว่าง', teamId: 'team1' as TeamId },
      { id: 'usr_staff_2', name: 'อ.นภาพร ใจดี', teamId: 'team2' as TeamId },
      { id: 'usr_staff_3', name: 'อ.วรวิทย์ ศิริชัย', teamId: 'team2' as TeamId },
      { id: 'usr_manager_1', name: 'ดร.สุรชัย มั่นคง', teamId: 'team1' as TeamId },
    ];
  }, [users]);

  const [date, setDate] = useState<string>(getTodayISO());
  const [departureTime, setDepartureTime] = useState<string>('08:00');
  const [returnTime, setReturnTime] = useState<string>('');
  const [teamId, setTeamId] = useState<TeamId>('team1');
  const [counselorName, setCounselorName] = useState<string>(currentUser?.displayName || 'อ.ปิยะ สุขสมบูรณ์');
  const [counselorId, setCounselorId] = useState<string>(currentUser?.id || 'usr_counselor_1');
  const [teamMemberNames, setTeamMemberNames] = useState<string>('');
  const [workType, setWorkType] = useState<string>('แนะแนวการศึกษา ม.3 และ ม.6');
  const [vehicleId, setVehicleId] = useState<string>('mitsu-6738');
  const [vehicleName, setVehicleName] = useState<string>('MITSU บน 6738');
  const [summary, setSummary] = useState<string>('');
  const [issues, setIssues] = useState<string>('');
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus>('PENDING_APPROVAL');
  const [academicYear, setAcademicYear] = useState<string>('2569');
  const [budgetAllowance, setBudgetAllowance] = useState<number>(0);
  const [budgetFuel, setBudgetFuel] = useState<number>(0);

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
      setApprovalStatus(tripToEdit.approvalStatus || 'APPROVED');
      setAcademicYear(tripToEdit.academicYear || '2569');
      setBudgetAllowance(tripToEdit.budgetAllowance || 0);
      setBudgetFuel(tripToEdit.budgetFuel || 0);
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
          timeSlot: `${prefilledAppointment.startTime} - ${prefilledAppointment.endTime}`,
          studentCount: 50,
          notes: prefilledAppointment.note || '',
        },
      ]);
      setApprovalStatus(isAdmin || isManager ? 'APPROVED' : 'PENDING_APPROVAL');
    } else {
      if (schools.length > 0 && tripSchools.length === 0) {
        setTripSchools([
          {
            schoolId: schools[0].id,
            schoolName: schools[0].schoolName,
            timeSlot: '09:00 - 11:30',
            studentCount: (schools[0].studentM3 || 0) + (schools[0].studentM6 || 0) || 50,
          },
        ]);
      }
      setApprovalStatus(isAdmin || isManager ? 'APPROVED' : 'PENDING_APPROVAL');
    }
  }, [tripToEdit, prefilledAppointment, prefilledSubmission, schools, isAdmin, isManager]);

  const handleAddSchoolRow = () => {
    const defaultSchool = schools[0];
    setTripSchools((prev) => [
      ...prev,
      {
        schoolId: defaultSchool ? defaultSchool.id : '',
        schoolName: defaultSchool ? defaultSchool.schoolName : '',
        timeSlot: '13:00 - 14:30',
        studentCount: 30,
        notes: '',
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
    const v = vehicles.find((item) => item.id === vehId);
    if (v) setVehicleName(v.vehicleName);
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
        approvalStatus,
        academicYear,
        budgetAllowance,
        budgetFuel,
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

          {/* Date & Team */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                placeholder="เช่น อ.สมศักดิ์, นายกิตติ (ฝ่ายโสต)"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
              />
            </div>
          </div>

          {/* Organization Budget Reimbursement */}
          <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-200/80 space-y-2.5">
            <h3 className="text-xs font-bold text-[#075A9C] uppercase tracking-wider flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5" />
              <span>งบประมาณและการเบิกจ่ายขององค์กร</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ค่าเบี้ยเลี้ยง / ค่าตอบแทนบุคลากร (บาท)
                </label>
                <input
                  type="number"
                  min="0"
                  value={budgetAllowance}
                  onChange={(e) => setBudgetAllowance(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ค่าน้ำมันเชื้อเพลิง / ค่าผ่านทาง (บาท)
                </label>
                <input
                  type="number"
                  min="0"
                  value={budgetFuel}
                  onChange={(e) => setBudgetFuel(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono"
                />
              </div>
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
                <span>เพิ่มโรงเรียน</span>
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
