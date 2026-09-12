import React, { useState, useEffect } from 'react';
import { X, Save, Calendar, Clock, FileText, CalendarCheck, AlertCircle } from 'lucide-react';
import { School, DocumentSubmission, PostSubmissionStatus, TeamId, PhotoItem } from '../../types';
import { PhotoUploader } from '../common/PhotoUploader';
import { getTodayISO } from '../../utils/dateUtils';
import { useAuth } from '../../context/AuthContext';

interface SubmissionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  schools: School[];
  preselectedSchool?: School | null;
  onSave: (data: Omit<DocumentSubmission, 'id'>) => Promise<string>;
  onOpenInstantAppointment: (submissionData: {
    schoolId: string;
    schoolName: string;
    teacherName: string;
    teacherPhone: string;
    teacherLine?: string;
    teamId: TeamId;
  }) => void;
}

export const SubmissionFormModal: React.FC<SubmissionFormModalProps> = ({
  isOpen,
  onClose,
  schools,
  preselectedSchool,
  onSave,
  onOpenInstantAppointment,
}) => {
  if (!isOpen) return null;

  const { currentUser } = useAuth();

  const [selectedSchoolId, setSelectedSchoolId] = useState<string>(preselectedSchool?.id || '');
  const [documentNumber, setDocumentNumber] = useState<string>('วท.อต. /2569');
  const [submissionDate, setSubmissionDate] = useState<string>(getTodayISO());
  const [submissionTime, setSubmissionTime] = useState<string>('10:00');
  const [teamId, setTeamId] = useState<TeamId>(preselectedSchool?.teamId || 'team1');
  const [submittedByName, setSubmittedByName] = useState<string>(currentUser?.displayName || 'อ.ปิยะ สุขสมบูรณ์');

  // Guidance Teacher Contacts
  const [teacherName, setTeacherName] = useState<string>('');
  const [teacherPosition, setTeacherPosition] = useState<string>('ครูแนะแนว');
  const [teacherPhone, setTeacherPhone] = useState<string>('');
  const [teacherLine, setTeacherLine] = useState<string>('');
  const [preferredContactTime, setPreferredContactTime] = useState<string>('');

  const [status, setStatus] = useState<PostSubmissionStatus>('DOCUMENT_SUBMITTED');
  const [note, setNote] = useState<string>('');
  const [photos, setPhotos] = useState<PhotoItem[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync when preselectedSchool changes
  useEffect(() => {
    if (preselectedSchool) {
      setSelectedSchoolId(preselectedSchool.id);
      setTeamId(preselectedSchool.teamId);
      setTeacherName(preselectedSchool.teacherName || '');
      setTeacherPosition(preselectedSchool.teacherPosition || 'ครูแนะแนว');
      setTeacherPhone(preselectedSchool.teacherPhone || '');
      setTeacherLine(preselectedSchool.teacherLine || '');
      setPreferredContactTime(preselectedSchool.preferredContactTime || '');
    } else if (schools.length > 0 && !selectedSchoolId) {
      handleSchoolSelect(schools[0].id);
    }
  }, [preselectedSchool, schools]);

  const handleSchoolSelect = (schoolId: string) => {
    setSelectedSchoolId(schoolId);
    const target = schools.find((s) => s.id === schoolId);
    if (target) {
      setTeamId(target.teamId);
      if (target.teacherName) setTeacherName(target.teacherName);
      if (target.teacherPosition) setTeacherPosition(target.teacherPosition);
      if (target.teacherPhone) setTeacherPhone(target.teacherPhone);
      if (target.teacherLine) setTeacherLine(target.teacherLine);
      if (target.preferredContactTime) setPreferredContactTime(target.preferredContactTime);
    }
  };

  const getTargetSchool = () => schools.find((s) => s.id === selectedSchoolId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetSchool = getTargetSchool();
    if (!targetSchool) {
      setError('กรุณาเลือกโรงเรียน');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await onSave({
        schoolId: targetSchool.id,
        schoolName: targetSchool.schoolName,
        documentNumber,
        submissionDate,
        submissionTime,
        teamId,
        submittedById: currentUser?.id || 'usr_staff',
        submittedByName,
        teacherName,
        teacherPosition,
        teacherPhone,
        teacherLine,
        preferredContactTime,
        status,
        note,
        photos,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'บันทึกการยื่นหนังสือไม่สำเร็จ');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Instant Appointment click handler: carries values forward seamlessly
  const handleInstantSchedule = async () => {
    const targetSchool = getTargetSchool();
    if (!targetSchool) {
      setError('กรุณาเลือกโรงเรียนก่อนนัดหมาย');
      return;
    }

    // First, save the document submission so progress is never lost
    try {
      await onSave({
        schoolId: targetSchool.id,
        schoolName: targetSchool.schoolName,
        documentNumber,
        submissionDate,
        submissionTime,
        teamId,
        submittedById: currentUser?.id || 'usr_staff',
        submittedByName,
        teacherName,
        teacherPosition,
        teacherPhone,
        teacherLine,
        preferredContactTime,
        status: 'APPOINTED',
        note,
        photos,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Auto-save document before appointment:', e);
    }

    // Now open the calendar/appointment modal with carried-over fields
    onOpenInstantAppointment({
      schoolId: targetSchool.id,
      schoolName: targetSchool.schoolName,
      teacherName,
      teacherPhone,
      teacherLine,
      teamId,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-2xl">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#087CC1]" />
              <span>บันทึกการยื่นหนังสือประสานงาน</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              บันทึกหลักฐานและข้อมูลติดต่อครูแนะแนว (อัปเดตเข้าโปรไฟล์โรงเรียนอัตโนมัติ)
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
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Schedule Prompt Callout */}
          <div className="p-3.5 bg-gradient-to-r from-[#E3F2FD] to-[#EAF6FD] border border-[#1976D2]/30 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-[#075A9C]">
                โรงเรียนพร้อมนัดหมายทันทีหรือไม่?
              </div>
              <div className="text-[11px] text-slate-600">
                หากโรงเรียนแจ้งกำหนดการแล้ว สามารถกดตรวจสอบคิวว่างและลงนัดหมายได้ทันที
              </div>
            </div>
            <button
              type="button"
              onClick={handleInstantSchedule}
              id="btn-instant-schedule"
              className="px-4 py-2 bg-[#1976D2] hover:bg-[#075A9C] text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 shrink-0 transition-colors"
            >
              <CalendarCheck className="w-4 h-4" />
              <span>ดูคิวว่าง / นัดหมายเลย</span>
            </button>
          </div>

          {/* School Picker & Document Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                โรงเรียนเป้าหมาย <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedSchoolId}
                onChange={(e) => handleSchoolSelect(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#087CC1]"
                required
              >
                <option value="">-- เลือกโรงเรียน --</option>
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.schoolName} ({s.teamId === 'team1' ? 'สาย 1' : 'สาย 2'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                เลขที่หนังสือราชการ
              </label>
              <input
                type="text"
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                placeholder="เช่น วท.อต. 1045/2569"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm"
              />
            </div>
          </div>

          {/* Date, Time, Team & Submitter */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                วันที่ยื่น
              </label>
              <input
                type="date"
                value={submissionDate}
                onChange={(e) => setSubmissionDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                เวลา
              </label>
              <input
                type="time"
                value={submissionTime}
                onChange={(e) => setSubmissionTime(e.target.value)}
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
                <option value="team1">สายที่ 1 (โซนเมือง)</option>
                <option value="team2">สายที่ 2 (โซนรอบนอก)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                อาจารย์ผู้ยื่น
              </label>
              <input
                type="text"
                value={submittedByName}
                onChange={(e) => setSubmittedByName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
              />
            </div>
          </div>

          {/* Guidance Teacher Information (Auto-updates School!) */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#075A9C] uppercase tracking-wider">
                ข้อมูลครูแนะแนวที่ติดต่อ (จะอัปเดตลงฐานข้อมูลโรงเรียนอัตโนมัติ)
              </h3>
            </div>

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
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ตำแหน่ง
                </label>
                <input
                  type="text"
                  value={teacherPosition}
                  onChange={(e) => setTeacherPosition(e.target.value)}
                  placeholder="เช่น หัวหน้างานแนะแนว"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  เบอร์โทรศัพท์
                </label>
                <input
                  type="tel"
                  value={teacherPhone}
                  onChange={(e) => setTeacherPhone(e.target.value)}
                  placeholder="08x-xxx-xxxx"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  LINE ID / ช่องทางติดต่อ
                </label>
                <input
                  type="text"
                  value={teacherLine}
                  onChange={(e) => setTeacherLine(e.target.value)}
                  placeholder="Line ID"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  เวลาที่สะดวกให้ติดต่อกลับ
                </label>
                <input
                  type="text"
                  value={preferredContactTime}
                  onChange={(e) => setPreferredContactTime(e.target.value)}
                  placeholder="เช่น พักเที่ยง / หลัง 15:30"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm"
                />
              </div>
            </div>
          </div>

          {/* Post Submission Status & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                สถานะหลังยื่นหนังสือ
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as PostSubmissionStatus)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium"
              >
                <option value="DOCUMENT_SUBMITTED">ยื่นหนังสือแล้ว</option>
                <option value="WAITING_CONTACT">รอติดต่อกลับ</option>
                <option value="CALL_LATER">ขอให้ติดต่อภายหลัง</option>
                <option value="WAITING_APPOINTMENT">รอนัดหมาย</option>
                <option value="APPOINTED">นัดหมายแล้ว</option>
                <option value="NOT_READY">โรงเรียนยังไม่พร้อม</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                หมายเหตุเพิ่มเติม
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="เช่น ส่งเรื่องที่ห้องสารบรรณ, ครูแนะแนวติดสอน"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm"
              />
            </div>
          </div>

          {/* Photo Evidence Upload (Camera & Gallery) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              รูปถ่ายหลักฐานการยื่นหนังสือ (อัปโหลดหลายรูปได้)
            </label>
            <PhotoUploader
              photos={photos}
              onChange={setPhotos}
              folder="document-submissions"
              schoolId={selectedSchoolId}
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
              <span>{isSubmitting ? 'กำลังบันทึก...' : 'บันทึกการยื่นหนังสือ'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
