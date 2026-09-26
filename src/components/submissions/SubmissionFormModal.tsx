import { TripVehiclePicker } from '../common/TripVehiclePicker';
import { saveSubmissionAppointment } from '../../firebase/submissionAppointmentService';
import { SchoolPicker } from '../common/SchoolPicker';
import { ThaiDatePicker } from '../common/ThaiDatePicker';
import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Calendar, Clock, FileText, CalendarCheck, AlertCircle, Lock } from 'lucide-react';
import { School, DocumentSubmission, PostSubmissionStatus, TeamId, PhotoItem } from '../../types';
import { PhotoUploader } from '../common/PhotoUploader';
import { getTodayISO } from '../../utils/dateUtils';
import { useAuth } from '../../context/AuthContext';
import {
  getSelectablePersonnel,
  getDefaultSubmitterNames,
  findMatchingPersonnel,
  resolvePersonnelDisplayName,
  cleanTeacherName,
  SelectablePersonnel,
} from '../../utils/personnelSelector';
import { isNormalGuidanceActivity, getSubmissionEditStatus } from '../../utils/submissionUtils';
import { isTimeRangeValid } from '../../utils/appointmentUtils';
import { resolveSchoolRelation, formatSchoolDisplayName, getCleanSchoolCode } from '../../utils/schoolStatus';

export const normalizeTeacherName = (name: string, choices: string[]): string => {
  if (!name || !name.trim()) return '';
  const trimmed = name.trim();
  if (choices.includes(trimmed)) return trimmed;

  const targetClean = cleanTeacherName(trimmed);
  if (!targetClean) return trimmed;

  const matched = choices.find(c => {
    const cClean = cleanTeacherName(c);
    return (
      cClean === targetClean ||
      cClean.startsWith(targetClean) ||
      targetClean.startsWith(cClean) ||
      cClean.includes(targetClean) ||
      targetClean.includes(cClean)
    );
  });

  return matched || trimmed;
};

