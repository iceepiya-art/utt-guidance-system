import { readFileSync } from 'node:fs';
import { beforeAll, afterAll, describe, it } from 'vitest';
import { initializeTestEnvironment, assertFails, assertSucceeds, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
let env: RulesTestEnvironment;
beforeAll(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-utt-enterprise', firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 } });
  await env.withSecurityRulesDisabled(async (context) => {
    for (const role of ['ADMIN', 'MANAGER', 'STAFF', 'VIEWER']) {
      await setDoc(doc(context.firestore(), 'users', role), { id: role, role, active: true, email: role + '@example.org', displayName: role });
    }
    await setDoc(doc(context.firestore(), 'users', 'disabled'), { id: 'disabled', role: 'ADMIN', active: false });
    await setDoc(doc(context.firestore(), 'schools', 'school'), { schoolName: 'Test' });
  });
});
afterAll(async () => { await env?.cleanup(); });
const db = (uid: string) => env.authenticatedContext(uid, { firebase: { sign_in_provider: 'password', identities: {} } }).firestore();
describe('Firestore authorization', () => {
  it('denies public access', async () => { await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'schools', 'school'))); });
  it.each(['disabled', 'unknown'])('denies %s accounts', async (uid) => { await assertFails(getDoc(doc(db(uid), 'schools', 'school'))); });
  it('denies anonymous even with an admin profile', async () => {
    await assertFails(getDoc(doc(env.authenticatedContext('ADMIN', { firebase: { sign_in_provider: 'anonymous', identities: {} } }).firestore(), 'schools', 'school')));
  });
  it.each(['ADMIN', 'MANAGER', 'STAFF', 'VIEWER'])('allows member reads: %s', async (uid) => { await assertSucceeds(getDoc(doc(db(uid), 'schools', 'school'))); });
  it.each(['MANAGER', 'VIEWER'])('denies read-only writes: %s', async (uid) => { await assertFails(setDoc(doc(db(uid), 'schools', uid), { schoolName: 'Test' })); });
  it('allows staff work but denies deletion and settings', async () => {
    await assertSucceeds(setDoc(doc(db('STAFF'), 'schools', 'staff-created'), { schoolName: 'Test' }));
    await assertFails(deleteDoc(doc(db('STAFF'), 'schools', 'school')));
    await assertFails(setDoc(doc(db('STAFF'), 'systemSettings', 'current'), { academicYear: '2569' }));
  });
  it('blocks privilege escalation but allows profile editing', async () => {
    await assertFails(updateDoc(doc(db('VIEWER'), 'users', 'VIEWER'), { role: 'ADMIN' }));
    await assertSucceeds(updateDoc(doc(db('VIEWER'), 'users', 'VIEWER'), { displayName: 'New name' }));
  });
  it('prevents admin self-lockout', async () => {
    await assertFails(updateDoc(doc(db('ADMIN'), 'users', 'ADMIN'), { active: false }));
    await assertFails(deleteDoc(doc(db('ADMIN'), 'users', 'ADMIN')));
  });
  it('allows admin provisioning', async () => {
    await assertSucceeds(setDoc(doc(db('ADMIN'), 'users', 'new-user'), { id: 'new-user', role: 'STAFF', active: true, email: 'new@example.org', displayName: 'New' }));
  });
  it('rejects forged audit identity and fake delivery logs', async () => {
    await assertFails(setDoc(doc(db('STAFF'), 'activityLogs', 'forged'), { userId: 'ADMIN' }));
    await assertFails(setDoc(doc(db('ADMIN'), 'notificationLogs', 'fake'), { status: 'SENT' }));
  });
});
