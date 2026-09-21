const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
function setup(role = 'ADMIN', authOverrides = {}) {
 const calls = []; const exports = {};
 const db = { doc: path => ({get: async () => ({data: () => ({role, active:true, displayName:'Admin'}), exists:true}),update: async data => calls.push(['profile',data])}), collection: () => ({add:async data => calls.push(['log',data])}) };
 class HttpsError extends Error { constructor(code, message) {super(message);this.code=code;} }
  const mockAuth = {
    updateUser: async(uid,data)=>{ calls.push(['auth',data]); if(authOverrides.userNotFound || authOverrides.userNotFoundForUid) { const err = new Error('not found'); err.code = 'auth/user-not-found'; throw err; } },
    createUser: async(data)=>calls.push(['auth-create',data]),
    getUser: async(uid)=>{
      if (authOverrides.authError) throw new Error('Auth service error');
      if (authOverrides.userNotFound || authOverrides.userNotFoundForUid) { const err = new Error('not found'); err.code = 'auth/user-not-found'; throw err; }
      return { uid, email: 'teacher@example.com', disabled: false };
    },
    getUserByEmail: async(email)=>{
      if (authOverrides.authError) throw new Error('Auth service error');
      if (authOverrides.userNotFound) { const err = new Error('not found'); err.code = 'auth/user-not-found'; throw err; }
      return { uid: 'different_auth_uid_456', email, disabled: false };
    },
  };
  vm.runInNewContext(fs.readFileSync(__dirname+'/index.cjs','utf8'), {exports, require: name => ({'firebase-functions/v2/https':{onCall:(_options,fn)=>fn,HttpsError},'firebase-admin/app':{initializeApp:()=>{}},'firebase-admin/auth':{getAuth:()=>mockAuth},'firebase-admin/firestore':{getFirestore:()=>db}}[name])});
  return {run:exports.manageUser,checkAuth:exports.checkUserAuthStatus,calls};
}
const data={uid:'target',displayName:'Teacher',email:'teacher@example.com',phone:'',role:'STAFF',teamId:'team1',active:true,password:'Test-password-123'};
test('only admin can change authentication credentials',async()=>{for(const role of ['STAFF','MANAGER','VIEWER']){const s=setup(role);await assert.rejects(s.run({auth:{uid:'actor'},data}),{code:'permission-denied'});assert.equal(s.calls.length,0);}});
test('password goes only to Authentication, not profile or logs',async()=>{const s=setup();await s.run({auth:{uid:'actor'},data});assert.equal(s.calls[0][1].password,data.password);assert.ok(!JSON.stringify(s.calls.slice(1)).includes(data.password));});
test('rejects unauthenticated, invalid password and self lockout',async()=>{const s=setup();await assert.rejects(s.run({data}),{code:'unauthenticated'});await assert.rejects(s.run({auth:{uid:'actor'},data:{...data,password:'short'}}),{code:'invalid-argument'});await assert.rejects(s.run({auth:{uid:'target'},data}),{code:'failed-precondition'});assert.equal(s.calls.length,0);});
test('personnel without auth can update profile when no password provided without 404',async()=>{
  const s = setup('ADMIN', { userNotFound: true });
  const noPassData = { uid: 'usr_admin', displayName: 'อ.ประชา กัลปนารถ', email: 'pracha@utt.ac.th', phone: '081-887-2341', role: 'ADMIN', teamId: 'team1', active: true };
  const res = await s.run({ auth: { uid: 'actor' }, data: noPassData });
  assert.equal(res.success, true);
  assert.equal(res.authLinked, false);
  assert.equal(s.calls.some(c => c[0] === 'profile' && c[1].displayName === 'อ.ประชา กัลปนารถ'), true);
});
test('checkUserAuthStatus returns LINKED when auth found by uid',async()=>{
  const s = setup('ADMIN');
  const res = await s.checkAuth({ auth: { uid: 'actor' }, data: { uid: 'target' } });
  assert.equal(res.status, 'LINKED');
  assert.equal(res.exists, true);
  assert.equal(res.authUid, 'target');
  assert.equal(res.email, 'teacher@example.com');
});
test('checkUserAuthStatus returns AUTH_FOUND_BUT_NOT_LINKED when uid lookup fails but email lookup finds account',async()=>{
  const s = setup('ADMIN', { userNotFoundForUid: true });
  const res = await s.checkAuth({ auth: { uid: 'actor' }, data: { uid: 'doc_123', email: 'teacher@example.com' } });
  assert.equal(res.status, 'AUTH_FOUND_BUT_NOT_LINKED');
  assert.equal(res.exists, true);
  assert.equal(res.authUid, 'different_auth_uid_456');
  assert.notEqual(res.authUid, 'doc_123');
});
test('checkUserAuthStatus returns NO_AUTH_ACCOUNT when neither uid nor email exists in auth',async()=>{
  const s = setup('ADMIN', { userNotFound: true });
  const res = await s.checkAuth({ auth: { uid: 'actor' }, data: { uid: 'usr_admin', email: 'pracha@utt.ac.th' } });
  assert.equal(res.status, 'NO_AUTH_ACCOUNT');
  assert.equal(res.exists, false);
});
test('checkUserAuthStatus rethrows backend error',async()=>{
  const s = setup('ADMIN', { authError: true });
  await assert.rejects(s.checkAuth({ auth: { uid: 'actor' }, data: { uid: 'target' } }), { message: 'Auth service error' });
});
