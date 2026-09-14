import { ActivityLogSection } from './ActivityLogSection';
import React, { useState, useEffect } from 'react';
import {
  Settings,
  Shield,
  Users,
  Car,
  Bell,
  Mail,
  CheckCircle2,
  AlertCircle,
  Database,
  RefreshCw,
  Send,
  HardDrive,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { collection, getDocs, orderBy, query, limit } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import { NotificationLog, School, Appointment } from '../../types';
import { formatThaiShortDate, formatThaiFullDate } from '../../utils/dateUtils';
import { useAuth } from '../../context/AuthContext';
import { seedInitialDataIfEmpty } from '../../firebase/dbService';
import { processPendingReminders, sendManualNotificationTest } from '../../services/reminderService';
import { UserManagerSection } from './UserManagerSection';

interface SettingsViewProps {
  schools: School[];
  appointments: Appointment[];
}

export const SettingsView: React.FC<SettingsViewProps> = ({ schools, appointments }) => {
  const { currentUser, isAdmin } = useAuth();
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState<boolean>(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [seedingStatus, setSeedingStatus] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const q = query(collection(db, 'notificationLogs'), orderBy('sentAt', 'desc'), limit(20));
      const snap = await getDocs(q);
      const list: NotificationLog[] = [];
      snap.forEach((doc) => {
        list.push({ id: doc.id, ...(doc.data() as any) });
      });
      setLogs(list);
    } catch (e) {
      console.warn('Could not fetch notification logs:', e);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (isAdmin) fetchLogs();
  }, [isAdmin]);

  const handleTestReminders = async () => {
    setTestStatus('กำลังตรวจสอบและประมวลผลการแจ้งเตือน...');
    try {
      const result = await processPendingReminders(appointments);
      await fetchLogs();
      setTestStatus(`ส่งแจ้งเตือนเรียบร้อยแล้ว (${result.processed} รายการ)`);
    } catch (e: any) {
      setTestStatus(e.message || 'เกิดข้อผิดพลาดในการประมวลผลการแจ้งเตือน');
    }
  };

  const handleManualTestOne = async () => {
    if (appointments.length === 0) {
      setTestStatus('ไม่มีรายการนัดหมายสำหรับทดสอบ');
      return;
    }
    setTestStatus('กำลังส่งอีเมลทดสอบ...');
    try {
      await sendManualNotificationTest(appointments[0]);
      await fetchLogs();
      setTestStatus(`ส่งอีเมลแจ้งเตือนทดสอบไปยัง guidance@utt.ac.th สำเร็จแล้ว`);
    } catch (e) {
      setTestStatus('ยังไม่ได้เชื่อมต่อบริการส่งอีเมลฝั่งเซิร์ฟเวอร์');
    }
  };

  const handleReSeed = async () => {
    if (confirm('คุณต้องการโหลดข้อมูลตัวอย่างโรงเรียนและนัดหมายเริ่มต้นหรือไม่?')) {
      setSeedingStatus('กำลังบันทึกข้อมูลเริ่มต้น...');
      try {
        await seedInitialDataIfEmpty(currentUser);
        setSeedingStatus('โหลดข้อมูลเริ่มต้นสำเร็จแล้ว กรุณารีเฟรชหรือสลับแท็บ');
      } catch (e: any) {
        setSeedingStatus('เกิดข้อผิดพลาด: ' + e.message);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Settings className="w-6 h-6 text-[#087CC1]" />
          <span>ตั้งค่าระบบและจัดการสิทธิ์ (System Settings)</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          ระบบบริหารงานแนะแนวการศึกษา วิทยาลัยเทคโนโลยีอุตรดิตถ์
        </p>
      </div>

      {/* User Accounts & Role Management */}
      <UserManagerSection />
      {isAdmin && <ActivityLogSection />}

      {/* Roles & Permissions Explanation */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Shield className="w-5 h-5 text-[#087CC1]" />
          <h2 className="font-bold text-slate-800 text-sm sm:text-base">
            โครงสร้างบทบาทและสิทธิ์ผู้ใช้งาน (Role-Based Access Control)
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="p-3.5 bg-red-50/50 border border-red-200 rounded-xl space-y-1">
            <div className="font-bold text-red-700 text-xs flex items-center justify-between">
              <span>ADMIN (ผู้ดูแลระบบ)</span>
              <span className="text-[10px] bg-red-100 px-1.5 py-0.5 rounded-sm">สูงสุด</span>
            </div>
            <p className="text-[11px] text-slate-600">
              จัดการได้ทุกส่วน: เพิ่ม/แก้ไข/ลบโรงเรียน, นัดหมาย, รายงาน, บันทึกการออกแนะแนว, จัดการสิทธิ์ และดูประวัติ Audit Log
            </p>
          </div>

          <div className="p-3.5 bg-purple-50/50 border border-purple-200 rounded-xl space-y-1">
            <div className="font-bold text-purple-700 text-xs flex items-center justify-between">
              <span>MANAGER (ผู้บริหาร)</span>
              <span className="text-[10px] bg-purple-100 px-1.5 py-0.5 rounded-sm">อนุมัติ/ติดตาม</span>
            </div>
            <p className="text-[11px] text-slate-600">
              ดูรายงานภาพรวมทั้งสองสาย, ติดตามความคืบหน้าเทียบเป้าหมาย, ตรวจสอบภาพกิจกรรม และส่งออกข้อมูล Excel (ไม่มีสิทธิ์ลบข้อมูล)
            </p>
          </div>

          <div className="p-3.5 bg-blue-50/50 border border-blue-200 rounded-xl space-y-1">
            <div className="font-bold text-[#075A9C] text-xs flex items-center justify-between">
              <span>STAFF (เจ้าหน้าที่แนะแนว)</span>
              <span className="text-[10px] bg-blue-100 px-1.5 py-0.5 rounded-sm">ผู้ปฏิบัติงาน</span>
            </div>
            <p className="text-[11px] text-slate-600">
              บันทึกข้อมูลโรงเรียน, ยื่นหนังสือ, บันทึกนัดหมาย, บันทึกการออกแนะแนว และถ่ายรูปอัปโหลดหลักฐานในสายการปฏิบัติงานของตนเอง
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <div className="font-bold text-slate-700 text-xs flex items-center justify-between">
              <span>VIEWER (ผู้ตรวจการ)</span>
              <span className="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded-sm">อ่านอย่างเดียว</span>
            </div>
            <p className="text-[11px] text-slate-600">
              ดูข้อมูลโรงเรียน, ดูตารางปฏิทิน และตรวจสอบรูปกิจกรรม ไม่สามารถแก้ไขหรือบันทึกข้อมูลได้
            </p>
          </div>
        </div>
      </div>

      {/* Operational Teams Breakdown */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Users className="w-5 h-5 text-[#087CC1]" />
          <h2 className="font-bold text-slate-800 text-sm sm:text-base">
            การแบ่งสายการปฏิบัติงาน (Operational Teams)
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-[#E3F2FD]/30 border border-[#1976D2]/30 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-sm font-bold text-[#1976D2]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#1976D2]" />
              <span>อุตรดิตถ์</span>
            </div>
            <div className="text-xs text-slate-700">
              <span className="font-semibold">พื้นที่รับผิดชอบ: </span>
              จังหวัดอุตรดิตถ์
            </div>
            <div className="text-xs text-slate-500">
              ทีมงานหลัก: อ.ปิยะ สุขสมบูรณ์, อ.สมศักดิ์ วงศ์สว่าง
            </div>
          </div>

          <div className="p-4 bg-[#FFF7E0]/40 border border-[#F59E0B]/30 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-sm font-bold text-[#F59E0B]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
              <span>สุโขทัย</span>
            </div>
            <div className="text-xs text-slate-700">
              <span className="font-semibold">พื้นที่รับผิดชอบ: </span>
              จังหวัดสุโขทัย
            </div>
            <div className="text-xs text-slate-500">
              ทีมงานหลัก: อ.นภาพร ใจดี, อ.วรวิทย์ ศิริชัย
            </div>
          </div>
        </div>
      </div>

      {/* Email Notification & Reminder Audit Logs */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-[#087CC1]" />
            <div>
              <h2 className="font-bold text-slate-800 text-sm sm:text-base">
                ระบบส่งอีเมลแจ้งเตือนนัดหมาย (Email Reminder Engine)
              </h2>
              <p className="text-xs text-slate-500">
                แจ้งเตือนล่วงหน้า 1 วันไปยังอาจารย์ผู้รับผิดชอบ ทีมงาน และผู้บริหาร ป้องกันการส่งซ้ำ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleManualTestOne}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#087CC1] hover:bg-[#075A9C] text-white text-xs font-semibold rounded-lg shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>ส่งอีเมลทดสอบ</span>
            </button>
            <button
              onClick={fetchLogs}
              disabled={loadingLogs}
              className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
              title="รีเฟรชประวัติ"
            >
              <RefreshCw className={`w-4 h-4 ${loadingLogs ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {testStatus && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-[#075A9C] font-medium">
            {testStatus}
          </div>
        )}

        {/* Logs Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">เวลาส่ง</th>
                <th className="py-2.5 px-3">หัวข้ออีเมล</th>
                <th className="py-2.5 px-3">โรงเรียน</th>
                <th className="py-2.5 px-3">ผู้รับ</th>
                <th className="py-2.5 px-3 text-center">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-400">
                    ยังไม่มีประวัติการส่งอีเมล (กดปุ่ม "ส่งอีเมลทดสอบ" เพื่อทดลอง)
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 text-slate-600">
                      {new Date(log.sentAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.{' '}
                      <span className="text-[10px] text-slate-400">({formatThaiShortDate(log.sentAt)})</span>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-800">
                      {log.subject}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">
                      {log.schoolName}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">
                      {log.recipientEmail}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 100% Free Tier & Zero-Cost Architecture Guarantee */}
      <div className="bg-gradient-to-br from-emerald-50/70 via-white to-sky-50/50 p-5 rounded-2xl border border-emerald-200/80 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-100 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h2 className="font-bold text-slate-800 text-sm sm:text-base flex items-center gap-2">
              <span>สถาปัตยกรรมระบบและฐานข้อมูลฟรี 100% (Free-Tier Architecture)</span>
              <span className="text-[10px] font-extrabold bg-emerald-600 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
                0 บาท ตลอดชีพ
              </span>
            </h2>
          </div>
          <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Google Firebase Spark Free Plan
          </span>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          ระบบบริหารงานแนะแนวการศึกษานี้ได้รับการออกแบบและปรับแต่งสถาปัตยกรรมมาสำหรับ <strong>ใช้งานฟรี 100% โดยสมบูรณ์</strong> โดยไม่ต้องผูกบัตรเครดิต ไม่มีค่าบริการแอบแฝง และใช้โควต้าฟรีอย่างคุ้มค่าสูงสุด:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 bg-white border border-emerald-100 rounded-xl shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-800">
              <span className="flex items-center gap-1.5">
                <Database className="w-4 h-4 text-emerald-600" /> Cloud Firestore
              </span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-sm">ฟรี</span>
            </div>
            <div className="text-xs font-semibold text-slate-800 pt-0.5">
              50,000 อ่าน / 20,000 เขียน ต่อวัน
            </div>
            <p className="text-[11px] text-slate-500">
              เพียงพอต่อการเปิดดูและบันทึกข้อมูลโรงเรียน 50-100 แห่งในจังหวัดอุตรดิตถ์ โดยใช้งานไม่เกิน 2% ของโควต้าฟรีต่อวัน
            </p>
          </div>

          <div className="p-3.5 bg-white border border-emerald-100 rounded-xl shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-800">
              <span className="flex items-center gap-1.5">
                <HardDrive className="w-4 h-4 text-emerald-600" /> Firebase Storage
              </span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-sm">ฟรี 5 GB</span>
            </div>
            <div className="text-xs font-semibold text-slate-800 pt-0.5">
              บีบอัดรูปอัตโนมัติ (Optimizer)
            </div>
            <p className="text-[11px] text-slate-500">
              มีระบบบีบอัดรูปถ่ายมือถือ 10MB เหลือ ~200KB ก่อนอัปโหลด เก็บรูปหนังสือราชการและภาพกิจกรรมได้มากกว่า 25,000 รูปฟรี
            </p>
          </div>

          <div className="p-3.5 bg-white border border-emerald-100 rounded-xl shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-800">
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-600" /> ระบบบัญชีผู้ใช้
              </span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-sm">ไม่จำกัด</span>
            </div>
            <div className="text-xs font-semibold text-slate-800 pt-0.5">
              50,000 บัญชีผู้ใช้ต่อเดือน
            </div>
            <p className="text-[11px] text-slate-500">
              รองรับอาจารย์ เจ้าหน้าที่ และคณะผู้บริหารวิทยาลัยทุกคนได้แบบไม่จำกัดจำนวน โดยไม่มีค่าใช้จ่าย
            </p>
          </div>

          <div className="p-3.5 bg-white border border-emerald-100 rounded-xl shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-800">
              <span className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-emerald-600" /> Zero-Paid External
              </span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-sm">100% Client</span>
            </div>
            <div className="text-xs font-semibold text-slate-800 pt-0.5">
              ไม่มี API เสียเงินภายนอก
            </div>
            <p className="text-[11px] text-slate-500">
              ส่งออก Excel บนเครื่องผู้ใช้เอง (Client-side) ไม่คิดเงินค่า Server และใช้พิกัดแผนที่แบบฟรีทั้งหมด
            </p>
          </div>
        </div>
      </div>

      {/* Database Utilities */}
      {isAdmin && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-slate-500" />
            <h2 className="font-bold text-slate-800 text-sm sm:text-base">
              เครื่องมือฐานข้อมูล (Database Utilities)
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            หากข้อมูลในระบบว่างเปล่า สามารถกดปุ่มด้านล่างเพื่อโหลดข้อมูลโรงเรียนเป้าหมายในจังหวัดอุตรดิตถ์และนัดหมายเริ่มต้น
          </p>

          <div className="pt-1 flex items-center gap-3">
            <button
              onClick={handleReSeed}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
            >
              <Database className="w-4 h-4" />
              <span>โหลดข้อมูลตัวอย่างเริ่มต้น (Seed Initial Data)</span>
            </button>
            {seedingStatus && (
              <span className="text-xs font-semibold text-emerald-700">{seedingStatus}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
