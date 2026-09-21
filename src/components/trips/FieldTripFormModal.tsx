import type { DocumentSubmission } from '../../types';
import { TripVehiclePicker } from '../common/TripVehiclePicker';
import { SchoolPicker } from '../common/SchoolPicker';
import { ThaiDatePicker } from '../common/ThaiDatePicker';
import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Compass, Plus, Trash2, CalendarCheck, FileText } from 'lucide-react';
import { School, FieldTrip, TeamId, PhotoItem, Appointment, Vehicle, ApprovalStatus } from '../../types';
import { PhotoUploader } from '../common/PhotoUploader';
import { formatThaiShortDate, getTodayISO } from '../../utils/dateUtils';
import { useAuth } from '../../context/AuthContext';
import { subscribeVehicles } from '../../firebase/dbService';
import { getSelectablePersonnel, isEligiblePersonnel, resolveResponsibleCounselor } from '../../utils/personnelSelector';
import { getDefaultVehicleForPersonnel } from '../../utils/vehicleMapping';
import { isTimeRangeValid, isValidTimeRange, formatAppointmentTime } from '../../utils/appointmentUtils';
import { formatSchoolDisplayName } from '../../utils/schoolStatus';

interface FieldTripFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  schools: School[];
  submissions?: DocumentSubmission[];
  appointments?: Appointment[];
  prefilledAppointment?: Appointment | null;
  prefilledSubmission?: (Omit<DocumentSubmission, 'id'> & { id?: string }) | null;
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

type LinkedSource = {
  key: string;
  kind: 'appointment' | 'submission';
  label: string;
  detail: string;
  schoolId: string;
  schoolName: string;
  teamId: TeamId;
  date?: string;
  timeSlot?: string;
  teacherName?: string;
  teacherPhone?: string;
  counselorId?: string;
  counselorName?: string;
  teamMemberNames?: string;
  vehicleId?: string;
  vehicleName?: string;
  workType?: string;
  note?: string;
  submissionId?: string;
  appointmentId?: string;
};

