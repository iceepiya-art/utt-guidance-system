import { SchoolPicker } from '../common/SchoolPicker';
import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, AlertTriangle, Bell, Car, Users, Save, Check } from 'lucide-react';
import { School, Appointment, TeamId, AppointmentStatus } from '../../types';
import { getTodayISO, checkTimeOverlap } from '../../utils/dateUtils';
import { checkAppointmentConflict } from '../../firebase/dbService';

interface AppointmentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  schools: School[];
  prefilledData?: {
    schoolId?: string;
    schoolName?: string;
    teacherName?: string;
    teacherPhone?: string;
    teacherLine?: string;
    teamId?: TeamId;
    date?: string;
    startTime?: string;
    endTime?: string;
  } | null;
  appointmentToEdit?: Appointment | null;
  onSave: (apptData: Omit<Appointment, 'id'>) => Promise<string | void>;
}

const VEHICLES = [
  { id: 'veh_01', name: 'รถตู้โตโยต้า คอมมิวเตอร์ (นข-4521 อต)' },
  { id: 'veh_02', name: 'รถตู้โตโยต้า คอมมิวเตอร์ (นข-8842 อต)' },
  { id: 'veh_03', name: 'รถกระบะสี่ประตู อีซูซุ (กข-1234 อต)' },
  { id: 'veh_personal', name: 'รถยนต์ส่วนบุคคลของอาจารย์' },
];

const COUNSELORS = [
  { id: 'usr_counselor_1', name: 'อ.ปิยะ สุขสมบูรณ์', teamId: 'team1' },
  { id: 'usr_staff_1', name: 'อ.สมศักดิ์ วงศ์สว่าง', teamId: 'team1' },
  { id: 'usr_staff_2', name: 'อ.นภาพร ใจดี', teamId: 'team2' },
  { id: 'usr_staff_3', name: 'อ.วรวิทย์ ศิริชัย', teamId: 'team2' },
  { id: 'usr_manager_1', name: 'ดร.สุรชัย มั่นคง', teamId: 'team1' },
];

