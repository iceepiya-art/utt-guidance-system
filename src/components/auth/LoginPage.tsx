import React, { useState } from 'react';
import { Lock, Mail, AlertCircle, ArrowRight, ShieldCheck, UserCheck, Shield } from 'lucide-react';
import { CollegeLogo } from '../common/CollegeLogo';
import { useAuth } from '../../context/AuthContext';
import { UserProfile, UserRole, TeamId } from '../../types';

export const LoginPage: React.FC = () => {
  const { login, loading, authError } = useAuth();
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
          {(error || authError) && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span role="alert">{error || authError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="input-email" className="block text-xs font-semibold text-slate-700 mb-1.5">
                อีเมลเจ้าหน้าที่
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  id="input-email" autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@utt.ac.th"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-[#087CC1] focus:bg-white transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="input-password" className="block text-xs font-semibold text-slate-700 mb-1.5">
                รหัสผ่าน
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  id="input-password" autoComplete="current-password"
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

          <p className="mt-5 text-xs text-slate-500 leading-relaxed">ใช้บัญชีที่ผู้ดูแลระบบองค์กรจัดเตรียมให้ หากยังไม่มีบัญชีหรือเข้าใช้งานไม่ได้ กรุณาติดต่อผู้ดูแลระบบ</p>
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
