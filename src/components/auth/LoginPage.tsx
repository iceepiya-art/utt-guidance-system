import React, { useState } from 'react';
import { Lock, Mail, AlertCircle, ArrowRight, ShieldCheck, UserCheck, Shield } from 'lucide-react';
import { CollegeLogo } from '../common/CollegeLogo';
import { useAuth, PRESET_ACCOUNTS } from '../../context/AuthContext';
import { UserProfile, UserRole, TeamId } from '../../types';

export const LoginPage: React.FC = () => {
  const { login, quickLoginAs, quickLoginAsUser, users, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('กรุณากรอกอีเมลและรหัสผ่าน');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectUser = async (u: UserProfile) => {
    setError(null);
    setIsSubmitting(true);
    try {
      if (quickLoginAsUser) {
        await quickLoginAsUser(u);
      } else {
        await quickLoginAs(u.role, u.teamId);
      }
    } catch (err: any) {
      setError('เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Accounts to display: prefer live Firestore users, fallback to PRESET_ACCOUNTS
  const displayAccounts = users && users.length > 0
    ? users.filter((u) => u.active !== false)
    : PRESET_ACCOUNTS.map((p) => ({
        id: p.email,
        email: p.email,
        displayName: p.displayName,
        role: p.role,
        teamId: p.teamId,
        active: true,
      } as UserProfile));

  return (
    <div className="min-h-screen bg-radial from-[#EAF6FD] via-[#F6F9FC] to-[#EDF2F7] flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden">
        {/* Header Branding */}
        <div className="bg-gradient-to-b from-[#EAF6FD] to-white p-6 sm:p-8 text-center border-b border-slate-100">
          <div className="flex justify-center mb-4">
            <CollegeLogo size="xl" showText={false} />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#075A9C] tracking-tight">
            วิทยาลัยเทคโนโลยีอุตรดิตถ์
          </h1>
          <p className="text-xs font-semibold text-[#087CC1] tracking-wider uppercase mt-0.5">
            Uttaradit Technological College
          </p>
          <div className="mt-3 inline-block px-3 py-1 bg-[#087CC1]/10 text-[#075A9C] rounded-full text-xs font-semibold">
            ระบบบริหารงานแนะแนวการศึกษา
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-8">
          {error && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                อีเมลเจ้าหน้าที่
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  id="input-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@utt.ac.th"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-[#087CC1] focus:bg-white transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                รหัสผ่าน
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  id="input-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-[#087CC1] focus:bg-white transition-all"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              id="btn-login-submit"
              disabled={isSubmitting || loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#087CC1] hover:bg-[#075A9C] text-white font-semibold rounded-xl text-sm shadow-md shadow-[#087CC1]/20 transition-all disabled:opacity-60 cursor-pointer"
            >
              <span>{isSubmitting ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบ'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Accounts Selection */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-3">
              <UserCheck className="w-3.5 h-3.5 text-[#087CC1]" />
              <span>เข้าสู่ระบบด่วนสำหรับทดสอบสิทธิ์ (Demo Roles):</span>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {displayAccounts.map((acc) => (
                <button
                  key={acc.id || acc.email}
                  type="button"
                  onClick={() => handleSelectUser(acc)}
                  disabled={isSubmitting || loading}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-200 hover:border-[#087CC1] hover:bg-[#EAF6FD]/30 transition-all text-left group cursor-pointer"
                >
                  <div className="min-w-0 pr-2">
                    <div className="text-xs font-semibold text-slate-800 group-hover:text-[#075A9C] truncate flex items-center gap-1.5">
                      <span>{acc.displayName}</span>
                      {acc.teamId === 'team1' && (
                        <span className="text-[10px] text-[#1976D2] font-normal bg-[#E3F2FD] px-1.5 py-0.2 rounded-sm">
                          สาย 1 (เมือง)
                        </span>
                      )}
                      {acc.teamId === 'team2' && (
                        <span className="text-[10px] text-[#D97706] font-normal bg-[#FFF7E0] px-1.5 py-0.2 rounded-sm">
                          สาย 2 (รอบนอก)
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {acc.email} {acc.phone ? `• โทร ${acc.phone}` : ''}
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-sm shrink-0 uppercase ${
                      acc.role === 'ADMIN'
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : acc.role === 'MANAGER'
                        ? 'bg-purple-50 text-purple-700 border border-purple-200'
                        : acc.role === 'STAFF'
                        ? 'bg-blue-50 text-[#075A9C] border border-blue-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    {acc.role}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Security Notice Footer */}
        <div className="bg-slate-50 px-6 py-3 text-center border-t border-slate-100">
          <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 inline" />
            ระบบภายในเฉพาะบุคลากร วิทยาลัยเทคโนโลยีอุตรดิตถ์ เท่านั้น
          </p>
        </div>
      </div>
    </div>
  );
};
