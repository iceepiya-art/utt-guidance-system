import React, { useState, useMemo } from 'react';
import {
  Bell,
  CalendarCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileCheck2,
  ChevronRight,
  X,
} from 'lucide-react';
import { Appointment, FieldTrip, School, AppNotification } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { formatThaiShortDate, getDaysDifference } from '../../utils/dateUtils';
import { ActiveTab } from './AppLayout';

interface NotificationDropdownProps {
  appointments: Appointment[];
  fieldTrips: FieldTrip[];
  schools: School[];
  onNavigate: (tab: ActiveTab) => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  appointments,
  fieldTrips,
  schools,
  onNavigate,
}) => {
  const { currentUser, isAdmin, isManager } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  // Compute enterprise dynamic notifications
  const notifications = useMemo<AppNotification[]>(() => {
    const list: AppNotification[] = [];
    const today = new Date().toISOString().split('T')[0];

    // 1. Pending Approvals for Managers & Admins
    if (isAdmin || isManager) {
      const pendingAppts = appointments.filter((a) => a.approvalStatus === 'PENDING_APPROVAL');
      if (pendingAppts.length > 0) {
        list.push({
          id: 'notif-pending-appts',
          title: `มี ${pendingAppts.length} นัดหมายรอการอนุมัติ`,
          message: `รายการนัดหมายจากเจ้าหน้าที่ รอการตรวจสอบและอนุมัติจากผู้บริหาร`,
          type: 'APPROVAL_REQUEST',
          timestamp: today,
          read: false,
          targetTab: 'appointments',
          priority: 'high',
        });
      }

      const pendingTrips = fieldTrips.filter((t) => t.approvalStatus === 'PENDING_APPROVAL');
      if (pendingTrips.length > 0) {
        list.push({
          id: 'notif-pending-trips',
          title: `มี ${pendingTrips.length} การออกปฏิบัติงานรออนุมัติ`,
          message: `แผนการออกปฏิบัติงานภาคสนามรอการพิจารณาอนุมัติยานพาหนะและงบประมาณ`,
          type: 'APPROVAL_REQUEST',
          timestamp: today,
          read: false,
          targetTab: 'fieldTrips',
          priority: 'high',
        });
      }
    }

    // 2. Upcoming appointments within 48 hours
    appointments.forEach((appt) => {
      if (appt.status !== 'CANCELLED' && appt.date >= today) {
        const diffDays = getDaysDifference(today, appt.date);
        if (diffDays >= 0 && diffDays <= 2) {
          list.push({
            id: `notif-appt-${appt.id}`,
            title: `นัดหมาย ${diffDays === 0 ? 'วันนี้' : diffDays === 1 ? 'พรุ่งนี้' : 'อีก 2 วัน'}: ${appt.schoolName}`,
            message: `เวลา ${appt.startTime} - ${appt.endTime} น. (${appt.counselorName || 'สายแนะแนว'})`,
            type: 'APPOINTMENT_REMINDER',
            timestamp: appt.date,
            read: false,
            targetTab: 'appointments',
            priority: diffDays === 0 ? 'high' : 'normal',
          });
        }
      }
    });

    // 3. Stalled submissions (> 7 days without appointment)
    const waitingSchools = schools.filter(
      (s) => s.currentStatus === 'DOCUMENT_SUBMITTED' || s.currentStatus === 'WAITING_APPOINTMENT'
    );
    if (waitingSchools.length > 0) {
      list.push({
        id: 'notif-waiting-schools',
        title: `มี ${waitingSchools.length} โรงเรียนรอนัดหมาย`,
        message: `ยื่นหนังสือขออนุญาตแล้ว กรุณาโทรประสานงานครูแนะแนวเพื่อลงวันนัดหมาย`,
        type: 'FOLLOW_UP_DUE',
        timestamp: today,
        read: false,
        targetTab: 'submissions',
        priority: 'normal',
      });
    }

    return list;
  }, [appointments, fieldTrips, schools, isAdmin, isManager]);

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  const handleItemClick = (notif: AppNotification) => {
    setReadIds((prev) => new Set(prev).add(notif.id));
    if (notif.targetTab) {
      onNavigate(notif.targetTab);
    }
    setIsOpen(false);
  };

  const handleMarkAllRead = () => {
    const all = new Set(notifications.map((n) => n.id));
    setReadIds(all);
  };

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        type="button"
        id="btn-notification-bell"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
        title="การแจ้งเตือนของระบบ"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center px-1 animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
            {/* Header */}
            <div className="p-3.5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#087CC1]" />
                <span className="font-bold text-slate-800 text-sm">การแจ้งเตือนงานแนะแนว</span>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EAF6FD] text-[#087CC1]">
                    {unreadCount} ใหม่
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="text-[11px] text-[#087CC1] hover:underline font-semibold"
                >
                  อ่านทั้งหมด
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-1.5 opacity-80" />
                  <span>ไม่มีการแจ้งเตือนที่ค้างอยู่</span>
                </div>
              ) : (
                notifications.map((notif) => {
                  const isRead = readIds.has(notif.id);
                  return (
                    <div
                      key={notif.id}
                      onClick={() => handleItemClick(notif)}
                      className={`p-3.5 hover:bg-slate-50 cursor-pointer transition-colors flex items-start gap-3 ${
                        !isRead ? 'bg-[#F0F7FD]/40' : ''
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {notif.type === 'APPROVAL_REQUEST' ? (
                          <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                            <Clock className="w-3.5 h-3.5" />
                          </div>
                        ) : notif.type === 'APPOINTMENT_REMINDER' ? (
                          <div className="w-7 h-7 rounded-lg bg-blue-100 text-[#087CC1] flex items-center justify-center">
                            <CalendarCheck className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                            <FileCheck2 className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className={`text-xs font-semibold truncate ${!isRead ? 'text-slate-900' : 'text-slate-700'}`}>
                            {notif.title}
                          </p>
                          {!isRead && <span className="w-2 h-2 rounded-full bg-[#087CC1] shrink-0" />}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                          {notif.message}
                        </p>
                      </div>

                      <ChevronRight className="w-4 h-4 text-slate-300 shrink-0 self-center" />
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center text-[11px] text-slate-400">
              วิทยาลัยเทคโนโลยีอุตรดิตถ์ • ระบบเตือนอัตโนมัติ
            </div>
          </div>
        </>
      )}
    </div>
  );
};
