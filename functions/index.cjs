const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
initializeApp();
const db = getFirestore('ai-studio-8fc73ebf-4b79-4218-9abe-c0c98ecdd272');
exports.manageUser = onCall({ region: 'asia-southeast1', maxInstances: 3 }, async request => {
 if (!request.auth) throw new HttpsError('unauthenticated', 'กรุณาเข้าสู่ระบบ');
 const actor = (await db.doc(`users/${request.auth.uid}`).get()).data();
 if (!actor || !actor.active || actor.role !== 'ADMIN') throw new HttpsError('permission-denied', 'เฉพาะผู้ดูแลระบบ');
 const data = request.data || {};
 const { uid, displayName, email, phone, role, teamId, active, password } = data;
 if (typeof uid !== 'string' || !uid || uid.includes('/') || typeof displayName !== 'string' || !displayName.trim() || typeof email !== 'string' || !email.includes('@') || typeof phone !== 'string' || !['ADMIN','MANAGER','STAFF'].includes(role) || !['team1','team2','none'].includes(teamId) || typeof active !== 'boolean') throw new HttpsError('invalid-argument', 'ข้อมูลบัญชีไม่ถูกต้อง');
 if (password !== undefined && (typeof password !== 'string' || password.length < 8 || password.length > 128)) throw new HttpsError('invalid-argument', 'รหัสผ่านต้องมี 8–128 ตัวอักษร');
 if (uid === request.auth.uid && (role !== 'ADMIN' || !active)) throw new HttpsError('failed-precondition', 'ไม่สามารถปิดสิทธิ์ผู้ดูแลระบบของตนเอง');
 const profileRef = db.doc(`users/${uid}`);
 if (!(await profileRef.get()).exists) throw new HttpsError('not-found', 'ไม่พบผู้ใช้ในระบบ');
 try {
   const authData = { displayName: displayName.trim(), email: email.trim().toLowerCase(), disabled: !active };
   if (password !== undefined) authData.password = password;
   await getAuth().updateUser(uid, authData);
   await profileRef.update({ displayName: authData.displayName, email: authData.email, phone: phone.trim(), role, teamId: teamId === 'none' ? null : teamId, active, updatedAt: new Date().toISOString() });
   await db.collection('activityLogs').add({ userId: request.auth.uid, userName: actor.displayName, action: 'แก้ไขบัญชีผู้ใช้', entityType: 'user', entityId: uid, details: password !== undefined ? 'อัปเดตข้อมูลและเปลี่ยนรหัสผ่าน' : 'อัปเดตข้อมูลบัญชี', timestamp: new Date().toISOString() });
   return { success: true };
 } catch (error) {
   if (error.code === 'auth/email-already-exists') throw new HttpsError('already-exists', 'อีเมลนี้มีผู้ใช้แล้ว');
   if (error.code === 'auth/user-not-found') throw new HttpsError('not-found', 'ไม่พบบัญชีเข้าสู่ระบบ กรุณาสร้างบัญชี Authentication ก่อน');
   throw new HttpsError('internal', 'อัปเดตบัญชีไม่สำเร็จ กรุณาตรวจสอบข้อมูลแล้วลองใหม่');
 }
});
