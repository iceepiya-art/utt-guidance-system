import { expect, it, vi, beforeEach } from 'vitest';
const mocks = vi.hoisted(() => ({ set: vi.fn(), update: vi.fn(), commit: vi.fn().mockResolvedValue(undefined), conflict: vi.fn(), sequence: 0 }));
vi.mock('../src/firebase/firebase', () => ({ db: {} }));
vi.mock('../src/firebase/dbService', () => ({ checkAppointmentConflict: mocks.conflict }));
vi.mock('firebase/firestore', () => ({ collection: (_db: unknown, path: string) => path, doc: (_parent: unknown, ...parts: string[]) => ({ id: parts.at(-1) || `auto-${++mocks.sequence}` }), writeBatch: () => mocks }));
import { saveSubmissionAppointment } from '../src/firebase/submissionAppointmentService';
import type { DocumentSubmission, UserProfile } from '../src/types';
const submission = { schoolId: 'school', schoolName: 'Test', teacherName: '', teacherPhone: '', submittedByName: 'A', teamId: 'team1' } as DocumentSubmission;
const schedule = { date: '2026-09-20', startTime: '09:00', endTime: '10:00', note: 'Room 1' };
const user = { id: 'user', displayName: 'Staff' } as UserProfile;
beforeEach(() => { vi.clearAllMocks(); mocks.conflict.mockResolvedValue({ hasConflict: false }); });
it('links submission to a confirmed calendar appointment in one commit', async () => {
 await saveSubmissionAppointment(submission, schedule, user);
 const [s, a] = mocks.set.mock.calls;
 expect(s[1].appointmentId).toBe(a[0].id);
 expect(a[1].submissionId).toBe(s[0].id);
 expect(a[1]).toMatchObject({ ...schedule, status: 'CONFIRMED', source: 'DOCUMENT_SUBMISSION' });
 expect(mocks.commit).toHaveBeenCalledTimes(1);
});
it('rejects invalid time and conflicts without writes', async () => {
 await expect(saveSubmissionAppointment(submission, {...schedule, endTime: '08:00'}, user)).rejects.toThrow();
 mocks.conflict.mockResolvedValue({hasConflict:true,reason:'Busy'});
 await expect(saveSubmissionAppointment(submission, schedule, user)).rejects.toThrow('Busy');
 expect(mocks.commit).not.toHaveBeenCalled();
});