export const FieldTripFormModal: React.FC<FieldTripFormModalProps> = ({
  isOpen,
  onClose,
  schools,
  submissions = [],
  appointments = [],
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

  const selectablePersonnel = React.useMemo(() => {
    return getSelectablePersonnel(users);
  }, [users]);

  const defaultCounselor = React.useMemo(() => {
    if (currentUser && isEligiblePersonnel(currentUser)) {
      return { id: currentUser.id, name: currentUser.displayName || 'อ.ประชา กัลปนารถ' };
    }
    const eligible = selectablePersonnel[0];
    return eligible ? { id: eligible.id, name: eligible.displayName } : { id: 'usr_admin', name: 'อ.ประชา กัลปนารถ' };
  }, [currentUser, selectablePersonnel]);

  const [date, setDate] = useState<string>(getTodayISO());
  const [departureTime, setDepartureTime] = useState<string>('08:00');
  const [returnTime, setReturnTime] = useState<string>('');
  const [teamId, setTeamId] = useState<TeamId>('team1');
  const [counselorName, setCounselorName] = useState<string>(defaultCounselor.name);
  const [counselorId, setCounselorId] = useState<string>(defaultCounselor.id);
  const [teamMemberNames, setTeamMemberNames] = useState<string>('');
  const [workType, setWorkType] = useState<string>('แนะแนวการศึกษา ม.3 และ ม.6');
  const [vehicleId, setVehicleId] = useState<string>('');
  const [vehicleName, setVehicleName] = useState<string>('');
  const [summary, setSummary] = useState<string>('');
  const [issues, setIssues] = useState<string>('');
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus>('PENDING_APPROVAL');
  const [academicYear, setAcademicYear] = useState<string>('2569');
  const [budgetAllowance, setBudgetAllowance] = useState<number>(0);
  const [budgetFuel, setBudgetFuel] = useState<number>(0);
  const [sourceKey, setSourceKey] = useState<string>('');
  const [submissionId, setSubmissionId] = useState<string | undefined>(undefined);
  const [appointmentId, setAppointmentId] = useState<string | undefined>(undefined);

  // Trip Schools list (support multiple schools in one day trip!)
  const [tripSchools, setTripSchools] = useState<
    Array<{ schoolId: string; schoolName: string; timeSlot?: string; studentCount?: number; notes?: string }>
  >([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  const getSchool = (schoolId?: string) => schools.find((school) => school.id === schoolId);

  const getSchoolStudentCount = (schoolId?: string) => {
    const school = getSchool(schoolId);
    return ((school?.studentM3 || 0) + (school?.studentM6 || 0)) || 0;
  };

  const buildTripSchool = (
    schoolId: string,
    schoolName: string,
    timeSlot = '09:00 - 11:30',
    notes = '',
    studentCount?: number
  ) => {
    const school = getSchool(schoolId);
    return {
      schoolId,
      schoolName: school?.schoolName || schoolName,
      timeSlot,
      studentCount: studentCount ?? getSchoolStudentCount(schoolId),
      notes,
    };
  };

  const linkedSources = React.useMemo<LinkedSource[]>(() => {
    const appointmentSources: LinkedSource[] = appointments
      .filter((appt) => appt.status !== 'CANCELLED' && appt.status !== 'COMPLETED')
      .map((appt) => ({
        key: `appointment:${appt.id}`,
        kind: 'appointment',
        label: `${formatThaiShortDate(appt.date)} · ${formatSchoolDisplayName(appt.schoolName)}`,
        detail: `${formatAppointmentTime(appt.startTime, appt.endTime)} · ${appt.counselorName || 'ยังไม่ระบุผู้รับผิดชอบ'}`,
        schoolId: appt.schoolId,
        schoolName: appt.schoolName,
        teamId: appt.teamId,
        date: appt.date,
        timeSlot: formatAppointmentTime(appt.startTime, appt.endTime, { suffix: false }),
        teacherName: appt.teacherName,
        teacherPhone: appt.teacherPhone,
        counselorId: appt.counselorId,
        counselorName: appt.counselorName,
        teamMemberNames: appt.teamMemberNames,
        vehicleId: appt.vehicleId,
        vehicleName: appt.vehicleName,
        workType: appt.workType,
        note: appt.note,
        submissionId: appt.submissionId,
        appointmentId: appt.id,
      }));

    const submissionSources: LinkedSource[] = submissions
      .filter((sub) => !sub.fieldTripId && !sub.appointmentId && ['APPOINTED', 'DOCUMENT_SUBMITTED', 'WAITING_CONTACT', 'WAITING_APPOINTMENT'].includes(sub.status))
      .map((sub) => {
        const hasAppointmentTime = !!(sub.appointmentDate && sub.appointmentStartTime && sub.appointmentEndTime);
        return {
          key: `submission:${sub.id}`,
          kind: 'submission',
          label: `${formatThaiShortDate(sub.appointmentDate || sub.submissionDate)} · ${formatSchoolDisplayName(sub.schoolName)}`,
          detail: hasAppointmentTime
            ? `${formatAppointmentTime(sub.appointmentStartTime, sub.appointmentEndTime)} · จากหน้ายื่นหนังสือ`
            : `${sub.status === 'APPOINTED' ? 'นัดหมายแล้ว' : 'ยื่นหนังสือแล้ว'} · ${sub.submittedByName}`,
          schoolId: sub.schoolId,
          schoolName: sub.schoolName,
          teamId: sub.teamId,
          date: sub.appointmentDate,
          timeSlot: hasAppointmentTime ? formatAppointmentTime(sub.appointmentStartTime, sub.appointmentEndTime, { suffix: false }) : undefined,
          teacherName: sub.teacherName,
          teacherPhone: sub.teacherPhone,
          teamMemberNames: sub.submittedByNames?.join(', ') || sub.submittedByName,
          vehicleId: sub.vehicleId,
          vehicleName: sub.vehicleName,
          workType: 'แนะแนวการศึกษา ม.3 และ ม.6',
          note: sub.appointmentNote || sub.note,
          submissionId: sub.id,
          appointmentId: sub.appointmentId,
        };
      });

    return [...appointmentSources, ...submissionSources].sort((a, b) =>
      (b.date || '').localeCompare(a.date || '')
    );
  }, [appointments, submissions, schools]);

  const selectedLinkedSource = linkedSources.find((source) => source.key === sourceKey);
  const appointmentLinkedSources = linkedSources.filter((source) => source.kind === 'appointment');
  const submissionLinkedSources = linkedSources.filter((source) => source.kind === 'submission');

  const applyLinkedSource = (source: LinkedSource) => {
    const resolvedCounselor = resolveResponsibleCounselor(
      source.counselorId,
      source.counselorName,
      selectablePersonnel
    );

    // Vehicle Priority: 1. Stored vehicle, 2. Personnel default, 3. Empty
    let sourceVehicleId = source.vehicleId || '';
    let sourceVehicleName = source.vehicleName || '';
    if (!sourceVehicleId) {
      const defVeh = getDefaultVehicleForPersonnel(resolvedCounselor.id, resolvedCounselor.name);
      if (defVeh) {
        sourceVehicleId = defVeh.id;
        sourceVehicleName = defVeh.name;
      }
    }

    setSourceKey(source.key);
    setSubmissionId(source.submissionId);
    setAppointmentId(source.appointmentId);
    setDate(source.date || getTodayISO());
    setTeamId(source.teamId);
    setVehicleId(sourceVehicleId);
    setVehicleName(sourceVehicleName);
    setCounselorId(resolvedCounselor.isLegacyFallback ? (currentUser?.id || defaultCounselor.id) : resolvedCounselor.id);
    setCounselorName(resolvedCounselor.isLegacyFallback ? (currentUser?.displayName || defaultCounselor.name) : resolvedCounselor.name);
    setTeamMemberNames(source.teamMemberNames || '');
    setWorkType(source.workType?.includes('แนะแนว') ? source.workType : 'แนะแนวการศึกษา ม.3 และ ม.6');
    setTripSchools([
      buildTripSchool(
        source.schoolId,
        source.schoolName,
        source.timeSlot || '09:00 - 11:30',
        source.note || ''
      ),
    ]);
    setApprovalStatus(isAdmin || isManager ? 'APPROVED' : 'PENDING_APPROVAL');
  };

  const clearLinkedSource = () => {
    setSourceKey('');
    setSubmissionId(undefined);
    setAppointmentId(undefined);
  };

  useEffect(() => {
    if (!isOpen) return;

    if (tripToEdit) {
      setDate(tripToEdit.date);
      setDepartureTime(tripToEdit.departureTime || '08:00');
      setReturnTime(tripToEdit.returnTime || '');
      setTeamId(tripToEdit.teamId);

      // Resolve counselor identity using central personnelSelector
      const resolved = resolveResponsibleCounselor(
        tripToEdit.counselorId,
        tripToEdit.counselorName,
        selectablePersonnel
      );
      setCounselorId(resolved.id);
      setCounselorName(resolved.name);

      setTeamMemberNames(tripToEdit.teamMemberNames || '');
      setWorkType(tripToEdit.workType);
      // Priority: 1. Stored vehicle, 2. Personnel default, 3. Empty
      let editVehId = tripToEdit.vehicleId || '';
      let editVehName = tripToEdit.vehicleName || '';
      if (!editVehId) {
        const defVeh = getDefaultVehicleForPersonnel(resolved.id, resolved.name);
        if (defVeh) {
          editVehId = defVeh.id;
          editVehName = defVeh.name;
        }
      }
      setVehicleId(editVehId);
      setVehicleName(editVehName);
      setSummary(tripToEdit.summary || '');
      setIssues(tripToEdit.issues || '');
      setPhotos(tripToEdit.photos || []);
      setTripSchools(tripToEdit.schools || []);
      setApprovalStatus(tripToEdit.approvalStatus || 'APPROVED');
      setAcademicYear(tripToEdit.academicYear || '2569');
      setBudgetAllowance(tripToEdit.budgetAllowance || 0);
      setBudgetFuel(tripToEdit.budgetFuel || 0);
      setSubmissionId(tripToEdit.submissionId);
      setAppointmentId(tripToEdit.appointmentId);
      setSourceKey(tripToEdit.appointmentId ? `appointment:${tripToEdit.appointmentId}` : tripToEdit.submissionId ? `submission:${tripToEdit.submissionId}` : '');
    } else if (prefilledSubmission) {
      applyLinkedSource({
        key: prefilledSubmission.id ? `submission:${prefilledSubmission.id}` : 'prefilled-submission',
        kind: 'submission',
        label: formatSchoolDisplayName(prefilledSubmission.schoolName),
        detail: prefilledSubmission.submittedByName,
        schoolId: prefilledSubmission.schoolId,
        schoolName: prefilledSubmission.schoolName,
        teamId: prefilledSubmission.teamId,
        date: prefilledSubmission.appointmentDate || prefilledSubmission.submissionDate,
        timeSlot: prefilledSubmission.appointmentStartTime && prefilledSubmission.appointmentEndTime
          ? formatAppointmentTime(prefilledSubmission.appointmentStartTime, prefilledSubmission.appointmentEndTime, { suffix: false })
          : undefined,
        teacherName: prefilledSubmission.teacherName,
        teacherPhone: prefilledSubmission.teacherPhone,
        teamMemberNames: prefilledSubmission.submittedByNames?.join(', ') || prefilledSubmission.submittedByName,
        vehicleId: prefilledSubmission.vehicleId,
        vehicleName: prefilledSubmission.vehicleName,
        note: prefilledSubmission.appointmentNote || prefilledSubmission.note,
        submissionId: prefilledSubmission.id,
        appointmentId: prefilledSubmission.appointmentId,
      });
    } else if (prefilledAppointment) {
      applyLinkedSource({
        key: `appointment:${prefilledAppointment.id}`,
        kind: 'appointment',
        label: formatSchoolDisplayName(prefilledAppointment.schoolName),
        detail: formatAppointmentTime(prefilledAppointment.startTime, prefilledAppointment.endTime),
        schoolId: prefilledAppointment.schoolId,
        schoolName: prefilledAppointment.schoolName,
        teamId: prefilledAppointment.teamId,
        date: prefilledAppointment.date,
        timeSlot: formatAppointmentTime(prefilledAppointment.startTime, prefilledAppointment.endTime, { suffix: false }),
        teacherName: prefilledAppointment.teacherName,
        teacherPhone: prefilledAppointment.teacherPhone,
        counselorId: prefilledAppointment.counselorId,
        counselorName: prefilledAppointment.counselorName,
        teamMemberNames: prefilledAppointment.teamMemberNames,
        vehicleId: prefilledAppointment.vehicleId,
        vehicleName: prefilledAppointment.vehicleName,
        workType: prefilledAppointment.workType,
        note: prefilledAppointment.note,
        submissionId: prefilledAppointment.submissionId,
        appointmentId: prefilledAppointment.id,
      });
    } else {
      const defaultTeam = currentUser?.teamId || 'team1';
      setDate(getTodayISO());
      setDepartureTime('08:00');
      setReturnTime('');
      setTeamId(defaultTeam);
      setCounselorName(defaultCounselor.name);
      setCounselorId(defaultCounselor.id);
      setTeamMemberNames('');
      setWorkType('แนะแนวการศึกษา ม.3 และ ม.6');
      const initVeh = getDefaultVehicleForPersonnel(defaultCounselor.id, defaultCounselor.name);
      setVehicleId(initVeh?.id || '');
      setVehicleName(initVeh?.name || '');
      setSummary('');
      setIssues('');
      setPhotos([]);
      clearLinkedSource();
      setTripSchools(schools[0] ? [buildTripSchool(schools[0].id, schools[0].schoolName)] : []);
      setApprovalStatus(isAdmin || isManager ? 'APPROVED' : 'PENDING_APPROVAL');
      setAcademicYear('2569');
      setBudgetAllowance(0);
      setBudgetFuel(0);
    }
  }, [isOpen, tripToEdit?.id, prefilledAppointment?.id, prefilledSubmission?.id, schools, isAdmin, isManager, currentUser?.id]);

  const handleAddSchoolRow = () => {
    const defaultSchool = schools[0];
    setTripSchools((prev) => [
      ...prev,
      defaultSchool
        ? buildTripSchool(defaultSchool.id, defaultSchool.schoolName, '13:00 - 14:30')
        : { schoolId: '', schoolName: '', timeSlot: '13:00 - 14:30', studentCount: 0, notes: '' },
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
        clearLinkedSource();
        updated[index] = buildTripSchool(
          value,
          found ? found.schoolName : '',
          updated[index].timeSlot || '09:00 - 11:30',
          updated[index].notes || ''
        );
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

  const handleTeamChange = (nextTeam: TeamId) => {
    setTeamId(nextTeam);
    clearLinkedSource();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tripSchools.length === 0) {
      setError('กรุณาระบุอย่างน้อย 1 โรงเรียนในการออกแนะแนว');
      return;
    }

    if (departureTime && returnTime && returnTime <= departureTime) {
      setError('เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่มต้น');
      return;
    }

    for (const s of tripSchools) {
      if (s.timeSlot) {
        const match = s.timeSlot.match(/^(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/);
        if (match && match[2] <= match[1]) {
          setError('เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่มต้น');
          return;
        }
      }
    }

    setError(null);
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    try {
      const cleanSchools = tripSchools.map((s) => ({
        schoolId: s.schoolId || '',
        schoolName: s.schoolName || '',
        ...(s.timeSlot ? { timeSlot: s.timeSlot } : {}),
        studentCount: typeof s.studentCount === 'number' ? s.studentCount : 0,
        note: s.notes || s.note || '',
      }));

      const payload: Omit<FieldTrip, 'id'> = {
        date,
        departureTime,
        returnTime: returnTime || '',
        teamId,
        counselorName,
        counselorId,
        teamMemberNames,
        workType,
        vehicleId: vehicleId || '',
        vehicleName: vehicleName || '',
        schools: cleanSchools,
        summary: summary || '',
        issues: issues || '',
        photos,
        approvalStatus,
        academicYear,
        budgetAllowance,
        budgetFuel,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...(submissionId && submissionId.trim() ? { submissionId: submissionId.trim() } : {}),
        ...(appointmentId && appointmentId.trim() ? { appointmentId: appointmentId.trim() } : {}),
      };

      await onSave(payload);
      onClose();
    } catch (err: any) {
      setError(err.message || 'บันทึกข้อมูลไม่สำเร็จ');
    } finally {
      isSubmittingRef.current = false;
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

          {!tripToEdit && linkedSources.length > 0 && (
            <div className="p-4 bg-sky-50/70 rounded-xl border border-sky-200 space-y-3">
              <div className="flex items-start gap-2">
                <CalendarCheck className="w-4 h-4 text-[#087CC1] mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-slate-800">ดึงข้อมูลจากนัดหมายหรือยื่นหนังสือ</h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    เลือกต้นทางแล้วระบบจะเติมโรงเรียน วันเวลา สาย รถ และอาจารย์ให้ก่อน จากนั้นแก้ตามงานจริงได้
                  </p>
                </div>
              </div>

              <select
                aria-label="เลือกข้อมูลต้นทางสำหรับออกแนะแนว"
                value={sourceKey}
                onChange={(e) => {
                  const nextKey = e.target.value;
                  if (!nextKey) {
                    clearLinkedSource();
                    return;
                  }
                  const source = linkedSources.find((item) => item.key === nextKey);
                  if (source) applyLinkedSource(source);
                }}
                className="w-full px-3 py-2 bg-white border border-sky-200 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-[#087CC1]"
              >
                <option value="">สร้างรายการใหม่เอง</option>
                {appointmentLinkedSources.length > 0 && (
                  <optgroup label="นัดหมายแนะแนว">
                    {appointmentLinkedSources.map((source) => (
                      <option key={source.key} value={source.key}>
                        {source.label} · {source.detail}
                      </option>
                    ))}
                  </optgroup>
                )}
                {submissionLinkedSources.length > 0 && (
                  <optgroup label="ข้อมูลจากหน้ายื่นหนังสือ">
                    {submissionLinkedSources.map((source) => (
                      <option key={source.key} value={source.key}>
                        {source.label} · {source.detail}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>

              {selectedLinkedSource && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div className="rounded-lg bg-white border border-sky-100 p-2">
                    <div className="text-slate-500">โรงเรียน</div>
                    <div className="font-semibold text-slate-800">{formatSchoolDisplayName(selectedLinkedSource.schoolName)}</div>
                  </div>
                  <div className="rounded-lg bg-white border border-sky-100 p-2">
                    <div className="text-slate-500">วันเวลา</div>
                    <div className="font-semibold text-slate-800">
                      {selectedLinkedSource.date ? formatThaiShortDate(selectedLinkedSource.date) : 'กำหนดในฟอร์ม'} {selectedLinkedSource.timeSlot || ''}
                    </div>
                  </div>
                  <div className="rounded-lg bg-white border border-sky-100 p-2">
                    <div className="text-slate-500">ผู้ติดต่อ</div>
                    <div className="font-semibold text-slate-800">
                      {selectedLinkedSource.teacherName || '-'}{selectedLinkedSource.teacherPhone ? ` · ${selectedLinkedSource.teacherPhone}` : ''}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Date & Team */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <ThaiDatePicker
                label="วันที่ออกแนะแนว"
                value={date}
                onChange={setDate}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                สายการปฏิบัติงาน
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
                {workType && !WORK_TYPES.includes(workType) && (
                  <option value={workType}>{workType}</option>
                )}
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
              <select
                aria-label="อาจารย์ผู้รับผิดชอบ"
                value={counselorId}
                onChange={(e) => {
                  const p = selectablePersonnel.find((u) => u.id === e.target.value);
                  if (p) {
                    setCounselorId(p.id);
                    setCounselorName(p.displayName);
                  }
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#087CC1] focus:border-transparent transition-all"
              >
                {tripToEdit && !selectablePersonnel.some((p) => p.id === counselorId) && (
                  <option value={counselorId}>
                    {counselorName || 'ชื่อเดิม'} (บันทึกเดิม)
                  </option>
                )}
                {selectablePersonnel.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
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
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-100 text-[#087CC1] border border-[#087CC1]/30 rounded-lg text-xs font-semibold transition-colors shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>เพิ่มโรงเรียน</span>
              </button>
            </div>

            <div className="space-y-3">
              {tripSchools.map((item, index) => {
                const schoolInfo = getSchool(item.schoolId);
                return (
                  <div
                    key={index}
                    className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2.5"
                  >
                    {/* Header with Row Title and Remove Button */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">
                        โรงเรียน #{index + 1}
                      </span>
                      {tripSchools.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSchoolRow(index)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors font-medium"
                          title={`ลบโรงเรียน #${index + 1}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>ลบโรงเรียนนี้</span>
                        </button>
                      )}
                    </div>

                    {/* Responsive Grid:
                        - Desktop (lg): 3 columns [~49% school, ~29.5% time, ~21.5% students]
                        - Tablet (sm): School full row, then Time (50%) & Students (50%)
                        - Mobile (<sm): 1 column stacked (100% each)
                    */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[minmax(240px,1.5fr)_minmax(180px,0.9fr)_minmax(140px,0.65fr)] gap-3 items-end">
                      {/* Column 1: School */}
                      <div className="sm:col-span-2 lg:col-span-1 min-w-0">
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5 h-4 flex items-center">
                          โรงเรียน
                        </label>
                        <SchoolPicker
                          schools={schools}
                          value={item.schoolId}
                          onChange={(id) => handleUpdateSchoolRow(index, 'schoolId', id)}
                          disabled={isSubmitting}
                        />
                      </div>

                      {/* Column 2: Time Slot */}
                      <div className="sm:col-span-1 min-w-0">
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5 h-4 flex items-center">
                          ช่วงเวลาจัดกิจกรรม
                        </label>
                        <input
                          type="text"
                          value={item.timeSlot || ''}
                          onChange={(e) => handleUpdateSchoolRow(index, 'timeSlot', e.target.value)}
                          placeholder="09:00 - 11:30"
                          className="w-full h-11 px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#087CC1] focus:border-transparent transition-all outline-none"
                        />
                      </div>

                      {/* Column 3: Actual Students */}
                      <div className="sm:col-span-1 min-w-0">
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5 h-4 flex items-center">
                          นร. เข้าร่วมจริง (คน)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={item.studentCount !== undefined && item.studentCount !== null ? item.studentCount : ''}
                          onChange={(e) => {
                            const rawVal = e.target.value;
                            if (rawVal === '') {
                              handleUpdateSchoolRow(index, 'studentCount', 0);
                              return;
                            }
                            const num = Math.max(0, parseInt(rawVal, 10) || 0);
                            handleUpdateSchoolRow(index, 'studentCount', num);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === '-' || e.key === 'e' || e.key === '+') {
                              e.preventDefault();
                            }
                          }}
                          placeholder="จำนวน"
                          className="w-full h-11 px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#087CC1] focus:border-transparent transition-all outline-none"
                        />
                      </div>
                    </div>

                    {/* School summary row full width */}
                    {schoolInfo && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 rounded-lg bg-slate-50 border border-slate-200 p-2.5 text-[11px] sm:text-xs text-slate-600 mt-1">
                        <div>
                          <span className="text-slate-400">ครูแนะแนว: </span>
                          <span className="font-semibold text-slate-700">{schoolInfo.teacherName || '-'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">เบอร์: </span>
                          <span className="font-semibold text-slate-700">{schoolInfo.teacherPhone || '-'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">ยอดฐาน: </span>
                          <span className="font-semibold text-slate-700">
                            ม.3 {schoolInfo.studentM3 || 0} / ม.6 {schoolInfo.studentM6 || 0}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
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
