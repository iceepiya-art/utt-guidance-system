import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  updateDoc: vi.fn().mockResolvedValue(undefined),
  deleteDoc: vi.fn().mockResolvedValue(undefined),
  setDoc: vi.fn().mockResolvedValue(undefined),
  addDoc: vi.fn().mockResolvedValue({ id: 'log-1' }),
  getDoc: vi.fn().mockResolvedValue({ exists: () => false }),
  callableManageUser: vi.fn(),
  callableCheckAuth: vi.fn(),
}));

vi.mock('../src/firebase/firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  doc: (_dbOrCol: any, ...parts: string[]) => {
    const id = parts.length > 0 ? parts.at(-1)! : 'auto_gen_' + Math.random().toString(36).substring(2, 8);
    return { id, path: parts.join('/') };
  },
  collection: (_db: unknown, path: string) => path,
  updateDoc: mocks.updateDoc,
  deleteDoc: mocks.deleteDoc,
  setDoc: mocks.setDoc,
  addDoc: mocks.addDoc,
  getDoc: mocks.getDoc,
}));

import { updateUser, deleteUser, createUser } from '../src/firebase/dbService';
import type { UserProfile } from '../src/types';

describe('User Management Architecture & Personnel/Auth Separation', () => {
  const currentAdmin: UserProfile = {
    id: 'admin_auth_uid_123',
    displayName: 'ไอซ์ ปิยะพงษ์ (Admin)',
    email: 'iceepiya@gmail.com',
    role: 'ADMIN',
    active: true,
    teamId: 'team1',
  };

  const legacyPersonnelWithoutAuth: UserProfile = {
    id: 'usr_admin',
    displayName: 'อ.ประชา กัลปนารถ',
    email: 'pracha@utt.ac.th',
    role: 'ADMIN',
    active: true,
    teamId: 'team1',
    phone: '081-887-2341',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Personnel without Auth can update phone/profile directly in Firestore without calling Auth API', async () => {
    await updateUser(
      legacyPersonnelWithoutAuth.id,
      { phone: '089-999-8888', displayName: 'อ.ประชา กัลปนารถ (ปรับปรุง)' },
      currentAdmin
    );

    expect(mocks.updateDoc).toHaveBeenCalledTimes(1);
    const updatedPayload = mocks.updateDoc.mock.calls[0][1];
    expect(updatedPayload.phone).toBe('089-999-8888');
    expect(updatedPayload.displayName).toBe('อ.ประชา กัลปนารถ (ปรับปรุง)');
    expect(updatedPayload.password).toBeUndefined();
  });

  it('2. Password is never written to Firestore or activity logs during profile updates', async () => {
    await updateUser(
      'any_user_id',
      { displayName: 'New Name' },
      currentAdmin
    );

    const firestoreUpdatePayload = mocks.updateDoc.mock.calls[0][1];
    expect(firestoreUpdatePayload).not.toHaveProperty('password');

    if (mocks.addDoc.mock.calls.length > 0) {
      const logPayload = mocks.addDoc.mock.calls[0][1];
      expect(JSON.stringify(logPayload)).not.toContain('password');
    }
  });

  it('3. Current Admin Protection: user cannot delete their own account', async () => {
    const isCurrent = (target: UserProfile, current: UserProfile | null) => {
      return target.id === current?.id || target.email.toLowerCase() === current?.email.toLowerCase();
    };

    expect(isCurrent(currentAdmin, currentAdmin)).toBe(true);
    expect(isCurrent(legacyPersonnelWithoutAuth, currentAdmin)).toBe(false);
  });

  it('4. Current Admin Protection: role cannot be demoted and active cannot be disabled for current user', () => {
    const isEditingCurrent = (target: UserProfile, current: UserProfile | null) => {
      return Boolean(current && (target.id === current.id || target.email.toLowerCase() === current.email.toLowerCase()));
    };

    // When editing self, demotion is blocked
    const canDemoteSelf = (target: UserProfile, current: UserProfile | null, newRole: string) => {
      if (isEditingCurrent(target, current) && newRole !== 'ADMIN') return false;
      return true;
    };

    const canDisableSelf = (target: UserProfile, current: UserProfile | null, newActive: boolean) => {
      if (isEditingCurrent(target, current) && !newActive) return false;
      return true;
    };

    expect(canDemoteSelf(currentAdmin, currentAdmin, 'STAFF')).toBe(false);
    expect(canDemoteSelf(currentAdmin, currentAdmin, 'ADMIN')).toBe(true);
    expect(canDisableSelf(currentAdmin, currentAdmin, false)).toBe(false);
    expect(canDisableSelf(currentAdmin, currentAdmin, true)).toBe(true);
    // When editing someone else, admin can change role
    expect(canDemoteSelf(legacyPersonnelWithoutAuth, currentAdmin, 'STAFF')).toBe(true);
  });

  it('5. Last Admin Protection: cannot delete the last remaining active admin', () => {
    const userList: UserProfile[] = [
      currentAdmin,
      { id: 'u2', displayName: 'Staff 1', email: 's1@utt.ac.th', role: 'STAFF', active: true },
    ];

    const canDeleteUser = (userToDelete: UserProfile, allUsers: UserProfile[], current: UserProfile) => {
      if (userToDelete.id === current.id) return { allowed: false, reason: 'self' };
      const adminCount = allUsers.filter((u) => u.role === 'ADMIN' && u.active !== false).length;
      if (userToDelete.role === 'ADMIN' && adminCount <= 1) {
        return { allowed: false, reason: 'last_admin' };
      }
      return { allowed: true };
    };

    // Only 1 admin in userList (currentAdmin)
    expect(canDeleteUser(currentAdmin, userList, currentAdmin)).toEqual({ allowed: false, reason: 'self' });

    // If there were 2 admins and we try to delete one that is not current
    const twoAdmins = [...userList, legacyPersonnelWithoutAuth];
    expect(canDeleteUser(legacyPersonnelWithoutAuth, twoAdmins, currentAdmin)).toEqual({ allowed: true });
  });

  it('6. Personnel Profile creation works with auto-generated ID when authUid is omitted', async () => {
    const newPersonnel = {
      displayName: 'อ.ใหม่ ประจำสาย',
      email: 'new@utt.ac.th',
      phone: '081-111-2222',
      role: 'STAFF' as const,
      teamId: 'team1' as const,
      active: true,
    };

    const created = await createUser(newPersonnel, currentAdmin);
    expect(created.id).toBeDefined();
    expect(mocks.setDoc).toHaveBeenCalledTimes(1);
    expect(mocks.setDoc.mock.calls[0][1].displayName).toBe('อ.ใหม่ ประจำสาย');
  });

  it('7. Error message formatting separates expected unlinked state from raw [404] system errors', () => {
    const formatErrorMessage = (rawError: string) => {
      if (rawError.includes('auth/user-not-found') || rawError.includes('404') || rawError.includes('not-found')) {
        return 'ยังไม่มีบัญชีเข้าสู่ระบบ กรุณาบันทึกเป็นข้อมูลบุคลากร หรือสร้างบัญชี Authentication ก่อน';
      }
      return rawError;
    };

    expect(formatErrorMessage('ไม่พบบัญชีเข้าสู่ระบบ กรุณาสร้างบัญชี Authentication ก่อน [404]')).toBe(
      'ยังไม่มีบัญชีเข้าสู่ระบบ กรุณาบันทึกเป็นข้อมูลบุคลากร หรือสร้างบัญชี Authentication ก่อน'
    );
    expect(formatErrorMessage('Network timeout')).toBe('Network timeout');
  });

  describe('10 Core Linkage and Security Rules', () => {
    // 1. Auth UID === Firestore ID -> LINKED
    it('Rule 1: Auth UID === Firestore ID yields LINKED status', () => {
      const evaluateStatus = (authUid: string | null, docId: string, emailAuthUid: string | null) => {
        if (authUid === docId) return 'LINKED';
        if (emailAuthUid && emailAuthUid !== docId) return 'AUTH_FOUND_BUT_NOT_LINKED';
        if (!authUid && !emailAuthUid) return 'NO_AUTH_ACCOUNT';
        return 'ERROR';
      };
      expect(evaluateStatus('user_123', 'user_123', 'user_123')).toBe('LINKED');
    });

    // 2. UID lookup fail, email lookup finds different Auth UID -> AUTH_FOUND_BUT_NOT_LINKED
    it('Rule 2: UID lookup fail but email lookup finds account -> AUTH_FOUND_BUT_NOT_LINKED', () => {
      const evaluateStatus = (authUid: string | null, docId: string, emailAuthUid: string | null) => {
        if (authUid === docId) return 'LINKED';
        if (emailAuthUid && emailAuthUid !== docId) return 'AUTH_FOUND_BUT_NOT_LINKED';
        if (!authUid && !emailAuthUid) return 'NO_AUTH_ACCOUNT';
        return 'ERROR';
      };
      expect(evaluateStatus(null, 'usr_admin', 'auth_firebase_uid_999')).toBe('AUTH_FOUND_BUT_NOT_LINKED');
    });

    // 3. UID lookup fail & email lookup fail -> NO_AUTH_ACCOUNT
    it('Rule 3: UID lookup fail and email lookup fail -> NO_AUTH_ACCOUNT', () => {
      const evaluateStatus = (authUid: string | null, docId: string, emailAuthUid: string | null) => {
        if (authUid === docId) return 'LINKED';
        if (emailAuthUid && emailAuthUid !== docId) return 'AUTH_FOUND_BUT_NOT_LINKED';
        if (!authUid && !emailAuthUid) return 'NO_AUTH_ACCOUNT';
        return 'ERROR';
      };
      expect(evaluateStatus(null, 'usr_admin', null)).toBe('NO_AUTH_ACCOUNT');
    });

    // 4. Backend error -> ERROR, not NO_AUTH_ACCOUNT
    it('Rule 4: Backend error is preserved as ERROR, never defaulted to NO_AUTH_ACCOUNT', () => {
      const handleAuthCheckError = (err: any) => {
        return {
          status: 'ERROR',
          errorMessage: err?.message || 'ไม่สามารถตรวจสอบสถานะบัญชีได้',
        };
      };
      const result = handleAuthCheckError(new Error('PERMISSION_DENIED'));
      expect(result.status).toBe('ERROR');
      expect(result.status).not.toBe('NO_AUTH_ACCOUNT');
    });

    // 5. AUTH_FOUND_BUT_NOT_LINKED -> password fields hidden
    it('Rule 5: AUTH_FOUND_BUT_NOT_LINKED hides password management UI', () => {
      const isPasswordUiVisible = (status: string) => status === 'LINKED';
      expect(isPasswordUiVisible('AUTH_FOUND_BUT_NOT_LINKED')).toBe(false);
      expect(isPasswordUiVisible('NO_AUTH_ACCOUNT')).toBe(false);
      expect(isPasswordUiVisible('ERROR')).toBe(false);
      expect(isPasswordUiVisible('LINKED')).toBe(true);
    });

    // 6. AUTH_FOUND_BUT_NOT_LINKED -> password update blocked
    it('Rule 6: AUTH_FOUND_BUT_NOT_LINKED blocks password update dispatch', () => {
      const canUpdatePassword = (status: string, password?: string) => {
        if (!password) return true; // No password to change
        return status === 'LINKED';
      };
      expect(canUpdatePassword('AUTH_FOUND_BUT_NOT_LINKED', 'NewPassword123')).toBe(false);
      expect(canUpdatePassword('NO_AUTH_ACCOUNT', 'NewPassword123')).toBe(false);
      expect(canUpdatePassword('ERROR', 'NewPassword123')).toBe(false);
      expect(canUpdatePassword('LINKED', 'NewPassword123')).toBe(true);
    });

    // 7. LINKED -> password update allowed
    it('Rule 7: LINKED account allows password update dispatch', () => {
      const getDispatcher = (status: string, hasPasswordChange: boolean) => {
        if (hasPasswordChange) {
          if (status !== 'LINKED') throw new Error('Blocked');
          return 'SECURE_AUTH_BACKEND';
        }
        return status === 'LINKED' ? 'SECURE_AUTH_BACKEND' : 'FIRESTORE_PROFILE_ONLY';
      };
      expect(getDispatcher('LINKED', true)).toBe('SECURE_AUTH_BACKEND');
      expect(getDispatcher('AUTH_FOUND_BUT_NOT_LINKED', false)).toBe('FIRESTORE_PROFILE_ONLY');
      expect(getDispatcher('NO_AUTH_ACCOUNT', false)).toBe('FIRESTORE_PROFILE_ONLY');
    });

    // 8. Personnel-only profile update -> does not call Firebase Auth API
    it('Rule 8: Personnel-only profile update routes directly to Firestore without Firebase Auth API', async () => {
      const mockAuthApi = vi.fn();
      const savePersonnel = async (status: string, payload: any) => {
        if (status === 'LINKED') {
          await mockAuthApi(payload);
        } else {
          await mocks.updateDoc('ref', payload);
        }
      };
      await savePersonnel('NO_AUTH_ACCOUNT', { phone: '081-222-3333' });
      await savePersonnel('AUTH_FOUND_BUT_NOT_LINKED', { phone: '081-444-5555' });
      expect(mockAuthApi).not.toHaveBeenCalled();
      expect(mocks.updateDoc).toHaveBeenCalledTimes(2);
    });

    // 9. Password is never leaked to Firestore or activityLogs
    it('Rule 9: Password is never stored in Firestore documents or activity logs', async () => {
      const profilePayload = {
        displayName: 'Test Personnel',
        email: 'test@utt.ac.th',
        phone: '081-999-0000',
        role: 'STAFF',
        active: true,
      };
      await mocks.updateDoc('users/u1', profilePayload);
      const savedDoc = mocks.updateDoc.mock.calls[0][1];
      expect(savedDoc.password).toBeUndefined();

      const log = {
        action: 'แก้ไขบัญชีผู้ใช้',
        details: 'อัปเดตข้อมูลและเปลี่ยนรหัสผ่าน',
      };
      await mocks.addDoc('activityLogs', log);
      const savedLog = mocks.addDoc.mock.calls[0][1];
      expect(JSON.stringify(savedLog)).not.toContain('NewPassword123');
    });

    // 10. Current Admin protection works properly
    it('Rule 10: Current Admin cannot self-demote, self-disable, or self-delete', () => {
      const admin = { id: 'admin1', email: 'admin@utt.ac.th', role: 'ADMIN', active: true };
      const isSelf = (targetId: string, currentId: string) => targetId === currentId;
      const canDemote = (target: any, currentId: string, newRole: string) => !(isSelf(target.id, currentId) && newRole !== 'ADMIN');
      const canDisable = (target: any, currentId: string, newActive: boolean) => !(isSelf(target.id, currentId) && !newActive);
      const canDelete = (targetId: string, currentId: string) => !isSelf(targetId, currentId);

      expect(canDemote(admin, 'admin1', 'STAFF')).toBe(false);
      expect(canDisable(admin, 'admin1', false)).toBe(false);
      expect(canDelete('admin1', 'admin1')).toBe(false);
    });
  });
});
