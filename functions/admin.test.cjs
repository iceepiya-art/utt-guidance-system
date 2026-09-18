const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
function setup(role = 'ADMIN') {
 const calls = []; const exports = {};
 const db = { doc: path => ({get: async () => ({data: () => ({role, active:true, displayName:'Admin'}), exists:true}),update: async data => calls.push(['profile',data])}), collection: () => ({add:async data => calls.push(['log',data])}) };
 class HttpsError extends Error { constructor(code, message) {super(message);this.code=code;} }
 vm.runInNewContext(fs.readFileSync(__dirname+'/index.cjs','utf8'), {exports, require: name => ({'firebase-functions/v2/https':{onCall:(_options,fn)=>fn,HttpsError},'firebase-admin/app':{initializeApp:()=>{}},'firebase-admin/auth':{getAuth:()=>({updateUser:async(uid,data)=>calls.push(['auth',data])})},'firebase-admin/firestore':{getFirestore:()=>db}}[name])});
 return {run:exports.manageUser,calls};
}
const data={uid:'target',displayName:'Teacher',email:'teacher@example.com',phone:'',role:'STAFF',teamId:'team1',active:true,password:'Test-password-123'};
test('only admin can change authentication credentials',async()=>{for(const role of ['STAFF','MANAGER','VIEWER']){const s=setup(role);await assert.rejects(s.run({auth:{uid:'actor'},data}),{code:'permission-denied'});assert.equal(s.calls.length,0);}});
test('password goes only to Authentication, not profile or logs',async()=>{const s=setup();await s.run({auth:{uid:'actor'},data});assert.equal(s.calls[0][1].password,data.password);assert.ok(!JSON.stringify(s.calls.slice(1)).includes(data.password));});
test('rejects unauthenticated, invalid password and self lockout',async()=>{const s=setup();await assert.rejects(s.run({data}),{code:'unauthenticated'});await assert.rejects(s.run({auth:{uid:'actor'},data:{...data,password:'short'}}),{code:'invalid-argument'});await assert.rejects(s.run({auth:{uid:'target'},data}),{code:'failed-precondition'});assert.equal(s.calls.length,0);});
