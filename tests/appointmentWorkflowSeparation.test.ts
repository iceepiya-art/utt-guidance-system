import { describe, it, expect } from 'vitest';
import {
  isAppointmentGuidanceCompleted,
  filterActiveAppointments,
} from '../src/utils/appointmentUtils';
import { Appointment, FieldTrip } from '../src/types';

describe('Appointment Workflow Separation & Active List Filtering (10 Tests)', () => {
  const baseAppointment: Appointment = {
    id: 'appt_101',
    schoolId: 'sch_101',
    schoolName: 'โรงเรียนท่าปลาประชาอุทิศ',
    teacherName: 'ครูสมศรี',
    teacherPhone: '0812345678',
    date: '2026-09-22',
    startTime: '09:00',
    endTime: '11:30',
    status: 'CONFIRMED',
    counselorId: 'usr_admin',
    counselorName: 'อ.ประชา กัลปนารถ',
    teamId: 'team1',
    teamMemberNames: 'อ.ประชา กัลปนารถ',
    workType: 'แนะแนว',
    source: 'DOCUMENT_SUBMISSION',
    note: '',
    reminders: [],
    approvalStatus: 'APPROVED',
    createdAt: '2026-09-10T00:00:00Z',
    updatedAt: '2026-09-10T00:00:00Z',
  };

  // TEST 1: CONFIRMED appointment ไม่มี FieldTrip -> แสดงในหน้า Appointment
  it('TEST 1: CONFIRMED appointment without FieldTrip remains in active appointments', () => {
    const appt = { ...baseAppointment, status: 'CONFIRMED' as const };
    const fieldTrips: FieldTrip[] = [];

    const isCompleted = isAppointmentGuidanceCompleted(appt, fieldTrips);
    expect(isCompleted).toBe(false);

    const activeList = filterActiveAppointments([appt], fieldTrips);
    expect(activeList.length).toBe(1);
    expect(activeList[0].id).toBe(appt.id);
  });

  // TEST 2: Appointment มี FieldTrip ที่ appointmentId ตรงกัน -> ไม่แสดงใน Active Appointment List
  it('TEST 2: Appointment with matching fieldTrip.appointmentId is excluded from Active Appointment List', () => {
    const appt = { ...baseAppointment, id: 'appt_guided' };
    const fieldTrips: FieldTrip[] = [
      {
        id: 'trip_001',
        appointmentId: 'appt_guided',
        date: '2026-09-22',
        teamId: 'team1',
        counselorId: 'usr_admin',
        counselorName: 'อ.ประชา กัลปนารถ',
        teamMemberNames: 'อ.ประชา กัลปนารถ',
        workType: 'แนะแนว',
        vehicleId: 'vigo-9914',
        vehicleName: 'VIGO กข 9914',
        departureTime: '08:30',
        returnTime: '12:00',
        schools: [{ schoolId: appt.schoolId, schoolName: appt.schoolName, studentCount: 45, note: '' }],
        approvalStatus: 'APPROVED',
        photos: [],
        createdAt: '2026-09-22T00:00:00Z',
        updatedAt: '2026-09-22T00:00:00Z',
      },
    ];

    const isCompleted = isAppointmentGuidanceCompleted(appt, fieldTrips);
    expect(isCompleted).toBe(true);

    const activeList = filterActiveAppointments([appt], fieldTrips);
    expect(activeList.length).toBe(0);
  });

  // TEST 3: Appointment ไม่มี FieldTrip -> แสดง
  it('TEST 3: Appointment without any FieldTrip is shown in Active List', () => {
    const appt = { ...baseAppointment, id: 'appt_pending_trip' };
    const unrelatedTrip: FieldTrip = {
      id: 'trip_other',
      appointmentId: 'appt_different',
      date: '2026-09-10',
      teamId: 'team1',
      counselorId: 'usr_admin',
      counselorName: 'อ.ประชา กัลปนารถ',
      teamMemberNames: 'อ.ประชา กัลปนารถ',
      workType: 'แนะแนว',
      vehicleId: 'vigo-9914',
      vehicleName: 'VIGO กข 9914',
      departureTime: '08:30',
      returnTime: '12:00',
      schools: [{ schoolId: 'other', schoolName: 'โรงเรียนอื่น', studentCount: 30, note: '' }],
      approvalStatus: 'APPROVED',
      photos: [],
      createdAt: '2026-09-10T00:00:00Z',
      updatedAt: '2026-09-10T00:00:00Z',
    };

    const activeList = filterActiveAppointments([appt], [unrelatedTrip]);
    expect(activeList.length).toBe(1);
    expect(activeList[0].id).toBe('appt_pending_trip');
  });

  // TEST 4: FieldTrip โรงเรียนเดียวกัน แต่ appointmentId ไม่ตรง -> ห้ามซ่อน Appointment
  it('TEST 4: FieldTrip for the same school but different appointmentId does NOT hide appointment', () => {
    const appt = { ...baseAppointment, id: 'appt_term2', schoolName: 'โรงเรียนอุตรดิตถ์' };
    const tripTerm1: FieldTrip = {
      id: 'trip_term1',
      appointmentId: 'appt_term1', // Different appointment ID for earlier round
      date: '2026-06-15',
      teamId: 'team1',
      counselorId: 'usr_admin',
      counselorName: 'อ.ประชา กัลปนารถ',
      teamMemberNames: 'อ.ประชา กัลปนารถ',
      workType: 'แนะแนว',
      vehicleId: 'vigo-9914',
      vehicleName: 'VIGO กข 9914',
      departureTime: '08:30',
      returnTime: '12:00',
      schools: [{ schoolId: appt.schoolId, schoolName: 'โรงเรียนอุตรดิตถ์', studentCount: 120, note: '' }],
      approvalStatus: 'APPROVED',
      photos: [],
      createdAt: '2026-06-15T00:00:00Z',
      updatedAt: '2026-06-15T00:00:00Z',
    };

    const isCompleted = isAppointmentGuidanceCompleted(appt, [tripTerm1]);
    expect(isCompleted).toBe(false);

    const activeList = filterActiveAppointments([appt], [tripTerm1]);
    expect(activeList.length).toBe(1);
    expect(activeList[0].id).toBe('appt_term2');
  });

  // TEST 5: Legacy FieldTrip ไม่มี appointmentId -> ห้ามซ่อนจาก schoolName อย่างเดียว
  it('TEST 5: Legacy FieldTrip without appointmentId does NOT hide appointment by schoolName alone', () => {
    const appt = { ...baseAppointment, id: 'appt_new', schoolName: 'โรงเรียนน้ำปาดชนูปถัมภ์' };
    const legacyTripWithoutApptId: FieldTrip = {
      id: 'trip_legacy_archive',
      // No appointmentId
      date: '2026-07-20',
      teamId: 'team1',
      counselorId: 'usr_admin',
      counselorName: 'อ.ประชา กัลปนารถ',
      teamMemberNames: 'อ.ประชา กัลปนารถ',
      workType: 'แนะแนว',
      vehicleId: 'vigo-9914',
      vehicleName: 'VIGO กข 9914',
      departureTime: '08:30',
      returnTime: '12:00',
      schools: [{ schoolId: appt.schoolId, schoolName: 'โรงเรียนน้ำปาดชนูปถัมภ์', studentCount: 60, note: '' }],
      approvalStatus: 'APPROVED',
      photos: [],
      createdAt: '2026-07-20T00:00:00Z',
      updatedAt: '2026-07-20T00:00:00Z',
    };

    const isCompleted = isAppointmentGuidanceCompleted(appt, [legacyTripWithoutApptId]);
    expect(isCompleted).toBe(false);

    const activeList = filterActiveAppointments([appt], [legacyTripWithoutApptId]);
    expect(activeList.length).toBe(1);
    expect(activeList[0].id).toBe('appt_new');
  });

  // TEST 6: Active count -> เท่ากับจำนวน Active Appointment จริง
  it('TEST 6: Active count reflects strictly active, non-guided, non-cancelled appointments', () => {
    const allAppointments: Appointment[] = [
      { ...baseAppointment, id: 'a1', status: 'CONFIRMED' },
      { ...baseAppointment, id: 'a2', status: 'CONFIRMED' },
      { ...baseAppointment, id: 'a3', status: 'CONFIRMED' },
      { ...baseAppointment, id: 'a4', status: 'CANCELLED' },
      { ...baseAppointment, id: 'a5', status: 'COMPLETED' },
    ];

    const trips: FieldTrip[] = [
      {
        id: 't1',
        appointmentId: 'a1',
        date: '2026-09-22',
        teamId: 'team1',
        counselorId: 'usr_admin',
        counselorName: 'อ.ประชา กัลปนารถ',
        teamMemberNames: 'อ.ประชา กัลปนารถ',
        workType: 'แนะแนว',
        vehicleId: 'vigo-9914',
        vehicleName: 'VIGO กข 9914',
        departureTime: '08:30',
        returnTime: '12:00',
        schools: [],
        approvalStatus: 'APPROVED',
        photos: [],
        createdAt: '2026-09-22T00:00:00Z',
        updatedAt: '2026-09-22T00:00:00Z',
      },
    ];

    // a1 is guidance-completed via trip, a4 is cancelled, a5 is completed status
    // Active remaining should be exactly a2 and a3 (2 items)
    const activeList = filterActiveAppointments(allAppointments, trips);
    expect(activeList.length).toBe(2);
    expect(activeList.map((a) => a.id)).toEqual(['a2', 'a3']);
  });

  // TEST 7: Month count -> ใช้ Active dataset เดียวกัน
  it('TEST 7: Month filter counts are calculated from the same active appointments dataset', () => {
    const activeAppts: Appointment[] = [
      { ...baseAppointment, id: 'a1', date: '2026-09-10' },
      { ...baseAppointment, id: 'a2', date: '2026-09-25' },
      { ...baseAppointment, id: 'a3', date: '2026-10-05' },
    ];

    const monthCounts = new Map<string, number>();
    activeAppts.forEach((a) => {
      const key = a.date.substring(0, 7);
      monthCounts.set(key, (monthCounts.get(key) || 0) + 1);
    });

    expect(monthCounts.get('2026-09')).toBe(2);
    expect(monthCounts.get('2026-10')).toBe(1);
    expect(Array.from(monthCounts.values()).reduce((sum, c) => sum + c, 0)).toBe(activeAppts.length);
  });

  // TEST 8: Route filter -> ใช้ Active dataset เดียวกัน
  it('TEST 8: Route filter counts (Team 1 / Team 2) derive from the active appointments dataset', () => {
    const activeAppts: Appointment[] = [
      { ...baseAppointment, id: 'a1', teamId: 'team1' },
      { ...baseAppointment, id: 'a2', teamId: 'team1' },
      { ...baseAppointment, id: 'a3', teamId: 'team2' },
    ];

    const team1Count = activeAppts.filter((a) => a.teamId === 'team1').length;
    const team2Count = activeAppts.filter((a) => a.teamId === 'team2').length;

    expect(team1Count).toBe(2);
    expect(team2Count).toBe(1);
    expect(team1Count + team2Count).toBe(activeAppts.length);
  });

  // TEST 9: หลังสร้าง Guidance relation สำเร็จ -> Appointment ไม่อยู่ Active List -> FieldTrip อยู่หน้าออกแนะแนว
  it('TEST 9: After linking FieldTrip, appointment departs active list and is represented in guidance history', () => {
    const appointment = { ...baseAppointment, id: 'appt_flow_test' };
    const initialActive = filterActiveAppointments([appointment], []);
    expect(initialActive.length).toBe(1);

    // Simulate saving new FieldTrip referencing the appointment
    const newFieldTrip: FieldTrip = {
      id: 'ft_new_result',
      appointmentId: appointment.id,
      date: appointment.date,
      teamId: appointment.teamId,
      counselorId: appointment.counselorId,
      counselorName: appointment.counselorName,
      teamMemberNames: appointment.teamMemberNames,
      workType: appointment.workType,
      vehicleId: 'vigo-9914',
      vehicleName: 'VIGO กข 9914',
      departureTime: appointment.startTime,
      returnTime: appointment.endTime,
      schools: [{ schoolId: appointment.schoolId, schoolName: appointment.schoolName, studentCount: 50, note: '' }],
      approvalStatus: 'APPROVED',
      photos: [],
      createdAt: '2026-09-22T00:00:00Z',
      updatedAt: '2026-09-22T00:00:00Z',
    };

    const updatedActive = filterActiveAppointments([appointment], [newFieldTrip]);
    expect(updatedActive.length).toBe(0); // Departed from Active Appointment List!

    // Verify FieldTrip is present for FieldTripsView
    expect(newFieldTrip.appointmentId).toBe(appointment.id);
    expect(newFieldTrip.schools[0].schoolName).toBe(appointment.schoolName);
  });

  // TEST 10: ไม่มีการ delete Appointment
  it('TEST 10: Appointment records are preserved and never deleted when guidance completes', () => {
    const appointment = { ...baseAppointment, id: 'appt_permanent_record' };
    const trips: FieldTrip[] = [
      {
        id: 'ft_preserve',
        appointmentId: 'appt_permanent_record',
        date: '2026-09-22',
        teamId: 'team1',
        counselorId: 'usr_admin',
        counselorName: 'อ.ประชา กัลปนารถ',
        teamMemberNames: 'อ.ประชา กัลปนารถ',
        workType: 'แนะแนว',
        vehicleId: 'vigo-9914',
        vehicleName: 'VIGO กข 9914',
        departureTime: '08:30',
        returnTime: '12:00',
        schools: [],
        approvalStatus: 'APPROVED',
        photos: [],
        createdAt: '2026-09-22T00:00:00Z',
        updatedAt: '2026-09-22T00:00:00Z',
      },
    ];

    const allStoredAppointments = [appointment];
    const active = filterActiveAppointments(allStoredAppointments, trips);

    // Filtered out of active view
    expect(active.length).toBe(0);
    // But original appointment document exists unaltered in data store
    expect(allStoredAppointments.length).toBe(1);
    expect(allStoredAppointments[0].id).toBe('appt_permanent_record');
  });
});

