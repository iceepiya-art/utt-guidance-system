import { SchoolPicker } from '../common/SchoolPicker';
import { ThaiDatePicker } from '../common/ThaiDatePicker';
import React, { useState, useEffect, useRef } from 'react';
import { X, Calendar, Clock, AlertTriangle, Bell, Car, Users, Save, Check, FileText } from 'lucide-react';
import { School, Appointment, TeamId, AppointmentStatus, DocumentSubmission } from '../../types';
import { formatThaiShortDate, getTodayISO } from '../../utils/dateUtils';
import { checkAppointmentConflict } from '../../firebase/dbService';
import { getSelectablePersonnel, isEligiblePersonnel, resolveResponsibleCounselor } from '../../utils/personnelSelector';
import { getDefaultVehicleForPersonnel } from '../../utils/vehicleMapping';
import { isValidTimeRange, isTimeRangeValid } from '../../utils/appointmentUtils';
import { formatSchoolDisplayName } from '../../utils/schoolStatus';

interface AppointmentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  schools: School[];
  submissions?: DocumentSubmission[];
  prefilledData?: {
    submissionId?: string;
    schoolId?: string;
    schoolName?: string;
    teacherName?: string;
    teacherPhone?: string;
    teacherLine?: string;
    teamId?: TeamId;
    date?: string;
    startTime?: string;
    endTime?: string;
    vehicleId?: string;
    vehicleName?: string;
  } | null;
  appointmentToEdit?: Appointment | null;
  onSave: (apptData: Omit<Appointment, 'id'>) => Promise<string | void>;
}

import { TripVehiclePicker } from '../common/TripVehiclePicker';
import { useAuth } from '../../context/AuthContext';

