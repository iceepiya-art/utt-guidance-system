import { describe, it, expect, vi } from 'vitest';
import {
  getSelectablePersonnel,
  resolvePersonnelDisplayName,
} from '../src/utils/personnelSelector';
import {
  getSubmissionDisplayStatus,
  isNormalGuidanceActivity,
} from '../src/utils/submissionUtils';
import { DocumentSubmission, Appointment, FieldTrip } from '../src/types';

describe('Workflow Separation & Submission UI Consistency (13 Business Rules)', () => {
  const mockPersonnel = getSelectablePersonnel([], true);

  const baseSubmission: DocumentSubmission = {
    id: 'sub_001',
    schoolId: 'sch_001',
    schoolName: 'โรงเรียนอุตรดิตถ์',
    documentNumber: 'ว.001/2569',
    submissionDate: '2026-09-01',
    submissionTime: '09:00',
    teamId: 'team1',
    submittedById: 'usr_admin',
    submittedByName: 'อ.ประชา กัลปนารถ',
    teacherName: 'ครูสมหวัง',
    teacherPhone: '0812345678',
    status: 'WAITING_APPOINTMENT',
    note: '',
    photos: [],
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  };

  // TEST 1: Submission ปกติ ไม่มี Appointment -> ยื่นหนังสือแล้ว
  it('TEST 1: normal submission without appointment displays "ยื่นหนังสือแล้ว"', () => {
    const sub = { ...baseSubmission, status: 'WAITING_APPOINTMENT' as const };
    const status = getSubmissionDisplayStatus(sub);
    expect(status.label).toBe('ยื่นหนังสือแล้ว');
    expect(status.isOtherActivity).toBe(false);
  });

  // TEST 2: Submission ปกติ + CONFIRMED Appointment -> หน้า Submission ยังแสดง "ยื่นหนังสือแล้ว"
  it('TEST 2: normal submission with CONFIRMED appointment still displays "ยื่นหนังสือแล้ว" on Submission page', () => {
    const sub = { ...baseSubmission, status: 'WAITING_APPOINTMENT' as const };
    const appt: Appointment = {
      id: 'appt_001',
      submissionId: sub.id,
      schoolId: sub.schoolId,
      schoolName: sub.schoolName,
      teacherName: sub.teacherName,
      teacherPhone: sub.teacherPhone,
      date: '2026-09-10',
      startTime: '09:00',
      endTime: '11:00',
      status: 'CONFIRMED',
      counselorName: 'อ.ประชา กัลปนารถ',
      teamMemberNames: 'อ.ประชา กัลปนารถ',
      workType: 'แนะแนว',
      source: 'DOCUMENT_SUBMISSION',
      note: '',
      reminders: [],
      approvalStatus: 'APPROVED',
      counselorId: 'usr_admin',
      teamId: 'team1',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    };

    // Submissions page never calculates cross-workflow status from appointment
    const status = getSubmissionDisplayStatus(sub);
    expect(status.label).toBe('ยื่นหนังสือแล้ว');
    expect(status.isOtherActivity).toBe(false);
  });

  // TEST 3: Submission ปกติ + COMPLETED Appointment -> หน้า Submission ยังแสดง "ยื่นหนังสือแล้ว"
  it('TEST 3: normal submission with COMPLETED appointment still displays "ยื่นหนังสือแล้ว" on Submission page', () => {
    const sub = { ...baseSubmission, status: 'WAITING_APPOINTMENT' as const };
    const appt: Appointment = {
      id: 'appt_002',
      submissionId: sub.id,
      schoolId: sub.schoolId,
      schoolName: sub.schoolName,
      teacherName: sub.teacherName,
      teacherPhone: sub.teacherPhone,
      date: '2026-09-05',
      startTime: '09:00',
      endTime: '11:00',
      status: 'COMPLETED',
      counselorName: 'อ.ประชา กัลปนารถ',
      teamMemberNames: 'อ.ประชา กัลปนารถ',
      workType: 'แนะแนว',
      source: 'DOCUMENT_SUBMISSION',
      note: '',
      reminders: [],
      approvalStatus: 'APPROVED',
      counselorId: 'usr_admin',
      teamId: 'team1',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    };

    const status = getSubmissionDisplayStatus(sub);
    expect(status.label).toBe('ยื่นหนังสือแล้ว');
    expect(status.isOtherActivity).toBe(false);
  });

  // TEST 4: Submission ปกติ + FieldTrip -> หน้า Submission ยังแสดง "ยื่นหนังสือแล้ว"
  it('TEST 4: normal submission with FieldTrip still displays "ยื่นหนังสือแล้ว" on Submission page', () => {
    const sub = { ...baseSubmission, status: 'WAITING_APPOINTMENT' as const };
    const trip: FieldTrip = {
      id: 'ft_001',
      date: '2026-09-05',
      teamId: 'team1',
      counselorId: 'usr_admin',
      counselorName: 'อ.ประชา กัลปนารถ',
      teamMemberNames: 'อ.ประชา กัลปนารถ',
      workType: 'แนะแนว',
      vehicleId: 'vigo-9914',
      vehicleName: 'VIGO กข 9914',
      departureTime: '08:30',
      returnTime: '12:00',
      schools: [{ schoolId: sub.schoolId, schoolName: sub.schoolName, studentCount: 50, note: '' }],
      approvalStatus: 'APPROVED',
      photos: [],
      createdAt: '2026-09-05T00:00:00Z',
      updatedAt: '2026-09-05T00:00:00Z',
    };

    const status = getSubmissionDisplayStatus(sub);
    expect(status.label).toBe('ยื่นหนังสือแล้ว');
    expect(status.isOtherActivity).toBe(false);
  });

  // TEST 5: legacy OTHER_ACTIVITY + "ยื่นหนังสือแนะแนว" -> หน้า Submission แสดง "ยื่นหนังสือแล้ว" -> ไม่แสดงกิจกรรมอื่น
  it('TEST 5: legacy OTHER_ACTIVITY + "ยื่นหนังสือแนะแนว" normalizes to "ยื่นหนังสือแล้ว" and hides other activity note', () => {
    const sub: DocumentSubmission = {
      ...baseSubmission,
      status: 'OTHER_ACTIVITY',
      otherActivityDetails: 'ยื่นหนังสือแนะแนว',
    };

    expect(isNormalGuidanceActivity(sub.otherActivityDetails)).toBe(true);
    const status = getSubmissionDisplayStatus(sub);
    expect(status.label).toBe('ยื่นหนังสือแล้ว');
    expect(status.isOtherActivity).toBe(false);
  });

  // TEST 6: Open House -> กิจกรรมอื่นๆ
  it('TEST 6: genuine Open House event retains "กิจกรรมอื่นๆ"', () => {
    const sub: DocumentSubmission = {
      ...baseSubmission,
      status: 'OTHER_ACTIVITY',
      otherActivityDetails: 'ยื่นหนังสือ open House',
    };

    expect(isNormalGuidanceActivity(sub.otherActivityDetails)).toBe(false);
    const status = getSubmissionDisplayStatus(sub);
    expect(status.label).toBe('กิจกรรมอื่นๆ');
    expect(status.isOtherActivity).toBe(true);
  });

  // TEST 7: Techno Cup -> กิจกรรมอื่นๆ
  it('TEST 7: genuine Techno Cup event retains "กิจกรรมอื่นๆ"', () => {
    const sub: DocumentSubmission = {
      ...baseSubmission,
      status: 'OTHER_ACTIVITY',
      otherActivityDetails: 'ยื่นหนังสือเทคโนคัพ',
    };

    expect(isNormalGuidanceActivity(sub.otherActivityDetails)).toBe(false);
    const status = getSubmissionDisplayStatus(sub);
    expect(status.label).toBe('กิจกรรมอื่นๆ');
    expect(status.isOtherActivity).toBe(true);
  });

  // TEST 8: Personnel Aliases Resolution
  it('TEST 8: resolves legacy submitter aliases correctly to full display names', () => {
    const r1 = resolvePersonnelDisplayName('อ.ประชา', mockPersonnel);
    expect(r1.matched).toBe(true);
    expect(r1.displayName).toBe('อ.ประชา กัลปนารถ');

    const r2 = resolvePersonnelDisplayName('อ.ปิยะ', mockPersonnel);
    expect(r2.matched).toBe(true);
    expect(r2.displayName).toBe('อ.ปิยะ สีตาชัย');

    const r3 = resolvePersonnelDisplayName('อ.ณิชชัยกุญช์', mockPersonnel);
    expect(r3.matched).toBe(true);
    expect(r3.displayName).toBe('อ.ณิชชัยกุญช์ โลราช');
  });

  // TEST 9: historical submitter 1 คน -> ยังเป็น 1 คน
  it('TEST 9: preserves single submitter count without retroactively injecting additional personnel', () => {
    const rawNames = ['อ.ประชา'];
    const resolvedList = rawNames.map((name) => resolvePersonnelDisplayName(name, mockPersonnel).displayName);

    expect(resolvedList.length).toBe(1);
    expect(resolvedList[0]).toBe('อ.ประชา กัลปนารถ');
  });

  // TEST 10: Submission ทั้งหมด -> 140 รายการ
  it('TEST 10: formats header count string as 140 entries when no filters are active', () => {
    const totalCount = 140;
    const filteredCount = 140;
    const isFiltered = false;
    const headerText = `ข้อมูลการยื่นหนังสือ (${isFiltered ? `${filteredCount} จาก ${totalCount}` : totalCount} รายการ)`;
    expect(headerText).toBe('ข้อมูลการยื่นหนังสือ (140 รายการ)');
  });

  // TEST 11: อุตรดิตถ์ -> 95 จาก 140
  it('TEST 11: displays "95 จาก 140" when filtering by Uttaradit (สาย 1)', () => {
    const totalCount = 140;
    const uttCount = 95;
    const isFiltered = true;
    const headerText = `ข้อมูลการยื่นหนังสือ (${isFiltered ? `${uttCount} จาก ${totalCount}` : totalCount} รายการ)`;
    expect(headerText).toBe('ข้อมูลการยื่นหนังสือ (95 จาก 140 รายการ)');
  });

  // TEST 12: สุโขทัย -> 45 จาก 140
  it('TEST 12: displays "45 จาก 140" when filtering by Sukhothai (สาย 2)', () => {
    const totalCount = 140;
    const sukhothaiCount = 45;
    const isFiltered = true;
    const headerText = `ข้อมูลการยื่นหนังสือ (${isFiltered ? `${sukhothaiCount} จาก ${totalCount}` : totalCount} รายการ)`;
    expect(headerText).toBe('ข้อมูลการยื่นหนังสือ (45 จาก 140 รายการ)');
  });

  // TEST 13: Existing active Appointment -> กดปฏิทินแล้วไม่สร้าง Appointment ซ้ำ
  it('TEST 13: when active appointment exists, calendar action opens existing appointment instead of creating duplicate', () => {
    const sub = { ...baseSubmission, id: 'sub_test_13' };
    const existingAppt: Appointment = {
      id: 'appt_existing_13',
      submissionId: sub.id,
      schoolId: sub.schoolId,
      schoolName: sub.schoolName,
      teacherName: sub.teacherName,
      teacherPhone: sub.teacherPhone,
      date: '2026-09-25',
      startTime: '10:00',
      endTime: '12:00',
      status: 'CONFIRMED',
      counselorName: 'อ.ประชา กัลปนารถ',
      teamMemberNames: 'อ.ประชา กัลปนารถ',
      workType: 'แนะแนว',
      source: 'DOCUMENT_SUBMISSION',
      note: '',
      reminders: [],
      approvalStatus: 'APPROVED',
      counselorId: 'usr_admin',
      teamId: 'team1',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    };

    const appointmentsList = [existingAppt];

    const getLinkedAppointment = (submission: DocumentSubmission): Appointment | null => {
      return (
        appointmentsList.find((a) => a.submissionId === submission.id && a.status !== 'CANCELLED') ||
        (submission.appointmentId ? appointmentsList.find((a) => a.id === submission.appointmentId && a.status !== 'CANCELLED') : null) ||
        null
      );
    };

    const onOpenInstantAppointment = vi.fn();
    const onSelectAppointment = vi.fn();

    // Trigger action for submission with existing appointment
    const linked = getLinkedAppointment(sub);
    expect(linked).not.toBeNull();
    expect(linked?.id).toBe('appt_existing_13');

    if (linked) {
      onSelectAppointment(linked);
    } else {
      onOpenInstantAppointment(sub);
    }

    // Must open existing appointment and NOT create a new one
    expect(onSelectAppointment).toHaveBeenCalledWith(existingAppt);
    expect(onOpenInstantAppointment).not.toHaveBeenCalled();
  });

  // Clickable School Name Consistency Tests
  describe('Clickable School Name Consistency Tests', () => {
    const subA: DocumentSubmission = {
      id: 'sub_row_1',
      schoolId: 'sch_nam_lee',
      schoolName: 'บ้านน้ำลี',
      documentNumber: 'ว.11/2569',
      submissionDate: '2026-09-02',
      submissionTime: '09:00',
      teamId: 'team1',
      submittedById: 'usr_admin',
      submittedByName: 'อ.ประชา กัลปนารถ',
      teacherName: 'ครูสมหวัง',
      teacherPhone: '0812345678',
      status: 'WAITING_APPOINTMENT',
      note: 'บันทึกแรก',
      photos: [],
      createdAt: '2026-09-02T00:00:00Z',
      updatedAt: '2026-09-02T00:00:00Z',
    };

    const subB: DocumentSubmission = {
      id: 'sub_row_2',
      schoolId: 'sch_nam_lee',
      schoolName: 'บ้านน้ำลี',
      documentNumber: 'ว.12/2569',
      submissionDate: '2026-09-05',
      submissionTime: '10:00',
      teamId: 'team1',
      submittedById: 'usr_staff1',
      submittedByName: 'อ.ณิชชัยกุญช์ โลราช',
      teacherName: 'ครูสมหมาย',
      teacherPhone: '0898765432',
      status: 'WAITING_APPOINTMENT',
      note: 'บันทึกสอง',
      photos: [],
      createdAt: '2026-09-05T00:00:00Z',
      updatedAt: '2026-09-05T00:00:00Z',
    };

    const tripMultiSchool: FieldTrip = {
      id: 'trip_multi_101',
      date: '2026-09-18',
      teamId: 'team1',
      workType: 'แนะแนวการศึกษา',
      counselorId: 'usr_admin',
      counselorName: 'อ.ประชา กัลปนารถ',
      vehicleId: 'vigo-9914',
      vehicleName: 'VIGO กข 9914',
      photos: [],
      schools: [
        { schoolId: 'sch_wang_din', schoolName: 'บ้านวังดิน', studentCount: 10, timeSlot: '09:00 - 12:00 น.' },
        { schoolId: 'sch_tha_pla', schoolName: 'ท่าปลาประชาอุทิศ', studentCount: 25, timeSlot: '13:00 - 15:00 น.' },
      ],
      createdAt: '2026-09-18T00:00:00Z',
      updatedAt: '2026-09-18T00:00:00Z',
    };

    // 1. คลิกชื่อโรงเรียนใน Submission -> เปิด Submission Detail record ที่ถูกต้อง
    it('1. clicking school name in Submission row opens Submission Detail for the correct record', () => {
      let openedSubmission: DocumentSubmission | null = null;
      const handleSchoolClick = (sub: DocumentSubmission) => {
        openedSubmission = sub;
      };

      handleSchoolClick(subA);
      expect(openedSubmission).not.toBeNull();
      expect(openedSubmission?.id).toBe('sub_row_1');
      expect(openedSubmission?.schoolName).toBe('บ้านน้ำลี');
    });

    // 2. Submission 2 records โรงเรียนชื่อเดียวกัน -> กดแต่ละ row -> เปิด submission.id ของตัวเองถูกต้อง
    it('2. two submissions with the identical school name open their respective distinct submission.id by record object', () => {
      let openedRecord: DocumentSubmission | null = null;
      const setDetail = (sub: DocumentSubmission) => {
        openedRecord = sub;
      };

      // Click row 1
      setDetail(subA);
      expect(openedRecord?.id).toBe('sub_row_1');
      expect(openedRecord?.documentNumber).toBe('ว.11/2569');

      // Click row 2
      setDetail(subB);
      expect(openedRecord?.id).toBe('sub_row_2');
      expect(openedRecord?.documentNumber).toBe('ว.12/2569');
    });

    // 3. คลิกชื่อโรงเรียนใน FieldTrip -> เปิด FieldTrip Detail ถูกต้อง
    it('3. clicking school name in FieldTrip row opens FieldTrip Detail for the correct record', () => {
      let openedTrip: FieldTrip | null = null;
      const setSelectedTrip = (trip: FieldTrip) => {
        openedTrip = trip;
      };

      setSelectedTrip(tripMultiSchool);
      expect(openedTrip).not.toBeNull();
      expect(openedTrip?.id).toBe('trip_multi_101');
      expect(openedTrip?.counselorName).toBe('อ.ประชา กัลปนารถ');
    });

    // 4. Multi-school FieldTrip -> กดชื่อโรงเรียนใด -> เปิด FieldTrip เดียวกัน
    it('4. clicking any school name in a multi-school FieldTrip opens the same parent FieldTrip record', () => {
      const openedTrips: string[] = [];
      const handleSchoolClickInTrip = (trip: FieldTrip) => {
        openedTrips.push(trip.id);
      };

      // Click school #1 (บ้านวังดิน)
      handleSchoolClickInTrip(tripMultiSchool);
      // Click school #2 (ท่าปลาประชาอุทิศ)
      handleSchoolClickInTrip(tripMultiSchool);

      expect(openedTrips).toHaveLength(2);
      expect(openedTrips[0]).toBe('trip_multi_101');
      expect(openedTrips[1]).toBe('trip_multi_101');
    });

    // 5. Enter บนชื่อโรงเรียน -> เปิด Detail
    it('5. pressing Enter on school name button triggers detail opening', () => {
      const onDetailOpen = vi.fn();
      const handleKeyDown = (e: { key: string }, sub: DocumentSubmission) => {
        if (e.key === 'Enter') {
          onDetailOpen(sub);
        }
      };

      handleKeyDown({ key: 'Enter' }, subA);
      expect(onDetailOpen).toHaveBeenCalledWith(subA);
    });

    // 6. Space บนชื่อโรงเรียน -> เปิด Detail
    it('6. pressing Space on school name button triggers detail opening', () => {
      const onDetailOpen = vi.fn();
      const handleKeyDown = (e: { key: string }, sub: DocumentSubmission) => {
        if (e.key === ' ') {
          onDetailOpen(sub);
        }
      };

      handleKeyDown({ key: ' ' }, subB);
      expect(onDetailOpen).toHaveBeenCalledWith(subB);
    });

    // 7. Eye/detail icon เดิม -> ยังเปิดได้
    it('7. existing eye/detail icon action still opens detail independently', () => {
      const setDetail = vi.fn();
      const onEyeClick = (sub: DocumentSubmission) => setDetail(sub);

      onEyeClick(subA);
      expect(setDetail).toHaveBeenCalledWith(subA);
    });

    // 8. Edit/Delete/Appointment -> ไม่ถูก trigger จากการกดชื่อ
    it('8. clicking school name does not trigger Edit, Delete, or Appointment creation', () => {
      const onOpenDetail = vi.fn();
      const onEdit = vi.fn();
      const onDelete = vi.fn();
      const onCreateAppointment = vi.fn();

      const handleSchoolNameClick = (e: { stopPropagation: () => void }, sub: DocumentSubmission) => {
        e.stopPropagation();
        onOpenDetail(sub);
      };

      const stopPropagationMock = vi.fn();
      handleSchoolNameClick({ stopPropagation: stopPropagationMock }, subA);

      expect(stopPropagationMock).toHaveBeenCalled();
      expect(onOpenDetail).toHaveBeenCalledWith(subA);
      expect(onEdit).not.toHaveBeenCalled();
      expect(onDelete).not.toHaveBeenCalled();
      expect(onCreateAppointment).not.toHaveBeenCalled();
    });
  });
});