export const AppointmentFormModal: React.FC<AppointmentFormModalProps> = ({
  isOpen,
  onClose,
  schools,
  prefilledData,
  appointmentToEdit,
  onSave,
}) => {
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('');
  const [date, setDate] = useState<string>(getTodayISO());
  const [startTime, setStartTime] = useState<string>('09:00');
  const [endTime, setEndTime] = useState<string>('11:30');
  const [teamId, setTeamId] = useState<TeamId>('team1');
  const [counselorName, setCounselorName] = useState<string>('อ.ปิยะ สุขสมบูรณ์');
  const [counselorId, setCounselorId] = useState<string>('usr_counselor_1');
  const [teamMemberNames, setTeamMemberNames] = useState<string>('อ.สมศักดิ์ วงศ์สว่าง, นายกิตติ (จนท.โสต)');
  const [vehicleId, setVehicleId] = useState<string>('veh_01');
  const [vehicleName, setVehicleName] = useState<string>('รถตู้โตโยต้า คอมมิวเตอร์ (นข-4521 อต)');
  const [teacherName, setTeacherName] = useState<string>('');
  const [teacherPhone, setTeacherPhone] = useState<string>('');
  const [status, setStatus] = useState<AppointmentStatus>('CONFIRMED');
  const [note, setNote] = useState<string>('');

  // Email Reminder options
  const [reminderEnabled, setReminderEnabled] = useState<boolean>(true);
  const [reminderMinutes, setReminderMinutes] = useState<number>(1440); // default 1 day = 1440 min

  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (appointmentToEdit) {
      setSelectedSchoolId(appointmentToEdit.schoolId);
      setDate(appointmentToEdit.date);
      setStartTime(appointmentToEdit.startTime);
      setEndTime(appointmentToEdit.endTime);
      setTeamId(appointmentToEdit.teamId);
      setCounselorName(appointmentToEdit.counselorName);
      setCounselorId(appointmentToEdit.counselorId);
      setTeamMemberNames(appointmentToEdit.teamMemberNames || '');
      setVehicleId(appointmentToEdit.vehicleId || 'veh_01');
      setVehicleName(appointmentToEdit.vehicleName || 'รถตู้โตโยต้า คอมมิวเตอร์ (นข-4521 อต)');
      setTeacherName(appointmentToEdit.teacherName || '');
      setTeacherPhone(appointmentToEdit.teacherPhone || '');
      setStatus(appointmentToEdit.status);
      setNote(appointmentToEdit.note || '');
      if (appointmentToEdit.reminders && appointmentToEdit.reminders.length > 0) {
        setReminderEnabled(appointmentToEdit.reminders[0].enabled);
        setReminderMinutes(appointmentToEdit.reminders[0].minutesBefore);
      }
    } else if (prefilledData) {
      if (prefilledData.schoolId) setSelectedSchoolId(prefilledData.schoolId);
      if (prefilledData.teamId) setTeamId(prefilledData.teamId);
      if (prefilledData.teacherName) setTeacherName(prefilledData.teacherName);
      if (prefilledData.teacherPhone) setTeacherPhone(prefilledData.teacherPhone);
      if (prefilledData.date) setDate(prefilledData.date);
      if (prefilledData.startTime) setStartTime(prefilledData.startTime);
      if (prefilledData.endTime) setEndTime(prefilledData.endTime);
    }
  }, [appointmentToEdit, prefilledData, schools]);

  const handleSchoolSelect = (schoolId: string) => {
    setSelectedSchoolId(schoolId);
    if (!schoolId) { setTeacherName(''); setTeacherPhone(''); }
    const target = schools.find((s) => s.id === schoolId);
    if (target) {
      setTeamId(target.teamId);
      setTeacherName(target.teacherName || '');
      setTeacherPhone(target.teacherPhone || '');
    }
  };

  const handleVehicleChange = (vehId: string) => {
    setVehicleId(vehId);
    const v = VEHICLES.find((item) => item.id === vehId);
    if (v) setVehicleName(v.name);
  };

  const handleCounselorChange = (cName: string) => {
    setCounselorName(cName);
    const found = COUNSELORS.find((c) => c.name === cName);
    if (found) setCounselorId(found.id);
  };

  // Live conflict checking
  useEffect(() => {
    if (!date || !startTime || !endTime) return;
    let isCancelled = false;

    const runCheck = async () => {
      const conflict = await checkAppointmentConflict(
        date,
        startTime,
        endTime,
        teamId,
        counselorId,
        appointmentToEdit?.id
      );

      if (!isCancelled) {
        if (conflict && conflict.hasConflict) {
          setConflictWarning(conflict.reason || 'มีการลงพื้นที่หรือนัดหมายซ้อนทับในช่วงเวลานี้');
        } else {
          setConflictWarning(null);
        }
      }
    };

    runCheck();
    return () => {
      isCancelled = true;
    };
  }, [date, startTime, endTime, teamId, counselorId, appointmentToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const school = schools.find((s) => s.id === selectedSchoolId);
    if (!school) {
      setError('กรุณาเลือกโรงเรียน');
      return;
    }

    if (startTime >= endTime) {
      setError('เวลาเริ่มต้องมาก่อนเวลาสิ้นสุด');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await onSave({
        schoolId: school.id,
        schoolName: school.schoolName,
        date,
        startTime,
        endTime,
        teamId,
        counselorName,
        counselorId,
        teamMemberNames,
        vehicleId,
        vehicleName,
        teacherName,
        teacherPhone,
        status,
        note,
        reminders: [
          {
            type: 'email',
            minutesBefore: reminderMinutes,
            enabled: reminderEnabled,
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'บันทึกนัดหมายไม่สำเร็จ');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-2xl">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#087CC1]" />
            <span>{appointmentToEdit ? 'แก้ไขข้อมูลนัดหมาย' : 'สร้างนัดหมายแนะแนวใหม่'}</span>
          </h2>
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

          {/* Conflict Warning banner if overlap detected */}
          {conflictWarning && (
            <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">แจ้งเตือนเวลาทับซ้อน (Overlap Warning):</span>
                <p className="mt-0.5">{conflictWarning}</p>
                <p className="text-[11px] text-amber-700 mt-1">
                  * ท่านสามารถปรับเปลี่ยนเวลา หรือมอบหมายให้อาจารย์/สายอื่นแทนได้
                </p>
              </div>
            </div>
          )}

          {/* School selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              โรงเรียนเป้าหมาย <span className="text-red-500">*</span>
            </label>
            <SchoolPicker schools={schools} value={selectedSchoolId} onChange={handleSchoolSelect} disabled={isSubmitting}/>
          </div>

          {/* Date & Time slots */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                วันที่นัดหมาย <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-[#087CC1]"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                เวลาเริ่มต้น
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                เวลาสิ้นสุด
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                required
              />
            </div>
          </div>

          {/* Team & Counselor & Vehicle */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                สายปฏิบัติงาน
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
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                อาจารย์ผู้รับผิดชอบ
              </label>
              <select
                value={counselorName}
                onChange={(e) => handleCounselorChange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
              >
                {COUNSELORS.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name} ({c.teamId === 'team1' ? 'อุตรดิตถ์' : 'สุโขทัย'})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ยานพาหนะ
              </label>
              <select
                value={vehicleId}
                onChange={(e) => handleVehicleChange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
              >
                {VEHICLES.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Team Member names */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              ทีมงานร่วมเดินทาง
            </label>
            <input
              type="text"
              value={teamMemberNames}
              onChange={(e) => setTeamMemberNames(e.target.value)}
              placeholder="เช่น อ.สมศักดิ์, น.ส.วิภาดา, นายกิตติ (ฝ่ายโสต)"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
            />
          </div>

          {/* School Teacher Contact */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <h3 className="text-xs font-bold text-[#075A9C] uppercase tracking-wider">
              ผู้ประสานงานของโรงเรียน
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อครูแนะแนว
                </label>
                <input
                  type="text"
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  placeholder="เช่น ครูสมใจ จันทร์เพ็ญ"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  เบอร์โทรศัพท์ติดต่อ
                </label>
                <input
                  type="tel"
                  value={teacherPhone}
                  onChange={(e) => setTeacherPhone(e.target.value)}
                  placeholder="08x-xxx-xxxx"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                />
              </div>
            </div>
          </div>

          {/* Email Reminder Setting */}
          <div className="p-4 bg-gradient-to-r from-blue-50/70 to-indigo-50/70 rounded-xl border border-blue-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#087CC1]" />
                <span className="text-xs font-bold text-slate-800">
                  การแจ้งเตือนทางอีเมล (Email Reminder)
                </span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={reminderEnabled}
                  onChange={(e) => setReminderEnabled(e.target.checked)}
                  className="w-4 h-4 text-[#087CC1] rounded-sm focus:ring-[#087CC1]"
                />
                <span className="text-xs font-medium text-slate-700">เปิดแจ้งเตือน</span>
              </label>
            </div>

            {reminderEnabled && (
              <div className="space-y-2 pt-1 border-t border-blue-100">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-600 font-medium">แจ้งเตือนล่วงหน้า:</span>
                  <select
                    value={reminderMinutes}
                    onChange={(e) => setReminderMinutes(Number(e.target.value))}
                    className="px-2.5 py-1.5 bg-white border border-blue-200 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-[#087CC1]"
                  >
                    <option value={15}>15 นาที</option>
                    <option value={30}>30 นาที</option>
                    <option value={60}>1 ชั่วโมง</option>
                    <option value={180}>3 ชั่วโมง</option>
                    <option value={1440}>1 วัน (ค่าเริ่มต้น)</option>
                    <option value={2880}>2 วัน</option>
                    <option value={4320}>3 วัน</option>
                  </select>
                </div>
                <p className="text-[11px] text-slate-500">
                  * ส่งอีเมลแจ้งเตือนไปยัง: อาจารย์ผู้รับผิดชอบ, ทีมงานสาย, หัวหน้างาน และผู้บริหาร พร้อมป้องกันการส่งซ้ำ
                </p>
              </div>
            )}
          </div>

          {/* Status & Note */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                สถานะนัดหมาย
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as AppointmentStatus)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
              >
                <option value="CONFIRMED">ยืนยันนัดหมายแล้ว (Confirmed)</option>
                <option value="TENTATIVE">รอยืนยัน (Tentative)</option>
                <option value="COMPLETED">ดำเนินการเรียบร้อย (Completed)</option>
                <option value="CANCELLED">ยกเลิก (Cancelled)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                หมายเหตุ
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="เช่น แนะแนวรวม ม.3 และ ม.6 ที่หอประชุม"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
              />
            </div>
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
              <span>{isSubmitting ? 'กำลังบันทึก...' : 'บันทึกนัดหมาย'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
