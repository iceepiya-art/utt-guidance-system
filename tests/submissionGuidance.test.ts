import { expect, it, vi, beforeEach } from 'vitest';
const mocks = vi.hoisted(() => ({ set: vi.fn(), update: vi.fn(), commit: vi.fn().mockResolvedValue(undefined), sequence: 0 }));
vi.mock('../src/firebase/firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({ collection: (_db: unknown, path: string) => path, doc: (_parent: unknown, ...parts: string[]) => ({ id: parts.at(-1) || `auto-${++mocks.sequence}` }), writeBatch: () => mocks }));
import { saveSubmissionWithGuidance } from '../src/firebase/submissionGuidanceService';
import type { DocumentSubmission, FieldTrip, UserProfile } from '../src/types';
const submission = { schoolId: 'school-1', schoolName: 'Test', submissionDate: '2026-09-14', teacherName: 'Teacher', teacherPhone: '', submittedByNames: ['A', 'B'] } as DocumentSubmission;
const trip = { date: '2026-09-14', schools: [{ schoolId: 'school-1' }] } as FieldTrip;
const user = { id: 'user', displayName: 'Staff' } as UserProfile;
beforeEach(() => { vi.clearAllMocks(); });
it('links both records and completes the school in a single commit', async () => {
  await saveSubmissionWithGuidance(submission, trip, user);
  const [documentWrite, tripWrite] = mocks.set.mock.calls;
  expect(documentWrite[1].fieldTripId).toBe(tripWrite[0].id);
  expect(tripWrite[1].submissionId).toBe(documentWrite[0].id);
  expect(documentWrite[1].submittedByNames).toEqual(['A', 'B']);
  expect(mocks.update.mock.calls[0][1].currentStatus).toBe('GUIDANCE_COMPLETED');
  expect(mocks.commit).toHaveBeenCalledTimes(1);
});
it('rejects a different day or missing target school without writing', async () => {
  await expect(saveSubmissionWithGuidance(submission, { ...trip, date: '2026-09-15' }, user)).rejects.toThrow();
  await expect(saveSubmissionWithGuidance(submission, { ...trip, schools: [] }, user)).rejects.toThrow();
  expect(mocks.commit).not.toHaveBeenCalled();
});