interface SubmissionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  schools: School[];
  preselectedSchool?: School | null;
  submissionToEdit?: DocumentSubmission | null;
  onSave: (data: Omit<DocumentSubmission, 'id'>) => Promise<string>;
  onOpenInstantAppointment: (submissionData: {
    submissionId?: string;
    schoolId: string;
    schoolName: string;
    teacherName: string;
    teacherPhone: string;
    teacherLine?: string;
    teamId: TeamId;
    vehicleId?: string;
    vehicleName?: string;
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
  const { currentUser, users = [] } = useAuth();

  const selectablePersonnel = React.useMemo(() => {
    return getSelectablePersonnel(users);
  }, [users]);

  const teacherChoices = React.useMemo(() => {
    return selectablePersonnel.map(p => p.displayName);
  }, [selectablePersonnel]);

  const defaultSubmitters = (team: TeamId): string[] => {
    return getDefaultSubmitterNames(team, selectablePersonnel);
  };

  const [selectedSchoolId, setSelectedSchoolId] = useState<string>(preselectedSchool?.id || '');
  const [documentNumber, setDocumentNumber] = useState<string>('วท.อต. /2569');
  const [submissionDate, setSubmissionDate] = useState<string>(getTodayISO());
  const [submissionTime, setSubmissionTime] = useState(() => new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit' }));
  const [teamId, setTeamId] = useState<TeamId>(preselectedSchool?.teamId || 'team1');
  const [submitterNames, setSubmitterNames] = useState<string[]>(() =>
    defaultSubmitters(preselectedSchool?.teamId || 'team1')
  );
  const [customIndices, setCustomIndices] = useState<Record<number, boolean>>({});
  const submittedByNames = [...new Set<string>(submitterNames.map(name => name.trim()).filter(Boolean))];
  const submittedByName = submittedByNames.join(', ');

  // Guidance Teacher Contacts
  const [teacherName, setTeacherName] = useState<string>('');
  const [teacherPosition, setTeacherPosition] = useState<string>('');
  const [teacherPhone, setTeacherPhone] = useState<string>('');
  const [teacherLine, setTeacherLine] = useState<string>('');
  const [preferredContactTime, setPreferredContactTime] = useState<string>('');

  const [status, setStatus] = useState<PostSubmissionStatus>('WAITING_APPOINTMENT');
  const [otherActivityDetails, setOtherActivityDetails] = useState<string>('');
  const [note, setNote] = useState<string>('รอติดต่อกลับ');
  const [photos, setPhotos] = useState<PhotoItem[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentStart, setAppointmentStart] = useState('');
  const [appointmentEnd, setAppointmentEnd] = useState('');
  const [vehicleId, setVehicleId] = useState<string>('');
  const [vehicleName, setVehicleName] = useState<string>('');
  const selectTeam = (nextTeam: TeamId) => {
    setTeamId(nextTeam);
    if (!submissionToEdit) {
      const newRequired = defaultSubmitters(nextTeam);
      const currentRequired = defaultSubmitters(teamId);
      const additional = submitterNames.filter(n => !currentRequired.includes(n));
      setSubmitterNames([...newRequired, ...additional]);
      setCustomIndices({});
    }
  };
  const [appointmentNote, setAppointmentNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!submissionToEdit) return;
    const data = submissionToEdit;
    setVehicleId(data.vehicleId || '');
    setVehicleName(data.vehicleName || '');
    setSelectedSchoolId(resolveSchoolRelation(data.schoolId, schools)?.id || data.schoolId);
    setDocumentNumber(data.documentNumber);
    setSubmissionDate(data.submissionDate);
    setSubmissionTime(data.submissionTime || '');
    setTeamId(data.teamId);
    const rawNames: string[] =
      data.submittedByNames && data.submittedByNames.length > 0
        ? data.submittedByNames
        : (data.submittedByName ? data.submittedByName.split(/[,+]/).map(s => s.trim()).filter(Boolean) : ['']);

    // Resolve known verified legacy aliases directly to standard profile name without modifying count or adding extra people
    const resolvedNames = rawNames.map(name => {
      const resolved = resolvePersonnelDisplayName(name, selectablePersonnel);
      return resolved.matched ? resolved.displayName : name;
    });
    setSubmitterNames(resolvedNames.length > 0 ? resolvedNames : ['']);
    setCustomIndices({});
    setTeacherName(data.teacherName || ''); setTeacherPhone(data.teacherPhone || '');
    setTeacherPosition(data.teacherPosition || ''); setTeacherLine(data.teacherLine || '');
    setPreferredContactTime(data.preferredContactTime || '');
    const editStatus = getSubmissionEditStatus(data);
    setStatus(editStatus);
    setOtherActivityDetails(data.otherActivityDetails || (data.activities && data.activities.length > 0 ? data.activities.join(', ') : ''));
    setNote(data.note || (editStatus === 'APPOINTED' || editStatus === 'OTHER_ACTIVITY' ? '' : 'รอติดต่อกลับ'));
    setPhotos(data.photos || []);
    setAppointmentDate(data.appointmentDate || '');
    setAppointmentStart(data.appointmentStartTime || '');
    setAppointmentEnd(data.appointmentEndTime || '');
    setAppointmentNote(data.appointmentNote || '');
  }, [submissionToEdit, selectablePersonnel]);

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

  const getTargetSchool = (): School | undefined => {
    // 1. exact submission.schoolId === school.id
    const fromId = schools.find((s) => s.id === selectedSchoolId);
    if (fromId) return fromId;

    // 2. exact UNIQUE submission.schoolId === school.schoolId
    if (selectedSchoolId) {
      const fromSchoolId = schools.filter((s) => s.schoolId === selectedSchoolId);
      if (fromSchoolId.length === 1) return fromSchoolId[0];
    }

    if (submissionToEdit) {
      // Check if submissionToEdit.schoolId matches unique school.schoolId
      if (submissionToEdit.schoolId) {
        const fromSchoolId = schools.filter((s) => s.schoolId === submissionToEdit.schoolId);
        if (fromSchoolId.length === 1) return fromSchoolId[0];
      }
      // 3. Fallback: preserve original record identity without guessing or fuzzy matching
      return {
        id: submissionToEdit.schoolId || '',
        schoolName: submissionToEdit.schoolName,
        teamId: submissionToEdit.teamId,
      } as School;
    }
    return undefined;
  };

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
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
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
        ...(submissionToEdit?.appointmentId ? { appointmentId: submissionToEdit.appointmentId } : {}),
        ...(submissionToEdit?.fieldTripId ? { fieldTripId: submissionToEdit.fieldTripId } : {}),
        createdAt: submissionToEdit?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      if (status === 'OTHER_ACTIVITY' && otherActivityDetails.trim()) {
        data.otherActivityDetails = otherActivityDetails.trim();
      } else {
        data.otherActivityDetails = '';
      }
      if (status === 'APPOINTED') {
        if (!isTimeRangeValid(appointmentStart, appointmentEnd)) {
          setError('เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่มต้น');
          setIsSubmitting(false);
          isSubmittingRef.current = false;
          return;
        }
        if (!currentUser) throw new Error('กรุณาเข้าสู่ระบบ');
        await saveSubmissionAppointment(data, { date: appointmentDate, startTime: appointmentStart, endTime: appointmentEnd, note: appointmentNote }, currentUser, submissionToEdit || undefined);
      } else { await onSave(data); }
      onClose();
    } catch (err: any) {
      setError(err.message || 'บันทึกการยื่นหนังสือไม่สำเร็จ');
    } finally {
      isSubmittingRef.current = false;
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
    let savedSubmissionId = submissionToEdit?.id;
    try {
      savedSubmissionId = await onSave({
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
      submissionId: savedSubmissionId,
      schoolId: targetSchool.id,
      schoolName: targetSchool.schoolName,
      teacherName,
      teacherPhone,
      teacherLine,
      teamId,
      vehicleId,
      vehicleName,
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
              {submissionToEdit ? (() => {
                const targetSchool = getTargetSchool();
                const cleanSchoolCode = getCleanSchoolCode(targetSchool?.schoolId) || getCleanSchoolCode(submissionToEdit.schoolId);
                const displaySchoolName = formatSchoolDisplayName(targetSchool?.schoolName || submissionToEdit.schoolName);
                const districtName = targetSchool?.district?.trim();
                const displayDistrict = districtName ? `อำเภอ${districtName.replace(/^อำเภอ/, '')}` : null;

                return (
                  <div className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-xl text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        {displaySchoolName}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-100 text-sky-800">
                        {submissionToEdit.teamId === 'team2' ? 'สาย 2: สุโขทัย' : 'สาย 1: อุตรดิตถ์'}
                      </span>
                    </div>
                    {(displayDistrict || cleanSchoolCode) && (
                      <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                        {displayDistrict && <span>{displayDistrict}</span>}
                        {cleanSchoolCode && (
                          <span className="font-mono text-[10px] text-slate-400">
                            รหัส: {cleanSchoolCode}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })() : (
                <SchoolPicker
                  schools={schools}
                  value={selectedSchoolId}
                  onChange={handleSchoolSelect}
                  disabled={isSubmitting}
                />
              )}
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
              <ThaiDatePicker
                label="วันที่ยื่น"
                value={submissionDate}
                onChange={setSubmissionDate}
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
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700">
                  อาจารย์ผู้ยื่น (เลือกจากระบบ / เพิ่มได้หลายคน) *
                </label>
                <span className="text-xs text-slate-500">
                  บุคลากรในระบบ ({selectablePersonnel.length} ท่าน)
                </span>
              </div>

              <div className="space-y-2">
                {submitterNames.map((name, index) => {
                  const isCustom = !!customIndices[index];
                  const showCurrentAsOption = !isCustom && name && !selectablePersonnel.some(p => p.displayName === name);

                  return (
                    <div key={index} className="flex items-start gap-2">
                      {isCustom ? (
                        <div className="flex-1 space-y-1.5">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              required
                              aria-label={`อาจารย์ผู้ยื่นคนที่ ${index + 1}`}
                              value={name}
                              disabled={isSubmitting}
                              placeholder="พิมพ์ชื่อ–นามสกุลอาจารย์"
                              onChange={e =>
                                setSubmitterNames(names =>
                                  names.map((n, i) => (i === index ? e.target.value : n))
                                )
                              }
                              className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#075A9C]"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setCustomIndices(prev => ({ ...prev, [index]: false }));
                                setSubmitterNames(names =>
                                  names.map((n, i) => (i === index ? (teacherChoices[0] || '') : n))
                                );
                              }}
                              className="px-3 py-1.5 text-xs text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg whitespace-nowrap font-medium transition-colors cursor-pointer"
                            >
                              เลือกจากระบบ
                            </button>
                          </div>
                          {(() => {
                            const trimmed = name.trim();
                            if (!trimmed) return null;
                            const matched = findMatchingPersonnel(trimmed, selectablePersonnel);
                            if (matched && matched.displayName !== trimmed) {
                              return (
                                <div className="flex items-center justify-between text-[11px] bg-sky-50 text-sky-800 px-2.5 py-1.5 rounded-lg border border-sky-200">
                                  <span>💡 ในระบบมีอาจารย์ <b>{matched.displayName}</b> ({matched.secondaryText})</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCustomIndices(prev => ({ ...prev, [index]: false }));
                                      setSubmitterNames(names =>
                                        names.map((n, i) => (i === index ? matched.displayName : n))
                                      );
                                    }}
                                    className="font-bold underline text-[#075A9C] hover:text-[#06487c] ml-2 shrink-0 cursor-pointer"
                                  >
                                    ใช้ชื่อนี้จากระบบ
                                  </button>
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      ) : (
                        <div className="flex-1 relative">
                          <select
                            aria-label={`เลือกอาจารย์จากระบบคนที่ ${index + 1}`}
                            disabled={isSubmitting}
                            value={name}
                            onChange={e => {
                              const val = e.target.value;
                              if (val === '__CUSTOM__') {
                                setCustomIndices(prev => ({ ...prev, [index]: true }));
                                setSubmitterNames(names =>
                                  names.map((n, i) => (i === index ? '' : n))
                                );
                              } else {
                                setSubmitterNames(names =>
                                  names.map((n, i) => (i === index ? val : n))
                                );
                              }
                            }}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:ring-2 focus:ring-[#075A9C]"
                          >
                            <option value="" disabled>-- เลือกอาจารย์จากระบบ --</option>
                            {showCurrentAsOption && (
                              <option value={name}>{name} (บันทึกเดิม)</option>
                            )}
                            {selectablePersonnel.map(p => (
                              <option key={p.id} value={p.displayName}>
                                {p.label}
                              </option>
                            ))}
                            <option value="__CUSTOM__">+ พิมพ์ชื่ออาจารย์ท่านอื่น (ระบุเอง)...</option>
                          </select>
                        </div>
                      )}

                      {submitterNames.length > 1 && (
                        <button
                          type="button"
                          disabled={isSubmitting}
                          aria-label={`ลบอาจารย์คนที่ ${index + 1}`}
                          onClick={() => {
                            setSubmitterNames(names => names.filter((_, i) => i !== index));
                            setCustomIndices(prev => {
                              const next = { ...prev };
                              delete next[index];
                              return next;
                            });
                          }}
                          className="px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl font-medium transition-colors shrink-0"
                        >
                          ลบ
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => {
                    const nextChoice =
                      teacherChoices.find(c => !submitterNames.includes(c)) ||
                      teacherChoices[0] ||
                      '';
                    setSubmitterNames(names => [...names, nextChoice]);
                  }}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#075A9C] hover:text-[#06487c] transition-colors"
                >
                  <span>+ เพิ่มอาจารย์ผู้ยื่น</span>
                </button>
                <p className="text-xs text-slate-500">
                  รายชื่อทุกคนจะแสดงในรายงานสรุปและหน้าติดตามงาน
                </p>
              </div>
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
                  if (next === 'WAITING_APPOINTMENT' || next === 'DOCUMENT_SUBMITTED') {
                    if (!note.trim()) setNote('รอติดต่อกลับ');
                  } else if (next === 'APPOINTED') {
                    if ((note === 'รอติดต่อกลับ' || note === 'รอนัดหมาย')) setNote('');
                    if (!appointmentDate) setAppointmentDate(getTodayISO());
                    if (!appointmentStart) setAppointmentStart('09:00');
                    if (!appointmentEnd) setAppointmentEnd('11:30');
                  } else if (next === 'OTHER_ACTIVITY' && (note === 'รอติดต่อกลับ' || note === 'รอนัดหมาย')) {
                    setNote('');
                  }
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#087CC1]"
              >
                <option value="WAITING_APPOINTMENT">ยื่นหนังสือแล้ว</option>
                <option value="APPOINTED">นัดหมายแล้ว (ระบุวันเวลานัด)</option>
                <option value="OTHER_ACTIVITY">กิจกรรมอื่นๆ</option>
                {submissionToEdit?.status &&
                  submissionToEdit.status !== 'WAITING_APPOINTMENT' &&
                  submissionToEdit.status !== 'DOCUMENT_SUBMITTED' &&
                  submissionToEdit.status !== 'APPOINTED' &&
                  submissionToEdit.status !== 'OTHER_ACTIVITY' && (
                    <option value={submissionToEdit.status}>
                      {submissionToEdit.status}
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
                  placeholder="เช่น ยื่นใบเสร็จ, ประสานงานพิเศษ, นิทรรศการสัญจร"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#087CC1]"
                />
              </div>
            )}
          </div>

          {status === 'APPOINTED' && <section className="p-4 rounded-xl border border-sky-200 bg-sky-50 space-y-3">
            <h3 className="text-sm font-semibold text-sky-800">วันและเวลานัดแนะแนว</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <ThaiDatePicker
                label="วันที่นัด"
                value={appointmentDate}
                onChange={setAppointmentDate}
                required
              />
              <label className="text-xs font-semibold text-slate-700">เวลาเริ่ม *<input aria-label="เวลาเริ่มนัดแนะแนว" type="time" required value={appointmentStart} onChange={e => setAppointmentStart(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs" /></label>
              <label className="text-xs font-semibold text-slate-700">เวลาสิ้นสุด *<input aria-label="เวลาสิ้นสุดนัดแนะแนว" type="time" required value={appointmentEnd} onChange={e => setAppointmentEnd(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs" /></label>
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
