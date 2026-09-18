import { TripVehiclePicker } from '../common/TripVehiclePicker';
import { saveSubmissionAppointment } from '../../firebase/submissionAppointmentService';
import { SchoolPicker } from '../common/SchoolPicker';
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
  submissionToEdit?: DocumentSubmission | null;
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
  submissionToEdit,
  onSave,
  onOpenInstantAppointment,
}) => {
  const { currentUser, users } = useAuth();
  const teacherChoices = [...new Set([...users.filter(user => user.active).map(user => user.displayName.trim()), currentUser?.displayName?.trim() || ''].filter(Boolean))].sort((a, b) => a.localeCompare(b, 'th'));

  const [selectedSchoolId, setSelectedSchoolId] = useState<string>(preselectedSchool?.id || '');
  const [documentNumber, setDocumentNumber] = useState<string>('วท.อต. /2569');
  const [submissionDate, setSubmissionDate] = useState<string>(getTodayISO());
  const [submissionTime, setSubmissionTime] = useState(() => new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit' }));
  const [teamId, setTeamId] = useState<TeamId>(preselectedSchool?.teamId || 'team1');
  const [submitterNames, setSubmitterNames] = useState<string[]>([currentUser?.displayName || '']);
  const submittedByNames = [...new Set<string>(submitterNames.map(name => name.trim()).filter(Boolean))];
  const submittedByName = submittedByNames.join(', ');

  // Guidance Teacher Contacts
  const [teacherName, setTeacherName] = useState<string>('');
  const [teacherPosition, setTeacherPosition] = useState<string>('');
  const [teacherPhone, setTeacherPhone] = useState<string>('');
  const [teacherLine, setTeacherLine] = useState<string>('');
  const [preferredContactTime, setPreferredContactTime] = useState<string>('');

  const [status, setStatus] = useState<PostSubmissionStatus>('DOCUMENT_SUBMITTED');
  const [otherActivityDetails, setOtherActivityDetails] = useState<string>('');
  const [note, setNote] = useState<string>('รอติดต่อกลับ');
  const [photos, setPhotos] = useState<PhotoItem[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentStart, setAppointmentStart] = useState('');
  const [appointmentEnd, setAppointmentEnd] = useState('');
  const defaultVehicle = (team: TeamId) => team === 'team2' ? { id: 'mitsu-6738', name: 'MITSU บน 6738' } : { id: 'vigo-9914', name: 'VIGO กข 9914' };
  const [vehicleId, setVehicleId] = useState(defaultVehicle(teamId).id);
  const [vehicleName, setVehicleName] = useState(defaultVehicle(teamId).name);
  const selectTeam = (nextTeam: TeamId) => {
    setTeamId(nextTeam);
    if (nextTeam !== teamId) { const vehicle = defaultVehicle(nextTeam); setVehicleId(vehicle.id); setVehicleName(vehicle.name); }
  };
  const [appointmentNote, setAppointmentNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!submissionToEdit) return;
    const data = submissionToEdit;
    setVehicleId(data.vehicleId || defaultVehicle(data.teamId).id); setVehicleName(data.vehicleName || defaultVehicle(data.teamId).name);
    setSelectedSchoolId(data.schoolId); setDocumentNumber(data.documentNumber);
    setSubmissionDate(data.submissionDate); setSubmissionTime(data.submissionTime || '');
    setTeamId(data.teamId); setSubmitterNames(data.submittedByNames?.length ? data.submittedByNames : [data.submittedByName]);
    setTeacherName(data.teacherName || ''); setTeacherPhone(data.teacherPhone || '');
    setTeacherPosition(data.teacherPosition || ''); setTeacherLine(data.teacherLine || '');
    setPreferredContactTime(data.preferredContactTime || '');
    setStatus(data.status || 'DOCUMENT_SUBMITTED');
    setOtherActivityDetails(data.otherActivityDetails || (data.activities && data.activities.length > 0 ? data.activities.join(', ') : ''));
    setNote(data.note || (data.status === 'APPOINTED' ? '' : 'รอติดต่อกลับ'));
    setPhotos(data.photos || []);
    setAppointmentDate(data.appointmentDate || '');
    setAppointmentStart(data.appointmentStartTime || '');
    setAppointmentEnd(data.appointmentEndTime || '');
    setAppointmentNote(data.appointmentNote || '');
  }, [submissionToEdit]);

  // Sync when preselectedSchool changes
  useEffect(() => {
    if (preselectedSchool) {
      setSelectedSchoolId(preselectedSchool.id);
      selectTeam(preselectedSchool.teamId);
      setTeacherName(preselectedSchool.teacherName || '');
      setTeacherPosition(preselectedSchool.teacherPosition || '');
      setTeacherPhone(preselectedSchool.teacherPhone || '');
      setTeacherLine(preselectedSchool.teacherLine || '');
      setPreferredContactTime(preselectedSchool.preferredContactTime || '');
    }
  }, [preselectedSchool, schools]);

  const handleSchoolSelect = (schoolId: string) => {
    setSelectedSchoolId(schoolId);
    if (!schoolId) { setTeacherName(''); setTeacherPhone(''); }
    const target = schools.find((s) => s.id === schoolId);
    if (target) {
      selectTeam(target.teamId);
      setTeacherName(target.teacherName || '');
      setTeacherPosition(target.teacherPosition || '');
      setTeacherPhone(target.teacherPhone || '');
      setTeacherLine(target.teacherLine || '');
      setPreferredContactTime(target.preferredContactTime || '');
    }
  };

  const getTargetSchool = () => schools.find((s) => s.id === selectedSchoolId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submissionTime) { setError('กรุณาระบุเวลายื่นหนังสือ'); return; }
    if (submitterNames.some(name => !name.trim())) { setError('กรุณาระบุชื่ออาจารย์ผู้ยื่นให้ครบทุกคน หรือลบช่องที่ไม่ใช้'); return; }
    const targetSchool = getTargetSchool();
    if (!targetSchool) {
      setError('กรุณาเลือกโรงเรียน');
      return;
    }

    if (status === 'OTHER_ACTIVITY' && !otherActivityDetails.trim()) {
      setError('กรุณาระบุรายละเอียดกิจกรรมอื่นๆ');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const data: Omit<DocumentSubmission, 'id'> = {
        schoolId: targetSchool.id,
        schoolName: targetSchool.schoolName,
        documentNumber,
        vehicleId,
        vehicleName,
        submissionDate,
        submissionTime,
        teamId,
        submittedById: submissionToEdit?.submittedById || currentUser?.id || 'usr_staff',
        submittedByName,
        submittedByNames,
        teacherName,
        teacherPosition: teacherPosition || '',
        teacherPhone: teacherPhone || '',
        teacherLine: teacherLine || '',
        preferredContactTime: preferredContactTime || '',
        status,
        note: note || '',
        photos: photos || [],
        createdAt: submissionToEdit?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      if (status === 'OTHER_ACTIVITY' && otherActivityDetails.trim()) {
        data.otherActivityDetails = otherActivityDetails.trim();
      }
      if (status === 'APPOINTED') {
        if (!currentUser) throw new Error('กรุณาเข้าสู่ระบบ');
        await saveSubmissionAppointment(data, { date: appointmentDate, startTime: appointmentStart, endTime: appointmentEnd, note: appointmentNote }, currentUser, submissionToEdit || undefined);
      } else { await onSave(data); }
      onClose();
    } catch (err: any) {
      setError(err.message || 'บันทึกการยื่นหนังสือไม่สำเร็จ');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Instant Appointment click handler: carries values forward seamlessly
  const handleInstantSchedule = async () => {
    if (!submissionTime) { setError('กรุณาระบุเวลายื่นหนังสือ'); return; }
    if (submitterNames.some(name => !name.trim())) { setError('กรุณาระบุชื่ออาจารย์ผู้ยื่นให้ครบทุกคน หรือลบช่องที่ไม่ใช้'); return; }
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
        vehicleId,
        vehicleName,
        submissionDate,
        submissionTime,
        teamId,
        submittedById: submissionToEdit?.submittedById || currentUser?.id || 'usr_staff',
        submittedByName,
        submittedByNames,
        teacherName,
        teacherPosition,
        teacherPhone,
        teacherLine,
        preferredContactTime,
        status: 'APPOINTED',
        note,
        photos,
        createdAt: submissionToEdit?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      setError('บันทึกการยื่นหนังสือไม่สำเร็จ กรุณาลองอีกครั้ง');
      return;
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

  if (!isOpen) return null;


  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-2xl">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#087CC1]" />
              <span>{submissionToEdit ? 'แก้ไขการยื่นหนังสือ' : 'ยื่นหนังสือ'}</span>
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

          {/* School Picker & Document Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                โรงเรียนเป้าหมาย <span className="text-red-500">*</span>
              </label>
              <SchoolPicker schools={schools} value={selectedSchoolId} onChange={handleSchoolSelect} disabled={isSubmitting || !!submissionToEdit}/>
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
              <label htmlFor="submission-time" className="block text-xs font-semibold text-slate-700 mb-1">เวลายื่นหนังสือ *</label>
              <input id="submission-time" type="time" required value={submissionTime} onChange={e => setSubmissionTime(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                สายการปฏิบัติงาน
              </label>
              <select
                value={teamId}
                onChange={(e) => selectTeam(e.target.value as TeamId)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
              >
                <option value="team1">อุตรดิตถ์ (สาย 1)</option>
                <option value="team2">สุโขทัย (สาย 2)</option>
              </select>
            </div>
            <div className="sm:col-span-3 space-y-2">
              <label className="block text-xs font-semibold text-slate-700">อาจารย์ผู้ยื่น (เพิ่มได้หลายคน) *</label>
              {submitterNames.map((name, index) => <div key={index} className="flex flex-wrap sm:flex-nowrap gap-2">
                <select aria-label={`เลือกอาจารย์จากระบบคนที่ ${index + 1}`} disabled={isSubmitting} value={teacherChoices.includes(name) ? name : ''} onChange={e => setSubmitterNames(names => names.map((n, i) => i === index ? e.target.value : n))} className="w-full sm:w-1/2 px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm">
                  <option value="">พิมพ์ชื่อเอง / เลือกจากระบบ</option>
                  {teacherChoices.map(choice => <option key={choice} value={choice}>{choice}</option>)}
                </select>
                <input type="text" required aria-label={`อาจารย์ผู้ยื่นคนที่ ${index + 1}`} value={name} disabled={isSubmitting} placeholder="ชื่อ–นามสกุลอาจารย์"
                  onChange={e => setSubmitterNames(names => names.map((n, i) => i === index ? e.target.value : n))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm" />
                {submitterNames.length > 1 && <button type="button" disabled={isSubmitting} aria-label={`ลบอาจารย์คนที่ ${index + 1}`} onClick={() => setSubmitterNames(names => names.filter((_, i) => i !== index))} className="px-3 text-sm text-red-600">ลบ</button>}
              </div>)}
              <button type="button" disabled={isSubmitting} onClick={() => setSubmitterNames(names => [...names, ''])} className="text-sm font-semibold text-sky-700">+ เพิ่มอาจารย์ผู้ยื่น</button>
              <p className="text-xs text-slate-500">เลือกชื่อจากระบบ หรือพิมพ์ชื่อเพิ่มเติมในช่องชื่อ รายชื่อทุกคนจะแสดงในรายงานสรุป</p>
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">ยานพาหนะที่ใช้ยื่นหนังสือ</label>
            <TripVehiclePicker value={vehicleId} name={vehicleName} onChange={(id, name) => { setVehicleId(id); setVehicleName(name); }} disabled={isSubmitting} />
          </div>

          {/* Guidance Teacher Information (Auto-updates School!) */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#075A9C] uppercase tracking-wider">
                ข้อมูลครูแนะแนวที่ติดต่อ (จะอัปเดตลงฐานข้อมูลโรงเรียนอัตโนมัติ)
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-3">
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
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                disabled={!!submissionToEdit?.appointmentId}
                onChange={(e) => {
                  const next = e.target.value as PostSubmissionStatus;
                  setStatus(next);
                  if (next === 'DOCUMENT_SUBMITTED' && !note.trim()) setNote('รอติดต่อกลับ');
                  else if (next === 'OTHER_ACTIVITY' && note === 'รอติดต่อกลับ') setNote('');
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#087CC1]"
              >
                <option value="DOCUMENT_SUBMITTED">ยื่นหนังสือแล้ว</option>
                <option value="OTHER_ACTIVITY">กิจกรรมอื่นๆ</option>
                {submissionToEdit?.status && submissionToEdit.status !== 'DOCUMENT_SUBMITTED' && submissionToEdit.status !== 'OTHER_ACTIVITY' && (
                  <option value={submissionToEdit.status}>
                    {submissionToEdit.status === 'APPOINTED' ? 'นัดหมายแนะแนวแล้ว (ระบุวันเวลานัด)' : submissionToEdit.status}
                  </option>
                )}
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

            {/* ช่องกรอกระบุกิจกรรมอื่นๆ เมื่อเลือก กิจกรรมอื่นๆ */}
            {status === 'OTHER_ACTIVITY' && (
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ระบุกิจกรรมอื่นๆ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={otherActivityDetails}
                  onChange={(e) => setOtherActivityDetails(e.target.value)}
                  placeholder="เช่น เข้าร่วมกิจกรรมหน้าเสาธง, นิทรรศการสัญจร, แนะแนวนักเรียนทันที"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#087CC1]"
                />
              </div>
            )}
          </div>

          {status === 'APPOINTED' && <section className="p-4 rounded-xl border border-sky-200 bg-sky-50 space-y-3">
            <h3 className="text-sm font-semibold text-sky-800">วันและเวลานัดแนะแนว</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="text-xs font-semibold">วันที่นัด *<input aria-label="วันที่นัดแนะแนว" type="date" required value={appointmentDate} onChange={e => setAppointmentDate(e.target.value)} className="mt-1 w-full p-2 rounded-lg border border-slate-300" /></label>
              <label className="text-xs font-semibold">เวลาเริ่ม *<input aria-label="เวลาเริ่มนัดแนะแนว" type="time" required value={appointmentStart} onChange={e => setAppointmentStart(e.target.value)} className="mt-1 w-full p-2 rounded-lg border border-slate-300" /></label>
              <label className="text-xs font-semibold">เวลาสิ้นสุด *<input aria-label="เวลาสิ้นสุดนัดแนะแนว" type="time" required value={appointmentEnd} onChange={e => setAppointmentEnd(e.target.value)} className="mt-1 w-full p-2 rounded-lg border border-slate-300" /></label>
            </div>
            <label className="block text-xs font-semibold">รายละเอียดนัดหมาย / สถานที่<textarea aria-label="รายละเอียดนัดหมาย" value={appointmentNote} onChange={e => setAppointmentNote(e.target.value)} placeholder="เช่น ห้องประชุม แนะแนวนักเรียน ม.3" className="mt-1 w-full p-2 rounded-lg border border-slate-300" /></label>
            <p className="text-xs text-slate-600">บันทึกการยื่นหนังสือและนัดหมายลงปฏิทินพร้อมกัน ผู้รับผิดชอบ: {currentUser?.displayName}</p>
          </section>}

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
              <span>{isSubmitting ? 'กำลังบันทึก...' : status === 'APPOINTED' ? 'บันทึกการยื่นหนังสือและนัดหมาย' : 'บันทึกการยื่นหนังสือ'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
