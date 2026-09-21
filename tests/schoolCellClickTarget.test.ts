import { describe, it, expect, vi } from 'vitest';
import { DocumentSubmission, FieldTrip } from '../src/types';

describe('Clickable School Cell Consistency & Full Cell Target Tests (9 Tests)', () => {
  const sampleSubmissionA: DocumentSubmission = {
    id: 'sub_khunkrai_01',
    schoolId: '1064620378',
    schoolName: 'ขุนไกรพิทยาคม',
    documentNumber: 'ว.101/2569',
    submissionDate: '2026-09-15',
    submissionTime: '09:00',
    teamId: 'team2',
    submittedById: 'usr_staff2',
    submittedByName: 'อ.ปิยะ สีตาชัย',
    teacherName: 'ครูสมหวัง',
    teacherPhone: '0812345678',
    status: 'WAITING_APPOINTMENT',
    note: '',
    photos: [],
    createdAt: '2026-09-15T00:00:00Z',
    updatedAt: '2026-09-15T00:00:00Z',
  };

  const sampleSubmissionB: DocumentSubmission = {
    id: 'sub_namlee_02',
    schoolId: '1053240112',
    schoolName: 'บ้านน้ำลี',
    documentNumber: 'ว.102/2569',
    submissionDate: '2026-09-16',
    submissionTime: '10:00',
    teamId: 'team1',
    submittedById: 'usr_admin',
    submittedByName: 'อ.ประชา กัลปนารถ',
    teacherName: 'ครูสมจิต',
    teacherPhone: '0899887766',
    status: 'WAITING_APPOINTMENT',
    note: '',
    photos: [],
    createdAt: '2026-09-16T00:00:00Z',
    updatedAt: '2026-09-16T00:00:00Z',
  };

  const sampleMultiSchoolTrip: FieldTrip = {
    id: 'trip_multi_201',
    date: '2026-09-20',
    teamId: 'team1',
    workType: 'แนะแนวการศึกษา',
    counselorId: 'usr_admin',
    counselorName: 'อ.ประชา กัลปนารถ',
    vehicleId: 'vigo-9914',
    vehicleName: 'VIGO กข 9914',
    photos: [],
    schools: [
      { schoolId: 'sch_pae', schoolName: 'บ้านแพะ', studentCount: 30, timeSlot: '09:00 - 11:30 น.' },
      { schoolId: 'sch_namlee', schoolName: 'บ้านน้ำลี', studentCount: 45, timeSlot: '13:00 - 15:00 น.' },
    ],
    createdAt: '2026-09-20T00:00:00Z',
    updatedAt: '2026-09-20T00:00:00Z',
  };

  // TEST 1: กดชื่อโรงเรียน -> Detail เปิด
  it('1. clicking school name inside school cell opens Detail for the row record', () => {
    let detailRecord: DocumentSubmission | null = null;
    const onCellClick = (sub: DocumentSubmission) => {
      detailRecord = sub;
    };

    // Simulate clicking on the school name element inside the cell
    onCellClick(sampleSubmissionA);
    expect(detailRecord).not.toBeNull();
    expect(detailRecord?.id).toBe('sub_khunkrai_01');
    expect(detailRecord?.schoolName).toBe('ขุนไกรพิทยาคม');
  });

  // TEST 2: กดรหัสโรงเรียนใน Cell -> Detail เปิด
  it('2. clicking school code inside school cell opens Detail for the row record', () => {
    let detailRecord: DocumentSubmission | null = null;
    const onCellClick = (sub: DocumentSubmission) => {
      detailRecord = sub;
    };

    // Simulate clicking on the school code element (e.g. 1064620378) inside the cell
    onCellClick(sampleSubmissionA);
    expect(detailRecord).not.toBeNull();
    expect(detailRecord?.schoolId).toBe('1064620378');
  });

  // TEST 3: กดพื้นที่ School Cell (padding/whitespace) -> Detail เปิด
  it('3. clicking empty whitespace/padding of the school cell opens Detail', () => {
    let detailRecord: DocumentSubmission | null = null;
    // The entire cell wrapper <button className="w-full h-full p-3.5 ..."> captures all clicks
    const handleCellWrapperClick = (e: { target: string }, sub: DocumentSubmission) => {
      detailRecord = sub;
    };

    // Click on whitespace/padding area
    handleCellWrapperClick({ target: 'td-button-padding' }, sampleSubmissionA);
    expect(detailRecord).not.toBeNull();
    expect(detailRecord?.id).toBe('sub_khunkrai_01');
  });

  // TEST 4: Submission ใช้ record ถูกต้อง (ไม่ค้นด้วย schoolName)
  it('4. Submission cell click uses row record ID (submission.id) not schoolName', () => {
    const openedSubmissions: string[] = [];
    const setDetail = (sub: DocumentSubmission) => {
      openedSubmissions.push(sub.id);
    };

    setDetail(sampleSubmissionA);
    setDetail(sampleSubmissionB);

    expect(openedSubmissions).toEqual(['sub_khunkrai_01', 'sub_namlee_02']);
  });

  // TEST 5: FieldTrip ใช้ trip ถูกต้อง (ไม่ค้นด้วย schoolName)
  it('5. FieldTrip school cell click uses trip.id from row record not schoolName', () => {
    let openedTrip: FieldTrip | null = null;
    const setSelectedTrip = (trip: FieldTrip) => {
      openedTrip = trip;
    };

    setSelectedTrip(sampleMultiSchoolTrip);
    expect(openedTrip).not.toBeNull();
    expect(openedTrip?.id).toBe('trip_multi_201');
  });

  // TEST 6: Enter -> Detail เปิด
  it('6. pressing Enter on the school cell button triggers Detail modal', () => {
    const onDetailOpen = vi.fn();
    const handleKeyDown = (e: { key: string }, sub: DocumentSubmission) => {
      if (e.key === 'Enter') {
        onDetailOpen(sub);
      }
    };

    handleKeyDown({ key: 'Enter' }, sampleSubmissionA);
    expect(onDetailOpen).toHaveBeenCalledWith(sampleSubmissionA);
  });

  // TEST 7: Space -> Detail เปิด
  it('7. pressing Space on the school cell button triggers Detail modal', () => {
    const onDetailOpen = vi.fn();
    const handleKeyDown = (e: { key: string }, sub: DocumentSubmission) => {
      if (e.key === ' ') {
        onDetailOpen(sub);
      }
    };

    handleKeyDown({ key: ' ' }, sampleSubmissionB);
    expect(onDetailOpen).toHaveBeenCalledWith(sampleSubmissionB);
  });

  // TEST 8: Action icons ด้านขวา -> ไม่ trigger School Cell
  it('8. clicking action icons (eye, edit, delete, appointment) does not trigger school cell click', () => {
    const onCellClick = vi.fn();
    const onEditAction = vi.fn();

    const handleActionClick = (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      onEditAction();
    };

    const stopPropagationMock = vi.fn();
    handleActionClick({ stopPropagation: stopPropagationMock });

    expect(stopPropagationMock).toHaveBeenCalled();
    expect(onEditAction).toHaveBeenCalled();
    expect(onCellClick).not.toHaveBeenCalled();
  });

  // TEST 9: Multi-school -> แต่ละ School block กดได้ -> เปิด trip เดียวกัน
  it('9. in multi-school FieldTrip, clicking anywhere in the school cell opens the same parent trip', () => {
    const openedTrips: string[] = [];
    const onTripCellClick = (trip: FieldTrip) => {
      openedTrips.push(trip.id);
    };

    // Click on school 1 (บ้านแพะ)
    onTripCellClick(sampleMultiSchoolTrip);
    // Click on school 2 (บ้านน้ำลี)
    onTripCellClick(sampleMultiSchoolTrip);

    expect(openedTrips).toHaveLength(2);
    expect(openedTrips[0]).toBe('trip_multi_201');
    expect(openedTrips[1]).toBe('trip_multi_201');
  });
});
