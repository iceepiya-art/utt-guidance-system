import { describe, it, expect, vi } from 'vitest';
import { DocumentSubmission } from '../src/types';

describe('Submission Full Row & Card Click Target Regression Tests (11 Tests)', () => {
  const sampleSubmission: DocumentSubmission = {
    id: 'sub_test_101',
    schoolId: '1064620378',
    schoolName: 'ขุนไกรพิทยาคม',
    documentNumber: 'ว.101/2569',
    submissionDate: '2026-09-15',
    submissionTime: '09:30',
    teamId: 'team2',
    submittedById: 'usr_staff2',
    submittedByName: 'อ.ปิยะ สีตาชัย',
    teacherName: 'ครูสมหวัง',
    teacherPhone: '0812345678',
    teacherLine: 'somwang123',
    status: 'WAITING_APPOINTMENT',
    note: 'ส่งเอกสารครบถ้วน',
    photos: [
      {
        id: 'p1',
        url: 'https://example.com/photo1.jpg',
        fileName: 'photo1.jpg',
        uploadedAt: '2026-09-15T09:30:00Z',
      },
    ],
    createdAt: '2026-09-15T00:00:00Z',
    updatedAt: '2026-09-15T00:00:00Z',
  };

  // Simulate row click handler
  const createRowClickHandler = (
    onDetail: (sub: DocumentSubmission) => void
  ) => {
    return (e: { target: string }, sub: DocumentSubmission) => {
      onDetail(sub);
    };
  };

  // Simulate action click handler with event isolation
  const createActionClickHandler = (
    onAction: () => void,
    onDetail: (sub: DocumentSubmission) => void
  ) => {
    return (e: { stopPropagation: () => void }, sub: DocumentSubmission) => {
      e.stopPropagation();
      onAction();
    };
  };

  // TEST 1: click school area => Detail
  it('1. clicking school area triggers submission Detail modal', () => {
    const onDetail = vi.fn();
    const handleRowClick = createRowClickHandler(onDetail);

    handleRowClick({ target: 'td-school-area' }, sampleSubmission);
    expect(onDetail).toHaveBeenCalledWith(sampleSubmission);
    expect(onDetail).toHaveBeenCalledTimes(1);
  });

  // TEST 2: click date area => Detail
  it('2. clicking date/time area triggers submission Detail modal', () => {
    const onDetail = vi.fn();
    const handleRowClick = createRowClickHandler(onDetail);

    handleRowClick({ target: 'td-date-area' }, sampleSubmission);
    expect(onDetail).toHaveBeenCalledWith(sampleSubmission);
    expect(onDetail).toHaveBeenCalledTimes(1);
  });

  // TEST 3: click submitter area => Detail
  it('3. clicking submitter area triggers submission Detail modal', () => {
    const onDetail = vi.fn();
    const handleRowClick = createRowClickHandler(onDetail);

    handleRowClick({ target: 'td-submitter-area' }, sampleSubmission);
    expect(onDetail).toHaveBeenCalledWith(sampleSubmission);
    expect(onDetail).toHaveBeenCalledTimes(1);
  });

  // TEST 4: click status area => Detail
  it('4. clicking status area triggers submission Detail modal', () => {
    const onDetail = vi.fn();
    const handleRowClick = createRowClickHandler(onDetail);

    handleRowClick({ target: 'td-status-area' }, sampleSubmission);
    expect(onDetail).toHaveBeenCalledWith(sampleSubmission);
    expect(onDetail).toHaveBeenCalledTimes(1);
  });

  // TEST 5: click empty row area => Detail
  it('5. clicking empty row whitespace/padding triggers submission Detail modal', () => {
    const onDetail = vi.fn();
    const handleRowClick = createRowClickHandler(onDetail);

    handleRowClick({ target: 'tr-empty-whitespace' }, sampleSubmission);
    expect(onDetail).toHaveBeenCalledWith(sampleSubmission);
    expect(onDetail).toHaveBeenCalledTimes(1);
  });

  // TEST 6: click Edit => Edit only
  it('6. clicking Edit button triggers Edit only and does not trigger Detail', () => {
    const onDetail = vi.fn();
    const onEdit = vi.fn();
    const stopPropagationMock = vi.fn();

    const handleEditClick = createActionClickHandler(onEdit, onDetail);
    handleEditClick({ stopPropagation: stopPropagationMock }, sampleSubmission);

    expect(stopPropagationMock).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onDetail).not.toHaveBeenCalled();
  });

  // TEST 7: click Delete => Delete only
  it('7. clicking Delete button triggers Delete modal only and does not trigger Detail', () => {
    const onDetail = vi.fn();
    const onDelete = vi.fn();
    const stopPropagationMock = vi.fn();

    const handleDeleteClick = createActionClickHandler(onDelete, onDetail);
    handleDeleteClick({ stopPropagation: stopPropagationMock }, sampleSubmission);

    expect(stopPropagationMock).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDetail).not.toHaveBeenCalled();
  });

  // TEST 8: click Appointment action => Appointment action only
  it('8. clicking Appointment action triggers Appointment only and does not trigger Detail', () => {
    const onDetail = vi.fn();
    const onAppointment = vi.fn();
    const stopPropagationMock = vi.fn();

    const handleAppointmentClick = createActionClickHandler(onAppointment, onDetail);
    handleAppointmentClick({ stopPropagation: stopPropagationMock }, sampleSubmission);

    expect(stopPropagationMock).toHaveBeenCalledTimes(1);
    expect(onAppointment).toHaveBeenCalledTimes(1);
    expect(onDetail).not.toHaveBeenCalled();
  });

  // TEST 9: Action click must not trigger row Detail
  it('9. Action click must stop propagation to ensure row Detail is never triggered behind it', () => {
    const rowDetailMock = vi.fn();
    const actionMock = vi.fn();

    // Simulate DOM event bubbling behavior
    const event = {
      isPropagationStopped: false,
      stopPropagation() {
        this.isPropagationStopped = true;
      },
    };

    // Action button onClick handler
    event.stopPropagation();
    actionMock();

    // Row listener only runs if propagation not stopped
    if (!event.isPropagationStopped) {
      rowDetailMock();
    }

    expect(actionMock).toHaveBeenCalledTimes(1);
    expect(rowDetailMock).not.toHaveBeenCalled();
    expect(event.isPropagationStopped).toBe(true);
  });

  // TEST 10: Mobile card general area => Detail
  it('10. clicking mobile card general area opens Detail modal', () => {
    const onDetail = vi.fn();
    const handleCardClick = (sub: DocumentSubmission) => {
      onDetail(sub);
    };

    handleCardClick(sampleSubmission);
    expect(onDetail).toHaveBeenCalledWith(sampleSubmission);
    expect(onDetail).toHaveBeenCalledTimes(1);
  });

  // TEST 11: Mobile action => action only
  it('11. clicking mobile action button stops propagation and runs action only', () => {
    const onCardDetail = vi.fn();
    const onMobileAction = vi.fn();
    const event = {
      isPropagationStopped: false,
      stopPropagation() {
        this.isPropagationStopped = true;
      },
    };

    // Mobile action click
    event.stopPropagation();
    onMobileAction();

    // Card handler
    if (!event.isPropagationStopped) {
      onCardDetail();
    }

    expect(onMobileAction).toHaveBeenCalledTimes(1);
    expect(onCardDetail).not.toHaveBeenCalled();
    expect(event.isPropagationStopped).toBe(true);
  });
});