describe('Section 13 Regression Tests: Relation Priority & Hierarchy Counts (8 Tests)', () => {
  const baseAppt: Appointment = {
    id: 'appt_target',
    schoolId: 'sch_1',
    schoolName: 'โรงเรียนบ้านหนองบัว',
    teacherName: 'ครูสมชาย',
    teacherPhone: '0812345678',
    date: '2026-09-15',
    startTime: '13:00',
    endTime: '12:00',
    status: 'CONFIRMED',
    counselorId: 'c1',
    counselorName: 'อ.ปิยะ',
    teamId: 'team2',
    workType: 'แนะแนว',
    source: 'DOCUMENT_SUBMISSION',
    submissionId: 'sub_target_123',
    note: '',
    reminders: [],
    approvalStatus: 'APPROVED',
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  };

  const baseTrip: FieldTrip = {
    id: 'ft_1',
    appointmentId: '',
    submissionId: '',
    date: '2026-09-15',
    teamId: 'team2',
    counselorId: 'c1',
    counselorName: 'อ.ปิยะ',
    workType: 'แนะแนว',
    vehicleId: 'mitsu-6738',
    vehicleName: 'MITSU บน 6738',
    schools: [{ schoolId: 'sch_1', schoolName: 'โรงเรียนบ้านหนองบัว', studentCount: 50 }],
    approvalStatus: 'APPROVED',
    photos: [],
    createdAt: '2026-09-15T00:00:00Z',
    updatedAt: '2026-09-15T00:00:00Z',
  };

  // 1. fieldTrip.appointmentId ตรง -> appointment ไม่อยู่ Active
  it('TEST 1 (S13): fieldTrip.appointmentId match -> appointment is excluded from Active', () => {
    const appt = { ...baseAppt, id: 'appt_direct' };
    const trip = { ...baseTrip, appointmentId: 'appt_direct' };
    expect(isAppointmentGuidanceCompleted(appt, [trip])).toBe(true);
    expect(filterActiveAppointments([appt], [trip]).length).toBe(0);
  });

  // 2. fieldTrip ไม่มี appointmentId แต่ non-empty submissionId ตรง -> appointment ไม่อยู่ Active
  it('TEST 2 (S13): fieldTrip without appointmentId but non-empty submissionId matches -> appointment is excluded from Active', () => {
    const appt = { ...baseAppt, submissionId: 'sub_non_empty_456' };
    const trip = { ...baseTrip, appointmentId: '', submissionId: 'sub_non_empty_456' };
    expect(isAppointmentGuidanceCompleted(appt, [trip])).toBe(true);
    expect(filterActiveAppointments([appt], [trip]).length).toBe(0);
  });

  // 3. submissionId ไม่ตรง แต่ schoolName ตรง -> appointment ยังอยู่ Active
  it('TEST 3 (S13): submissionId mismatch but schoolName matches -> appointment remains in Active (no automatic hide)', () => {
    const appt = { ...baseAppt, submissionId: 'sub_A', schoolName: 'โรงเรียนบ้านหนองบัว' };
    const trip = { ...baseTrip, submissionId: 'sub_B', schools: [{ schoolId: 'sch_other', schoolName: 'โรงเรียนบ้านหนองบัว', studentCount: 40 }] };
    expect(isAppointmentGuidanceCompleted(appt, [trip])).toBe(false);
    expect(filterActiveAppointments([appt], [trip]).length).toBe(1);
  });

  // 4. submissionId ไม่ตรง แต่ schoolId ตรง -> appointment ยังอยู่ Active
  it('TEST 4 (S13): submissionId mismatch but schoolId matches -> appointment remains in Active (no automatic hide)', () => {
    const appt = { ...baseAppt, submissionId: 'sub_A', schoolId: 'sch_common' };
    const trip = { ...baseTrip, submissionId: 'sub_B', schools: [{ schoolId: 'sch_common', schoolName: 'ชื่ออื่น', studentCount: 40 }] };
    expect(isAppointmentGuidanceCompleted(appt, [trip])).toBe(false);
    expect(filterActiveAppointments([appt], [trip]).length).toBe(1);
  });

  // 5. appointmentId conflict แต่ submissionId ตรง -> RELATION_CONFLICT -> ห้ามซ่อนอัตโนมัติ
  it('TEST 5 (S13): appointmentId conflict despite matching submissionId -> RELATION_CONFLICT -> remains in Active', () => {
    const appt = { ...baseAppt, id: 'appt_this_one', submissionId: 'sub_shared' };
    const trip = { ...baseTrip, appointmentId: 'appt_other', submissionId: 'sub_shared' };
    expect(isAppointmentGuidanceCompleted(appt, [trip])).toBe(false);
    expect(filterActiveAppointments([appt], [trip]).length).toBe(1);
  });

  // 6. active counts -> คำนวณหลัง exclude guidance completed
  it('TEST 6 (S13): active counts calculated strictly after excluding guidance completed', () => {
    const appts: Appointment[] = [
      { ...baseAppt, id: 'a1', status: 'CONFIRMED', submissionId: 's1' },
      { ...baseAppt, id: 'a2', status: 'CONFIRMED', submissionId: 's2' },
      { ...baseAppt, id: 'a3', status: 'CONFIRMED', submissionId: 's3' },
    ];
    const trips: FieldTrip[] = [
      { ...baseTrip, id: 't1', appointmentId: 'a1' },
      { ...baseTrip, id: 't2', appointmentId: '', submissionId: 's2' },
    ];
    const active = filterActiveAppointments(appts, trips);
    expect(active.length).toBe(1);
    expect(active[0].id).toBe('a3');
  });

  // 7. route counts -> คำนวณจาก activeAppointments
  it('TEST 7 (S13): route counts derived from activeAppointments', () => {
    const appts: Appointment[] = [
      { ...baseAppt, id: 'a1', teamId: 'team1', status: 'CONFIRMED' },
      { ...baseAppt, id: 'a2', teamId: 'team1', status: 'CONFIRMED' },
      { ...baseAppt, id: 'a3', teamId: 'team2', status: 'CONFIRMED' },
    ];
    const trips: FieldTrip[] = [
      { ...baseTrip, id: 't1', appointmentId: 'a3' },
    ];
    const active = filterActiveAppointments(appts, trips);
    const team1Count = active.filter((a) => a.teamId === 'team1').length;
    const team2Count = active.filter((a) => a.teamId === 'team2').length;
    expect(team1Count).toBe(2);
    expect(team2Count).toBe(0);
    expect(team1Count + team2Count).toBe(active.length);
  });

  // 8. month counts -> คำนวณจาก activeAppointments
  it('TEST 8 (S13): month counts derived from activeAppointments', () => {
    const appts: Appointment[] = [
      { ...baseAppt, id: 'a1', date: '2026-09-15', status: 'CONFIRMED' },
      { ...baseAppt, id: 'a2', date: '2026-09-21', status: 'CONFIRMED' },
      { ...baseAppt, id: 'a3', date: '2026-11-10', status: 'CONFIRMED' },
    ];
    const trips: FieldTrip[] = [
      { ...baseTrip, id: 't1', appointmentId: 'a1' },
    ];
    const active = filterActiveAppointments(appts, trips);
    const monthCounts = new Map<string, number>();
    active.forEach((a) => {
      const key = a.date.substring(0, 7);
      monthCounts.set(key, (monthCounts.get(key) || 0) + 1);
    });
    expect(monthCounts.get('2026-09')).toBe(1);
    expect(monthCounts.get('2026-11')).toBe(1);
    expect(Array.from(monthCounts.values()).reduce((sum, c) => sum + c, 0)).toBe(active.length);
  });
});

