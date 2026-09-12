import React, { useState } from 'react';
import {
  X,
  Calendar,
  Clock,
  Phone,
  PhoneCall,
  Car,
  Users,
  Bell,
  CheckCircle2,
  Edit2,
  AlertCircle,
  Compass,
  Send,
} from 'lucide-react';
import { Appointment, NotificationLog } from '../../types';
import { formatThaiFullDate, getRelativeThaiDayLabel } from '../../utils/dateUtils';
import { sendManualNotificationTest } from '../../services/reminderService';
import { useAuth } from '../../context/AuthContext';

interface AppointmentDetailModalProps {
  appointment: Appointment | null;
  onClose: () => void;
  onEdit: (appointment: Appointment) => void;
  onRecordTrip: (appointment: Appointment) => void;
}

export const AppointmentDetailModal: React.FC<AppointmentDetailModalProps> = ({
  appointment,
  onClose,
  onEdit,
  onRecordTrip,
}) => {
  if (!appointment) return null;

  const { canEdit } = useAuth();
  const [testingEmail, setTestingEmail] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const isTeam1 = appointment.teamId === 'team1';
  const relativeDay = getRelativeThaiDayLabel(appointment.date);

  const handleTestEmail = async () => {
    setTestingEmail(true);
    setTestResult(null);
    try {
      const log = await sendManualNotificationTest(appointment);
      setTestResult(`ส่งอีเมลแจ้งเตือนสำเร็จ (บันทึก Log ID: ${log.id.substring(0, 8)}...)`);
    } catch (err: any) {
      setTestResult('เกิดข้อผิดพลาดในการส่งอีเมล');
    } finally {
      setTestingEmail(false);
    }
  };

  const getStatusBadge = () => {
    const config: Record<string, { label: string; color: string }> = {
      CONFIRMED: { label: 'ยืนยันแล้ว', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
      TENTATIVE: { label: 'รอยืนยัน', color: 'bg-amber-50 text-amber-700 border-amber-200' },
      COMPLETED: { label: 'ออกแนะแนวแล้ว', color: 'bg-blue-50 text-blue-700 border-blue-200' },
      CANCELLED: { label: 'ยกเลิก', color: 'bg-red-50 text-red-700 border-red-200' },
    };
    const c = config[appointment.status] || config.CONFIRMED;
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${c.color}`}>
        {c.label}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-start justify-between bg-slate-50/70 rounded-t-2xl">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-sm ${
                  isTeam1 ? 'bg-[#E3F2FD] text-[#1976D2]' : 'bg-[#FFF7E0] text-[#F59E0B]'
                }`}
              >
                {isTeam1 ? 'สายที่ 1 (โซนเมือง)' : 'สายที่ 2 (โซนรอบนอก)'}
              </span>
              {getStatusBadge()}
            </div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">
              {appointment.schoolName}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Date & Time Highlights */}
          <div className="p-4 bg-gradient-to-br from-[#EAF6FD] to-white rounded-xl border border-[#087CC1]/20 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                <Calendar className="w-4 h-4 text-[#087CC1]" />
                <span>{formatThaiFullDate(appointment.date)}</span>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 bg-blue-100 text-[#075A9C] rounded-full">
                {relativeDay}
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-700 font-semibold text-xs">
              <Clock className="w-4 h-4 text-[#087CC1]" />
              <span>เวลา {appointment.startTime} - {appointment.endTime} น.</span>
            </div>
          </div>

          {/* Teacher Contact with Fast Call */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <div className="text-xs font-bold text-[#075A9C] uppercase tracking-wider mb-2">
              ผู้ประสานงานของโรงเรียน
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-800 text-sm">
                  {appointment.teacherName || 'ไม่ระบุชื่อครูแนะแนว'}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  เบอร์โทร: {appointment.teacherPhone || '-'}
                </div>
              </div>
              {appointment.teacherPhone && (
                <a
                  href={`tel:${appointment.teacherPhone}`}
                  id="btn-call-teacher-from-appt"
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#087CC1] hover:bg-[#075A9C] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>โทรหาครู</span>
                </a>
              )}
            </div>
          </div>

          {/* Counselor & Team */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <span>อาจารย์ผู้รับผิดชอบ</span>
              </div>
              <div className="font-bold text-slate-800 text-sm">
                {appointment.counselorName}
              </div>
              {appointment.teamMemberNames && (
                <div className="text-slate-500 mt-1 text-[11px]">
                  ทีมงาน: {appointment.teamMemberNames}
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                <Car className="w-3.5 h-3.5 text-slate-400" />
                <span>ยานพาหนะ</span>
              </div>
              <div className="font-bold text-slate-800 text-sm">
                {appointment.vehicleName || 'รถตู้ส่วนกลาง'}
              </div>
            </div>
          </div>

          {/* Note */}
          {appointment.note && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700">
              <span className="font-bold">หมายเหตุ: </span>
              {appointment.note}
            </div>
          )}

          {/* Email Reminder Box */}
          <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#087CC1]" />
                <span className="text-xs font-bold text-slate-800">ระบบแจ้งเตือนทางอีเมล</span>
              </div>
              <button
                type="button"
                onClick={handleTestEmail}
                disabled={testingEmail}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#087CC1] hover:bg-[#075A9C] text-white text-[11px] font-semibold rounded-lg shadow-2xs transition-colors disabled:opacity-50"
              >
                <Send className="w-3 h-3" />
                <span>{testingEmail ? 'กำลังส่ง...' : 'ทดสอบส่งอีเมลเตือน'}</span>
              </button>
            </div>
            {testResult && (
              <p className="text-[11px] font-medium text-emerald-700 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                {testResult}
              </p>
            )}
            <p className="text-[11px] text-slate-500">
              ระบบส่งอีเมลแจ้งเตือนกำหนดการล่วงหน้า 1 วันไปยังอาจารย์ผู้รับผิดชอบ และหัวหน้างาน
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/80 rounded-b-2xl flex items-center justify-between gap-2">
          {canEdit && (
            <button
              type="button"
              onClick={() => onEdit(appointment)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold rounded-xl transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>แก้ไขนัดหมาย</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onRecordTrip(appointment)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#087CC1] hover:bg-[#075A9C] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
          >
            <Compass className="w-4 h-4" />
            <span>บันทึกการออกแนะแนว</span>
          </button>
        </div>
      </div>
    </div>
  );
};
