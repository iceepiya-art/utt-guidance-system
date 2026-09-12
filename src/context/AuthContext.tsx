import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInAnonymously,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/firebase';
import { UserProfile, UserRole, TeamId } from '../types';
import { ensureInitialDataSeeded, subscribeUsers, updateUser } from '../firebase/dbService';

interface AuthContextType {
  currentUser: UserProfile | null;
  firebaseUser: FirebaseUser | null;
  users: UserProfile[];
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  quickLoginAs: (role: UserRole, teamId?: TeamId) => Promise<void>;
  quickLoginAsUser: (user: UserProfile) => Promise<void>;
  switchUser: (user: UserProfile) => void;
  updateCurrentUserProfile: (data: Partial<UserProfile>) => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  isManager: boolean;
  isStaff: boolean;
  isViewer: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Preset accounts for seamless staff onboarding & review
export const PRESET_ACCOUNTS: {
  role: UserRole;
  label: string;
  email: string;
  displayName: string;
  teamId?: TeamId;
  description: string;
}[] = [
  {
    role: 'ADMIN',
    label: 'ผู้ดูแลระบบ (Admin) - อ.ปิยะ',
    email: 'admin@utt.ac.th',
    displayName: 'อ.ปิยะ สุขสมบูรณ์ (หัวหน้างานแนะแนว)',
    teamId: 'team1',
    description: 'สิทธิ์เต็ม จัดการระบบ โรงเรียน ผู้ใช้งาน และลบข้อมูล',
  },
  {
    role: 'STAFF',
    label: 'เจ้าหน้าที่สายที่ 1 (Staff Team 1)',
    email: 'staff1@utt.ac.th',
    displayName: 'อ.สมศักดิ์ วงศ์สว่าง (แนะแนวสาย 1)',
    teamId: 'team1',
    description: 'บันทึกยื่นหนังสือ สร้างนัดหมาย ออกแนะแนวสายที่ 1',
  },
  {
    role: 'STAFF',
    label: 'เจ้าหน้าที่สายที่ 2 (Staff Team 2)',
    email: 'staff2@utt.ac.th',
    displayName: 'อ.นภาพร ใจดี (แนะแนวสาย 2)',
    teamId: 'team2',
    description: 'บันทึกยื่นหนังสือ สร้างนัดหมาย ออกแนะแนวสายที่ 2',
  },
  {
    role: 'MANAGER',
    label: 'ผู้บริหาร / หัวหน้าฝ่าย (Manager)',
    email: 'manager@utt.ac.th',
    displayName: 'ดร.สุรชัย มั่นคง (รอง ผอ.ฝ่ายวิชาการ)',
    description: 'ดูรายงาน สรุปผลรายเดือน และสถิติภาพรวม',
  },
  {
    role: 'VIEWER',
    label: 'ผู้สังเกตการณ์ (Viewer)',
    email: 'viewer@utt.ac.th',
    displayName: 'เจ้าหน้าที่ธุรการ (ดูข้อมูลเท่านั้น)',
    description: 'อ่านข้อมูลอย่างเดียว ไม่สามารถแก้ไขได้',
  },
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Subscribe to real-time users from Firestore
  useEffect(() => {
    const unsubUsers = subscribeUsers((userList) => {
      setUsers(userList);
      // If current user is logged in, sync any updates to their profile
      if (currentUser) {
        const fresh = userList.find((u) => u.id === currentUser.id || u.email.toLowerCase() === currentUser.email.toLowerCase());
        if (fresh && JSON.stringify(fresh) !== JSON.stringify(currentUser)) {
          setCurrentUser(fresh);
          localStorage.setItem('utt_active_user', JSON.stringify(fresh));
        }
      }
    });

    return () => {
      unsubUsers();
    };
  }, [currentUser?.id]);

  // Sync profile from Firestore or local fallback
  const syncUserProfile = async (fbUser: FirebaseUser) => {
    try {
      const userRef = doc(db, 'users', fbUser.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const profile = userSnap.data() as UserProfile;
        setCurrentUser(profile);
        return profile;
      } else {
        // Find preset match by email or create new Staff profile
        const preset = PRESET_ACCOUNTS.find((a) => a.email.toLowerCase() === fbUser.email?.toLowerCase());
        const newProfile: UserProfile = {
          id: fbUser.uid,
          email: fbUser.email || '',
          displayName: preset?.displayName || fbUser.displayName || fbUser.email?.split('@')[0] || 'เจ้าหน้าที่',
          role: preset?.role || 'STAFF',
          teamId: preset?.teamId || 'team1',
          active: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await setDoc(userRef, newProfile);
        setCurrentUser(newProfile);
        return newProfile;
      }
    } catch (err) {
      console.warn('Could not read user profile from Firestore, using memory profile:', err);
      const preset = PRESET_ACCOUNTS.find((a) => a.email.toLowerCase() === fbUser.email?.toLowerCase());
      const fallbackProfile: UserProfile = {
        id: fbUser.uid,
        email: fbUser.email || '',
        displayName: preset?.displayName || 'อ.ปิยะ สุขสมบูรณ์',
        role: preset?.role || 'ADMIN',
        teamId: preset?.teamId || 'team1',
        active: true,
      };
      setCurrentUser(fallbackProfile);
      return fallbackProfile;
    }
  };

  useEffect(() => {
    // Listen for auth state
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        await syncUserProfile(user);
        // Only trigger initial seed check once a verified or authenticated session exists
        ensureInitialDataSeeded().catch((err) => {
          console.warn('Initial seeding deferred:', err?.message || err);
        });
      } else {
        // Check for locally preserved mock/test session
        const localSaved = localStorage.getItem('utt_active_user');
        if (localSaved) {
          try {
            const parsed = JSON.parse(localSaved);
            setCurrentUser(parsed);
            // Ensure Firebase Auth session is active in the background
            if (!auth.currentUser) {
              await signInAnonymously(auth).catch(() => {});
            }
          } catch {
            setCurrentUser(null);
          }
        } else {
          setCurrentUser(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      await syncUserProfile(cred.user);
    } catch (authErr: any) {
      // If user doesn't exist in Firebase Auth yet, try creating it automatically for easy onboarding
      if (
        authErr.code === 'auth/user-not-found' ||
        authErr.code === 'auth/invalid-credential' ||
        authErr.code === 'auth/operation-not-allowed'
      ) {
        try {
          const cred = await createUserWithEmailAndPassword(auth, email, pass || 'utt123456');
          await syncUserProfile(cred.user);
          return;
        } catch {
          // If creation fails, fallback to anonymous session
          try {
            await signInAnonymously(auth);
          } catch {}
        }
      }

      // Check if matches preset
      const preset = PRESET_ACCOUNTS.find((a) => a.email.toLowerCase() === email.toLowerCase());
      if (preset) {
        const dummyUser: UserProfile = {
          id: auth.currentUser?.uid || `usr_${preset.role.toLowerCase()}_${Date.now()}`,
          email: preset.email,
          displayName: preset.displayName,
          role: preset.role,
          teamId: preset.teamId,
          active: true,
        };
        setCurrentUser(dummyUser);
        localStorage.setItem('utt_active_user', JSON.stringify(dummyUser));
        return;
      }

      throw authErr;
    } finally {
      setLoading(false);
    }
  };

  const quickLoginAsUser = async (targetUser: UserProfile) => {
    setLoading(true);
    try {
      try {
        const cred = await signInWithEmailAndPassword(auth, targetUser.email, 'utt123456');
        await syncUserProfile(cred.user);
      } catch {
        try {
          const cred = await createUserWithEmailAndPassword(auth, targetUser.email, 'utt123456');
          await syncUserProfile(cred.user);
        } catch {
          // Fallback to anonymous authentication so request.auth != null in Firestore
          try {
            const anonCred = await signInAnonymously(auth);
            const profile: UserProfile = {
              ...targetUser,
              id: anonCred.user.uid,
            };
            setCurrentUser(profile);
            localStorage.setItem('utt_active_user', JSON.stringify(profile));
          } catch {
            setCurrentUser(targetUser);
            localStorage.setItem('utt_active_user', JSON.stringify(targetUser));
          }
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const switchUser = (targetUser: UserProfile) => {
    setCurrentUser(targetUser);
    localStorage.setItem('utt_active_user', JSON.stringify(targetUser));
  };

  const updateCurrentUserProfile = async (data: Partial<UserProfile>) => {
    if (!currentUser) return;
    const updated: UserProfile = { ...currentUser, ...data };
    setCurrentUser(updated);
    localStorage.setItem('utt_active_user', JSON.stringify(updated));
    try {
      await updateUser(currentUser.id, data, currentUser);
    } catch (e) {
      console.warn('Could not persist updated profile in Firestore:', e);
    }
  };

  const quickLoginAs = async (role: UserRole, teamId?: TeamId) => {
    setLoading(true);
    const target =
      users.find((u) => u.role === role && (!teamId || u.teamId === teamId)) ||
      PRESET_ACCOUNTS.find((a) => a.role === role && (!teamId || a.teamId === teamId)) ||
      PRESET_ACCOUNTS[0];

    try {
      await quickLoginAsUser(target as UserProfile);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
    } catch {
      // ignore
    }
    localStorage.removeItem('utt_active_user');
    setCurrentUser(null);
    setFirebaseUser(null);
  };

  const role = currentUser?.role || 'VIEWER';
  const isAdmin = role === 'ADMIN';
  const isManager = role === 'MANAGER';
  const isStaff = role === 'STAFF';
  const isViewer = role === 'VIEWER';
  const canEdit = isAdmin || isManager || isStaff;
  const canDelete = isAdmin;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        firebaseUser,
        users,
        loading,
        login,
        quickLoginAs,
        quickLoginAsUser,
        switchUser,
        updateCurrentUserProfile,
        logout,
        isAdmin,
        isManager,
        isStaff,
        isViewer,
        canEdit,
        canDelete,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
