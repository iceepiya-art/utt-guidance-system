import { describe, it, expect } from 'vitest';
import type { School, Appointment, DocumentSubmission, FieldTrip } from '../src/types';
import { getSchoolWorkflow, getSchoolEffectiveStatus } from '../src/utils/schoolStatus';

const a = { id: 'doc-a', schoolId: '100001', schoolName: 'โรงเรียนบ้านตัวอย่าง', currentStatus: 'NOT_STARTED' } as School;
const b = { ...a, id: 'doc-b', schoolId: '100002' };
const sub = { id: 'sub-a', schoolId: a.id, submissionDate: '2026-09-01', status: 'WAITING_APPOINTMENT' } as DocumentSubmission;
const appt = { id: 'appt-a', schoolId: a.id, submissionId: sub.id, date: '2026-09-02', status: 'CONFIRMED' } as Appointment;
const trip = { id: 'trip-a', date: '2026-09-03', workType: 'แนะแนว', schools: [{ schoolId: a.id, schoolName: a.schoolName }] } as FieldTrip;
const workflow = (subs: DocumentSubmission[] = [], appts: Appointment[] = [], trips: FieldTrip[] = [], catalog = [a,b]) => getSchoolWorkflow(a, subs, appts, trips, catalog);
describe('School workflow status and stable relationships', () => {
  it('supports reverse links stored on a submission', () => {
    const result = workflow([{ ...sub, appointmentId: appt.id, fieldTripId: trip.id }], [{ ...appt, schoolId: '', submissionId: '' }], [{ ...trip, schools: [] }]);
    expect(result.schoolAppointments).toHaveLength(1);
    expect(result.schoolTrips).toHaveLength(1);
    expect(result.status).toBe('GUIDANCE_COMPLETED');
  });
  it('keeps recorded legacy completion when older submission history exists', () => {
    expect(getSchoolWorkflow({ ...a, currentStatus: 'GUIDANCE_COMPLETED' }, [sub], [], [], [a,b]).storedCompletionOnly).toBe(true);
  });
  it('completes from actual trip even when stored school status is stale', () => expect(workflow([sub], [appt], [trip]).status).toBe('GUIDANCE_COMPLETED'));
  it('resolves unique legacy codes to the document school', () => expect(workflow([], [], [{ ...trip, schools: [{ schoolId: a.schoolId, schoolName: '' }] }]).status).toBe('GUIDANCE_COMPLETED'));
  it('rejects ambiguous legacy codes', () => expect(workflow([], [], [{ ...trip, schools: [{ schoolId: a.schoolId, schoolName: '' }] }], [a,{...b,schoolId:a.schoolId}]).schoolTrips).toEqual([]));
  it('never joins schools by identical name', () => expect(workflow([], [], [{ ...trip, schools: [{ schoolId: b.id, schoolName: a.schoolName }] }]).schoolTrips).toEqual([]));
  it('resolves missing school relation using explicit appointment relation', () => expect(workflow([sub], [appt], [{ ...trip, appointmentId: appt.id, schools: [] }]).schoolTrips).toHaveLength(1));
  it('resolves a submission relation without a school name guess', () => expect(workflow([sub], [], [{ ...trip, submissionId: sub.id, schools: [] }]).schoolTrips).toHaveLength(1));
  it('explicit other-school entries win over a conflicting parent', () => expect(workflow([sub], [appt], [{ ...trip, appointmentId: appt.id, schools: [{ schoolId: b.id, schoolName: '' }] }]).schoolTrips).toHaveLength(0));
  it('shows legacy completed appointments without inventing trips', () => { const result = workflow([sub], [{...appt,status:'COMPLETED'}]); expect(result.status).toBe('APPOINTED'); expect(result.schoolTrips).toEqual([]); expect(result.completedAppointments).toHaveLength(1); });
  it('cancellation is not an active appointment', () => { const result = workflow([sub], [{...appt,status:'CANCELLED'}]); expect(result.status).toBe('CANCELLED'); expect(result.activeAppointments).toEqual([]); });
  it('photos and note text are not proof of completion', () => expect(workflow([], [{...appt,note:'ยังไม่ได้แนะแนวแล้ว',photos:[{url:'photo'} as any]}]).status).toBe('APPOINTED'));
  it('does not count a letter-delivery trip as guidance', () => expect(workflow([], [], [{...trip,workType:'ยื่นหนังสือ'}]).status).toBe('NOT_STARTED'));
  it('uses the latest submission independent of input order', () => expect(workflow([sub,{...sub,id:'new',submissionDate:'2026-09-20',status:'WAITING_CONTACT'}]).status).toBe('WAITING_CONTACT'));
  it('preserves stored legacy completion with an explicit provenance flag', () => expect(getSchoolWorkflow({...a,currentStatus:'GUIDANCE_COMPLETED'}, [], [], [], [a,b])).toMatchObject({status:'NOT_STARTED',storedCompletionOnly:true}));
  it('Dashboard and timeline share the same result', () => expect(getSchoolEffectiveStatus(a,[sub],[appt],[trip],[a,b])).toBe(workflow([sub],[appt],[trip]).status));
  it('recomputes when real-time trip data arrives without mutating inputs', () => { const before = JSON.stringify([a,sub,appt]); expect(workflow([sub],[appt]).status).toBe('APPOINTED'); expect(workflow([sub],[appt],[trip]).status).toBe('GUIDANCE_COMPLETED'); expect(JSON.stringify([a,sub,appt])).toBe(before); });
});
