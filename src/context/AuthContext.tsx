import React, { createContext, useContext, useEffect, useState } from 'react';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/firebase';
import { UserProfile } from '../types';
import { subscribeUsers } from '../firebase/dbService';

const accessMessage = 'บัญชีนี้ยังไม่ได้รับสิทธิ์หรือถูกระงับ กรุณาติดต่อผู้ดูแลระบบ';
import { validProfile } from '../utils/access';
interface AuthContextType {
  currentUser: UserProfile | null;
  firebaseUser: FirebaseUser | null;
  users: UserProfile[];
  loading: boolean;
  authError: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateCurrentUserProfile: (data: Partial<UserProfile>) => Promise<void>;
  isAdmin: boolean; isManager: boolean; isStaff: boolean; isViewer: boolean;
  canEdit: boolean; canDelete: boolean;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  useEffect(() => {
    localStorage.removeItem('utt_active_user');
    let stopProfile: (() => void) | undefined;
    const stopAuth = onAuthStateChanged(auth, (user) => {
      stopProfile?.();
      setCurrentUser(null);
      setUsers([]);
      setFirebaseUser(user);
      if (!user || user.isAnonymous) { setLoading(false); return; }
      setLoading(true);
      stopProfile = onSnapshot(doc(db, 'users', user.uid), (snapshot) => {
        const data = snapshot.data() as UserProfile | undefined;
        if (validProfile(data)) {
          setCurrentUser({ ...data!, id: user.uid });
          setAuthError(null);
        } else {
          setCurrentUser(null);
          setAuthError(accessMessage);
        }
        setLoading(false);
      }, () => {
        setCurrentUser(null);
        setAuthError('ตรวจสอบสิทธิ์ไม่ได้ กรุณาตรวจสอบการเชื่อมต่อหรือติดต่อผู้ดูแลระบบ');
        setLoading(false);
      });
    });
    return () => { stopAuth(); stopProfile?.(); };
  }, []);
  useEffect(() => {
    if (!currentUser) { setUsers([]); return; }
    return subscribeUsers(setUsers);
  }, [currentUser?.id]);
  const login = async (email: string, password: string) => {
    setAuthError(null);
    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const snapshot = await getDoc(doc(db, 'users', credential.user.uid));
      if (!validProfile(snapshot.data() as UserProfile | undefined)) {
        await signOut(auth);
        throw new Error(accessMessage);
      }
    } catch (error: any) {
      const message = error.message === accessMessage ? accessMessage : 'เข้าสู่ระบบไม่สำเร็จ ตรวจสอบอีเมล รหัสผ่าน และการเชื่อมต่อ';
      setAuthError(message);
      throw new Error(message);
    }
  };
  const logout = async () => { await signOut(auth); setAuthError(null); };
  const updateCurrentUserProfile = async (data: Partial<UserProfile>) => {
    if (!currentUser) throw new Error(accessMessage);
    await updateDoc(doc(db, 'users', currentUser.id), {
      displayName: data.displayName?.trim() || currentUser.displayName,
      phone: data.phone?.trim() ?? currentUser.phone ?? '',
      updatedAt: new Date().toISOString(),
    });
  };
  const isAdmin = currentUser?.role === 'ADMIN';
  const isManager = currentUser?.role === 'MANAGER';
  const isStaff = currentUser?.role === 'STAFF';
  const isViewer = currentUser?.role === 'VIEWER';
  return <AuthContext.Provider value={{ currentUser, firebaseUser, users, loading, authError, login, logout, updateCurrentUserProfile, isAdmin, isManager, isStaff, isViewer, canEdit: isAdmin || isStaff, canDelete: isAdmin }}>{children}</AuthContext.Provider>;
};
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