export const AppointmentFormModal: React.FC<AppointmentFormModalProps> = ({
  isOpen,
  onClose,
  schools,
  submissions = [],
  prefilledData,
  appointmentToEdit,
  onSave,
}) => {
  const { users = [], currentUser } = useAuth();

  const selectablePersonnel = React.useMemo(() => getSelectablePersonnel(users), [users]);

  const counselors = React.useMemo(() => {
    return selectablePersonnel.map((p) => ({
      id: p.id,
      name: p.displayName,
      teamId: (p.teamId || 'team1') as TeamId,
      phone: p.phone,
      label: p.label,
    }));
  }, [selectablePersonnel]);

  const availableSubmissions = React.useMemo(
    () => submissions.filter((sub) =>
      !sub.fieldTripId
      && (!sub.appointmentId || sub.id === appointmentToEdit?.submissionId || sub.id === prefilledData?.submissionId)
      && sub.status !== 'GUIDANCE_COMPLETED'
      && sub.status !== 'OTHER_ACTIVITY'
    ),
    [submissions, appointmentToEdit?.submissionId, prefilledData?.submissionId]
  );
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('');
  const [submissionId, setSubmissionId] = useState<string>('');
  const defaultCounselor = React.useMemo(() => {
    if (currentUser && isEligiblePersonnel(currentUser)) {
      return { id: currentUser.id, name: currentUser.displayName || 'อ.ประชา กัลปนารถ' };
    }
    const eligible = counselors[0];
    return eligible ? { id: eligible.id, name: eligible.name } : { id: 'usr_admin', name: 'อ.ประชา กัลปนารถ' };
  }, [currentUser, counselors]);

  const [date, setDate] = useState<string>(getTodayISO());
  const [startTime, setStartTime] = useState<string>('09:00');
  const [endTime, setEndTime] = useState<string>('');
  const [teamId, setTeamId] = useState<TeamId>('team1');
  const [counselorName, setCounselorName] = useState<string>(defaultCounselor.name);
  const [counselorId, setCounselorId] = useState<string>(defaultCounselor.id);
  const [teamMemberNames, setTeamMemberNames] = useState<string>('');
  const [vehicleId, setVehicleId] = useState<string>('');
  const [vehicleName, setVehicleName] = useState<string>('');
  const [teacherName, setTeacherName] = useState<string>('');
  const [teacherPhone, setTeacherPhone] = useState<string>('');
  const [status, setStatus] = useState<AppointmentStatus>('CONFIRMED');
  const [note, setNote] = useState<string>('');

  // Email Reminder options
  const [reminderEnabled, setReminderEnabled] = useState<boolean>(true);
  const [reminderMinutes, setReminderMinutes] = useState<number>(1440); // default 1 day = 1440 min

  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (appointmentToEdit) {
      setSubmissionId(appointmentToEdit.submissionId || '');
      setSelectedSchoolId(appointmentToEdit.schoolId);
      setDate(appointmentToEdit.date);
      setStartTime(appointmentToEdit.startTime || '09:00');
      setEndTime(appointmentToEdit.endTime || '');
      setTeamId(appointmentToEdit.teamId);
      const resolved = resolveResponsibleCounselor(
        appointmentToEdit.counselorId,
        appointmentToEdit.counselorName,
        selectablePersonnel
      );
      setCounselorName(resolved.name);
      setCounselorId(resolved.id);
      setTeamMemberNames(appointmentToEdit.teamMemberNames || '');
      // Priority: 1. Stored vehicle of record, 2. Counselor default vehicle, 3. Empty
      const resolvedVeh = appointmentToEdit.vehicleId
        ? { id: appointmentToEdit.vehicleId, name: appointmentToEdit.vehicleName || '' }
        : getDefaultVehicleForPersonnel(resolved.id, resolved.name);
      setVehicleId(resolvedVeh?.id || '');
      setVehicleName(resolvedVeh?.name || '');
      setTeacherName(appointmentToEdit.teacherName || '');
      setTeacherPhone(appointmentToEdit.teacherPhone || '');
      setStatus(appointmentToEdit.status);
      setNote(appointmentToEdit.note || '');
      if (appointmentToEdit.reminders && appointmentToEdit.reminders.length > 0) {
        setReminderEnabled(appointmentToEdit.reminders[0].enabled);
        setReminderMinutes(appointmentToEdit.reminders[0].minutesBefore);
      }
    } else if (prefilledData) {
      if (prefilledData.submissionId) {
        const submission = submissions.find((sub) => sub.id === prefilledData.submissionId);
        if (submission) applySubmission(submission);
        else setSubmissionId(prefilledData.submissionId);
      }
      if (prefilledData.schoolId) setSelectedSchoolId(prefilledData.schoolId);
      if (prefilledData.teamId) setTeamId(prefilledData.teamId);
      if (prefilledData.teacherName) setTeacherName(prefilledData.teacherName);
      if (prefilledData.teacherPhone) setTeacherPhone(prefilledData.teacherPhone);
      if (prefilledData.date) setDate(prefilledData.date);
      if (prefilledData.startTime) setStartTime(prefilledData.startTime);
      setEndTime(prefilledData.endTime || '');
      const pVeh = prefilledData.vehicleId
        ? { id: prefilledData.vehicleId, name: prefilledData.vehicleName || '' }
        : getDefaultVehicleForPersonnel(counselorId, counselorName);
      setVehicleId(pVeh?.id || '');
      setVehicleName(pVeh?.name || '');
    } else {
      setSubmissionId('');
      setSelectedSchoolId('');
      setDate(getTodayISO());
      setStartTime('09:00');
      setEndTime('');
      setTeamId('team1');
      setCounselorName(defaultCounselor.name);
      setCounselorId(defaultCounselor.id);
      const initVeh = getDefaultVehicleForPersonnel(defaultCounselor.id, defaultCounselor.name);
      setVehicleId(initVeh?.id || '');
      setVehicleName(initVeh?.name || '');
      setTeacherName('');
      setTeacherPhone('');
      setStatus('CONFIRMED');
      setNote('');
    }
  }, [isOpen, appointmentToEdit?.id, prefilledData, schools, submissions, defaultCounselor]);

  const defaultCounselorForTeam = (t: TeamId) => {
    const match = counselors.find((c) => c.teamId === t);
    return (
      match ||
      (t === 'team2'
        ? { id: 'usr_staff2', name: 'อ.ปิยะ สีตาชัย', teamId: 'team2' as TeamId }
        : { id: 'usr_admin', name: 'อ.ประชา กัลปนารถ', teamId: 'team1' as TeamId })
    );
  };

  const handleTeamChange = (nextTeam: TeamId) => {
    setTeamId(nextTeam);

    // If current counselor doesn't belong to this team, switch to team's default counselor
    const currCounselor = counselors.find((c) => c.name === counselorName || c.id === counselorId);
    if (!currCounselor || currCounselor.teamId !== nextTeam) {
      const defC = defaultCounselorForTeam(nextTeam);
      setCounselorId(defC.id);
      setCounselorName(defC.name);
      // Auto-set vehicle to default of newly assigned counselor
      const defVeh = getDefaultVehicleForPersonnel(defC.id, defC.name);
      setVehicleId(defVeh?.id || '');
      setVehicleName(defVeh?.name || '');
    }
  };

  const applySubmission = (submission: DocumentSubmission) => {
    setSubmissionId(submission.id);
    setSelectedSchoolId(submission.schoolId);
    setTeamId(submission.teamId);

    // Auto-match counselor from submitter if possible
    const submitterName =
      submission.submittedByName ||
      (submission.submittedByNames && submission.submittedByNames[0]) ||
      '';
    const cleanSub = submitterName.replace(/^(อ\.|อาจารย์|นาย|นาง|นางสาว)\s*/, '').trim().toLowerCase();
    const matchedCounselor =
      counselors.find((c) => c.id === submission.submittedById) ||
      counselors.find((c) => cleanSub && c.name.toLowerCase().includes(cleanSub)) ||
      defaultCounselorForTeam(submission.teamId);

    setCounselorId(matchedCounselor.id);
    setCounselorName(matchedCounselor.name);

    // Priority: Stored vehicle in submission, or counselor default vehicle
    const subVeh = submission.vehicleId
      ? { id: submission.vehicleId, name: submission.vehicleName || '' }
      : getDefaultVehicleForPersonnel(matchedCounselor.id, matchedCounselor.name);
    setVehicleId(subVeh?.id || '');
    setVehicleName(subVeh?.name || '');

    setTeacherName(submission.teacherName || '');
    setTeacherPhone(submission.teacherPhone || '');
    // Decouple: do NOT copy submittedByNames to appointment teamMemberNames automatically
    // If editing an existing appointment, preserve its existing teamMemberNames
    if (!appointmentToEdit) {
      setTeamMemberNames('');
    }
    setNote(submission.appointmentNote || submission.note || '');
    if (submission.appointmentDate) setDate(submission.appointmentDate);
    if (submission.appointmentStartTime) setStartTime(submission.appointmentStartTime);
    if (submission.appointmentEndTime) setEndTime(submission.appointmentEndTime);
  };

  const handleSchoolSelect = (schoolId: string) => {
    setSelectedSchoolId(schoolId);
    if (!schoolId) {
      if (!appointmentToEdit) {
        setSubmissionId('');
      }
      setTeacherName('');
      setTeacherPhone('');
      return;
    }

    const target = schools.find((s) => s.id === schoolId);
    if (target) {
      setTeamId(target.teamId);
      const defC = defaultCounselorForTeam(target.teamId);
      setCounselorId(defC.id);
      setCounselorName(defC.name);
      setTeacherName(target.teacherName || target.contactPerson || '');
      setTeacherPhone(target.teacherPhone || target.contactPhone || '');
    }
  };

  const handleCounselorChange = (cName: string) => {
    setCounselorName(cName);
    const found = counselors.find((c) => c.name === cName || c.id === cName);
    if (found) {
      setCounselorId(found.id);
      setCounselorName(found.name);
      if (found.teamId !== teamId) {
        setTeamId(found.teamId);
      }
      // Business Rule: Auto default vehicle according to responsible personnel
      const defVeh = getDefaultVehicleForPersonnel(found.id, found.name);
      setVehicleId(defVeh?.id || '');
      setVehicleName(defVeh?.name || '');
    }
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
        vehicleId,
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

    if (!startTime) {
      setError('กรุณาระบุเวลาเริ่มต้น');
      return;
    }

    if (!endTime) {
      setError('กรุณาระบุเวลาสิ้นสุด');
      return;
    }

    if (!isValidTimeRange(startTime, endTime)) {
      setError('เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น');
      return;
    }

    setError(null);
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    try {
      const targetSubmissionId = appointmentToEdit
        ? (appointmentToEdit.submissionId || submissionId || undefined)
        : (submissionId || undefined);

      await onSave({
        submissionId: targetSubmissionId,
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
        source: appointmentToEdit
          ? (appointmentToEdit.source || (targetSubmissionId ? 'DOCUMENT_SUBMISSION' : 'MANUAL'))
          : (targetSubmissionId ? 'DOCUMENT_SUBMISSION' : 'MANUAL'),
        note,
        academicYear: appointmentToEdit?.academicYear,
        photos: appointmentToEdit?.photos || [],
        reminders: [
          {
            type: 'email',
            minutesBefore: reminderMinutes,
            enabled: reminderEnabled,
          },
        ],
        createdAt: appointmentToEdit?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'บันทึกนัดหมายไม่สำเร็จ');
    } finally {
      isSubmittingRef.current = false;
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

          {/* Submission reference */}
          {appointmentToEdit ? (
            appointmentToEdit.submissionId ? (
              <div className="p-4 bg-sky-50/70 rounded-xl border border-sky-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-sky-900 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#087CC1]" />
                    อ้างอิงการยื่นหนังสือ
                  </span>
                  <span className="text-[11px] font-semibold text-sky-700 bg-sky-100/80 px-2.5 py-0.5 rounded-full border border-sky-200">
                    เชื่อมโยงแล้ว (Read-only)
                  </span>
                </div>
                {(() => {
                  const linked = submissions.find((s) => s.id === appointmentToEdit.submissionId);
                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs pt-1">
                      <div className="rounded-lg bg-white border border-sky-100 p-2.5 shadow-2xs">
                        <div className="text-slate-400 text-[11px] font-medium">โรงเรียน</div>
                        <div className="font-bold text-slate-800 mt-0.5 truncate" title={linked?.schoolName || appointmentToEdit.schoolName}>
                          {formatSchoolDisplayName(linked?.schoolName || appointmentToEdit.schoolName)}
                        </div>
                      </div>
                      <div className="rounded-lg bg-white border border-sky-100 p-2.5 shadow-2xs">
                        <div className="text-slate-400 text-[11px] font-medium">เลขที่หนังสือ</div>
                        <div className="font-semibold text-slate-800 mt-0.5 truncate" title={linked?.documentNumber || 'ไม่ระบุเลขที่หนังสือ'}>
                          {linked?.documentNumber || 'ไม่ระบุเลขที่หนังสือ'}
                        </div>
                      </div>
                      <div className="rounded-lg bg-white border border-sky-100 p-2.5 shadow-2xs">
                        <div className="text-slate-400 text-[11px] font-medium">วันที่ยื่นหนังสือ</div>
                        <div className="font-semibold text-slate-800 mt-0.5">
                          {linked?.submissionDate ? formatThaiShortDate(linked?.submissionDate) : '-'}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                  <span className="font-medium">รายการนัดหมายเดิม (ไม่ได้เชื่อมโยงกับรายการยื่นหนังสือ)</span>
                </div>
                <span className="text-[11px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                  แก้ไขข้อมูลนัดหมายได้โดยไม่ต้องระบุการยื่นหนังสือ
                </span>
              </div>
            )
          ) : (
            <div className="p-4 bg-sky-50/70 rounded-xl border border-sky-200 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  อ้างอิงรายการยื่นหนังสือ
                </label>
                <select
                  value={submissionId}
                  disabled={isSubmitting}
                  onChange={(e) => {
                    const submission = submissions.find((sub) => sub.id === e.target.value);
                    if (submission) applySubmission(submission);
                    else setSubmissionId('');
                  }}
                  className="w-full px-3 py-2 bg-white border border-sky-200 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-[#087CC1] disabled:bg-slate-100"
                >
                  <option value="">— เลือกรายการยื่นหนังสือเดิม (ถ้ามี) —</option>
                  {availableSubmissions.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {formatThaiShortDate(sub.submissionDate)} · {formatSchoolDisplayName(sub.schoolName)} · {sub.documentNumber || 'ไม่มีเลขหนังสือ'}
                    </option>
                  ))}
                  {submissionId && !availableSubmissions.some((sub) => sub.id === submissionId) && (
                    <option value={submissionId}>
                      {formatSchoolDisplayName(prefilledData?.schoolName) || 'รายการยื่นหนังสือที่เชื่อมไว้'}
                    </option>
                  )}
                </select>
              </div>

              {submissionId && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div className="rounded-lg bg-white border border-sky-100 p-2">
                    <div className="text-slate-500">โรงเรียน</div>
                    <div className="font-semibold text-slate-800">{formatSchoolDisplayName(schools.find((s) => s.id === selectedSchoolId)?.schoolName) || '-'}</div>
                  </div>
                  <div className="rounded-lg bg-white border border-sky-100 p-2">
                    <div className="text-slate-500">ครูแนะแนว</div>
                    <div className="font-semibold text-slate-800">{teacherName || '-'}{teacherPhone ? ` · ${teacherPhone}` : ''}</div>
                  </div>
                  <div className="rounded-lg bg-white border border-sky-100 p-2">
                    <div className="text-slate-500">สาย / รถ</div>
                    <div className="font-semibold text-slate-800">
                      {teamId === 'team1' ? 'อุตรดิตถ์' : 'สุโขทัย'} · {vehicleName || '-'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* School selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              โรงเรียนเป้าหมาย <span className="text-red-500">*</span>
            </label>
            <SchoolPicker
              schools={schools}
              value={selectedSchoolId}
              onChange={handleSchoolSelect}
              disabled={isSubmitting || (!!appointmentToEdit && !!appointmentToEdit.submissionId) || (!appointmentToEdit && !!submissionId)}
            />
          </div>

          {/* Date & Time slots */}
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <ThaiDatePicker
                  label="วันที่นัดหมาย"
                  value={date}
                  onChange={setDate}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  เวลาเริ่มต้น <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className={`w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs transition-colors ${
                    startTime && endTime && !isValidTimeRange(startTime, endTime)
                      ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
                      : 'border-slate-300'
                  }`}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  เวลาสิ้นสุด <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className={`w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs transition-colors ${
                    startTime && endTime && !isValidTimeRange(startTime, endTime)
                      ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
                      : 'border-slate-300'
                  }`}
                  required
                />
              </div>
            </div>
            {startTime && endTime && !isValidTimeRange(startTime, endTime) && (
              <p className="text-xs text-red-600 font-medium mt-1.5 flex items-center gap-1">
                <span>⚠️ เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น (ช่วงเวลาปัจจุบัน: {startTime} - {endTime} น. ไม่ถูกต้อง)</span>
              </p>
            )}
          </div>

          {/* Team & Counselor & Vehicle */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                สายปฏิบัติงาน
              </label>
              <select
                value={teamId}
                onChange={(e) => handleTeamChange(e.target.value as TeamId)}
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
                {appointmentToEdit && counselorName && !counselors.some(c => c.name === counselorName) && (
                  <option value={counselorName}>{counselorName} (บันทึกเดิม)</option>
                )}
                {counselors.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ยานพาหนะ
              </label>
              <TripVehiclePicker
                value={vehicleId}
                name={vehicleName}
                onChange={(id, name) => {
                  setVehicleId(id);
                  setVehicleName(name);
                }}
                disabled={isSubmitting}
              />
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
