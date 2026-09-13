import React, { useState } from 'react';
import {
  Users,
  Shield,
  UserPlus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Phone,
  Mail,
  UserCheck,
  AlertCircle,
  X,
  Save,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserProfile, UserRole, TeamId } from '../../types';
import { createUser, updateUser, deleteUser } from '../../firebase/dbService';

export const UserManagerSection: React.FC = () => {
  const { currentUser, isAdmin, users, updateCurrentUserProfile } = useAuth();

  // State for Add/Edit Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState({
    uid: '',
    displayName: '',
    email: '',
    phone: '',
    role: 'STAFF' as UserRole,
    teamId: 'team1' as TeamId | 'none',
    active: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // State for Profile Modal
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileData, setProfileData] = useState({
    displayName: currentUser?.displayName || '',
    phone: currentUser?.phone || '',
  });

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const handleOpenAdd = () => {
    setEditingUser(null);
    setFormData({
      uid: '',
    displayName: '',
      email: '',
      phone: '',
      role: 'STAFF',
      teamId: 'team1',
      active: true,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (user: UserProfile) => {
    setEditingUser(user);
    setFormData({
      uid: user.id,
      displayName: user.displayName,
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      teamId: user.teamId || 'none',
      active: user.active ?? true,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleOpenProfile = () => {
    setProfileData({
      displayName: currentUser?.displayName || '',
      phone: currentUser?.phone || '',
    });
    setProfileModalOpen(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileData.displayName.trim()) return;

    try {
      setIsSubmitting(true);
      await updateCurrentUserProfile({
        displayName: profileData.displayName.trim(),
        phone: profileData.phone.trim(),
      });
      setProfileModalOpen(false);
      showToast('บันทึกข้อมูลส่วนตัวเรียบร้อยแล้ว');
    } catch (err: any) {
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.displayName.trim() || !formData.email.trim()) {
      setFormError('กรุณากรอกชื่อ-นามสกุล และอีเมลให้ครบถ้วน');
      return;
    }

    setFormError(null);
    setIsSubmitting(true);

    try {
      const userPayload = {
        displayName: formData.displayName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        role: formData.role,
        teamId: formData.teamId === 'none' ? undefined : (formData.teamId as TeamId),
        active: formData.active,
      };

      if (editingUser) {
        // Update existing user
        await updateUser(editingUser.id, userPayload, currentUser);
        showToast(`อัปเดตข้อมูล ${userPayload.displayName} เรียบร้อยแล้ว`);
      } else {
        // Create new user
        await createUser(userPayload, currentUser, formData.uid.trim());
        showToast(`เพิ่มผู้ใช้งาน ${userPayload.displayName} สำเร็จ`);
      }

      setModalOpen(false);
    } catch (err: any) {
      console.error('Save user error:', err);
      setFormError(err.message || 'ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (user: UserProfile) => {
    if (user.id === currentUser?.id) {
      alert('ไม่สามารถลบบัญชีที่กำลังใช้งานอยู่ได้');
      return;
    }

    if (confirm(`คุณต้องการลบผู้ใช้งาน "${user.displayName}" ออกจากระบบหรือไม่?`)) {
      try {
        await deleteUser(user.id, user.displayName, currentUser);
        showToast(`ลบผู้ใช้งาน ${user.displayName} เรียบร้อยแล้ว`);
      } catch (err: any) {
        alert('เกิดข้อผิดพลาดในการลบผู้ใช้งาน');
      }
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-sm bg-red-100 text-red-700 border border-red-200">
            ADMIN (ผู้ดูแลระบบ)
          </span>
        );
      case 'MANAGER':
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-sm bg-purple-100 text-purple-700 border border-purple-200">
            MANAGER (ผู้บริหาร)
          </span>
        );
      case 'STAFF':
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-sm bg-blue-100 text-[#075A9C] border border-blue-200">
            STAFF (แนะแนว)
          </span>
        );
      case 'VIEWER':
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-sm bg-slate-100 text-slate-700 border border-slate-200">
            VIEWER (ผู้สังเกตการณ์)
          </span>
        );
      default:
        return null;
    }
  };

  const getTeamBadge = (teamId?: TeamId) => {
    if (teamId === 'team1') {
      return (
        <span className="text-[11px] font-medium text-[#1976D2] bg-[#E3F2FD] px-2 py-0.5 rounded-md border border-[#1976D2]/20">
          สาย 1 (เมือง/ใกล้เคียง)
        </span>
      );
    }
    if (teamId === 'team2') {
      return (
        <span className="text-[11px] font-medium text-[#D97706] bg-[#FFF7E0] px-2 py-0.5 rounded-md border border-[#F59E0B]/30">
          สาย 2 (รอบนอก/ชายแดน)
        </span>
      );
    }
    return (
      <span className="text-[11px] font-normal text-slate-400">
        ส่วนกลาง
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900/95 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-medium animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Current User Profile Card */}
      <div className="bg-gradient-to-r from-[#075A9C]/5 via-[#087CC1]/5 to-transparent p-5 rounded-2xl border border-[#087CC1]/20 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#075A9C] to-[#087CC1] text-white flex items-center justify-center font-bold text-lg shadow-sm">
              {currentUser?.displayName ? currentUser.displayName.slice(0, 2) : 'ผช'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-800">
                  {currentUser?.displayName || 'ผู้ใช้งาน'}
                </h3>
                {currentUser && getRoleBadge(currentUser.role)}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" />
                  {currentUser?.email || '-'}
                </span>
                {currentUser?.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" />
                    {currentUser.phone}
                  </span>
                )}
                <span>สายงาน: {getTeamBadge(currentUser?.teamId)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenProfile}
              id="btn-edit-my-profile"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl shadow-2xs transition-colors cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5 text-[#087CC1]" />
              <span>แก้ไขข้อมูลของฉัน</span>
            </button>
          </div>
        </div>
      </div>

      {/* Personnel & Roles Management Section */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[#087CC1]" />
              <h2 className="font-bold text-slate-800 text-sm sm:text-base">
                รายชื่อบุคลากรและจัดการสิทธิ์ผู้ใช้งาน ({users.length} คน)
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              เพิ่ม แก้ไข เปลี่ยนสิทธิ์ หรือจัดการสายงานของอาจารย์และเจ้าหน้าที่แนะแนว
            </p>
          </div>

          <button
            onClick={handleOpenAdd}
            id="btn-add-new-user"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#087CC1] hover:bg-[#075A9C] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ เพิ่มผู้ใช้งานใหม่</span>
          </button>
        </div>

        {/* Users Table */}
        <div className="border border-slate-200 rounded-xl overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-3 px-4">ชื่อ - นามสกุล</th>
                <th className="py-3 px-4">อีเมล / เบอร์โทร</th>
                <th className="py-3 px-4">สิทธิ์การใช้งาน</th>
                <th className="py-3 px-4">สายงาน</th>
                <th className="py-3 px-4">สถานะ</th>
                <th className="py-3 px-4 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => {
                const isCurrent = currentUser?.id === u.id || currentUser?.email.toLowerCase() === u.email.toLowerCase();
                return (
                  <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-[#075A9C] font-bold flex items-center justify-center text-xs shrink-0">
                          {u.displayName.slice(0, 2)}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                            <span>{u.displayName}</span>
                            {isCurrent && (
                              <span className="text-[9px] bg-emerald-100 text-emerald-800 font-medium px-1.5 py-0.2 rounded-sm">
                                บัญชีคุณ
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400">ID: {u.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-slate-700">{u.email}</div>
                      <div className="text-slate-400 text-[11px]">{u.phone || '-'}</div>
                    </td>
                    <td className="py-3 px-4">
                      {getRoleBadge(u.role)}
                    </td>
                    <td className="py-3 px-4">
                      {getTeamBadge(u.teamId)}
                    </td>
                    <td className="py-3 px-4">
                      {u.active !== false ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          ใช้งานปกติ
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-red-600 font-medium">
                          <XCircle className="w-3.5 h-3.5" />
                          ระงับการใช้งาน
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">

                        <button
                          onClick={() => handleOpenEdit(u)}
                          title="แก้ไขข้อมูลและสิทธิ์"
                          className="p-1.5 text-slate-500 hover:text-[#087CC1] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u)}
                          title="ลบผู้ใช้งาน"
                          disabled={isCurrent}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit User Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#087CC1]" />
                <h3 className="font-bold text-slate-800 text-base">
                  {editingUser ? 'แก้ไขข้อมูลและสิทธิ์ผู้ใช้งาน' : 'เพิ่มผู้ใช้งานใหม่'}
                </h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อ - นามสกุล / ตำแหน่ง <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  placeholder="เช่น อ.ปิยะ สุขสมบูรณ์ (หัวหน้างานแนะแนว)"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-[#087CC1] focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    อีเมล (สำหรับเข้าสู่ระบบ) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="เช่น teacher@utt.ac.th"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-[#087CC1] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    เบอร์โทรศัพท์ติดต่อ
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="เช่น 081-234-5678"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-[#087CC1] focus:bg-white"
                  />
                </div>
              </div>

              {!editingUser && <label className="block text-sm text-slate-700">Firebase Authentication UID
                <input required value={formData.uid} onChange={(e) => setFormData({ ...formData, uid: e.target.value })} className="w-full border border-slate-300 rounded-xl p-3 mt-2" />
                <span className="text-xs text-slate-500">สร้างบัญชีใน Firebase Authentication ก่อน แล้วคัดลอก UID เพื่อกำหนดสิทธิ์</span>
              </label>}
              {/* Role Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  กำหนดสิทธิ์การใช้งาน (Role) <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    {
                      role: 'ADMIN' as UserRole,
                      title: 'ADMIN (ผู้ดูแลระบบ)',
                      desc: 'สิทธิ์สูงสุด จัดการโรงเรียน นัดหมาย ลบข้อมูล และเพิ่มผู้ใช้',
                      color: 'border-red-200 text-red-700 bg-red-50/40',
                    },
                    {
                      role: 'MANAGER' as UserRole,
                      title: 'MANAGER (ผู้บริหาร)',
                      desc: 'ดูรายงานภาพรวมทั้งสองสาย ติดตามเป้าหมาย ส่งออก Excel',
                      color: 'border-purple-200 text-purple-700 bg-purple-50/40',
                    },
                    {
                      role: 'STAFF' as UserRole,
                      title: 'STAFF (เจ้าหน้าที่แนะแนว)',
                      desc: 'บันทึกข้อมูลโรงเรียน ยื่นหนังสือ นัดหมาย และลงรูปกิจกรรม',
                      color: 'border-blue-200 text-[#075A9C] bg-blue-50/40',
                    },
                    {
                      role: 'VIEWER' as UserRole,
                      title: 'VIEWER (ผู้สังเกตการณ์)',
                      desc: 'อ่านข้อมูลอย่างเดียว ไม่สามารถแก้ไขหรือบันทึกได้',
                      color: 'border-slate-200 text-slate-700 bg-slate-50',
                    },
                  ].map((r) => (
                    <label
                      key={r.role}
                      className={`p-3 rounded-xl border cursor-pointer flex flex-col justify-between transition-all ${
                        formData.role === r.role
                          ? 'border-[#087CC1] ring-2 ring-[#087CC1]/20 bg-white shadow-2xs'
                          : `${r.color} hover:border-slate-300`
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold">{r.title}</span>
                        <input
                          type="radio"
                          name="user-role"
                          checked={formData.role === r.role}
                          onChange={() => setFormData({ ...formData, role: r.role })}
                          className="text-[#087CC1]"
                        />
                      </div>
                      <p className="text-[10px] text-slate-500 leading-tight">{r.desc}</p>
                    </label>
                  ))}
                </div>
              </div>

              {/* Team Assignment */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  สายการปฏิบัติงาน (Assigned Team)
                </label>
                <select
                  value={formData.teamId}
                  onChange={(e) => setFormData({ ...formData, teamId: e.target.value as any })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-[#087CC1] focus:bg-white"
                >
                  <option value="team1">สายที่ 1 (โซนเมือง, ลับแล, ตรอน, พิชัย)</option>
                  <option value="team2">สายที่ 2 (โซนท่าปลา, น้ำปาด, ฟากท่า, บ้านโคก, ทองแสนขัน)</option>
                  <option value="none">ส่วนกลาง / ไม่สังกัดสายงาน</option>
                </select>
              </div>

              {/* Active Status Toggle */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <div className="text-xs font-semibold text-slate-800">สถานะการใช้งานบัญชี</div>
                  <div className="text-[10px] text-slate-500">
                    เปิดใช้งาน หรือระงับชั่วคราวเพื่อป้องกันการเข้าสู่ระบบ
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#087CC1]"></div>
                </label>
              </div>

              {/* Modal Footer Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-[#087CC1] hover:bg-[#075A9C] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-60 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit My Profile Modal */}
      {profileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <h3 className="font-bold text-slate-800 text-base">
                แก้ไขข้อมูลส่วนตัวของฉัน
              </h3>
              <button
                onClick={() => setProfileModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อ - นามสกุล ที่แสดงในระบบ
                </label>
                <input
                  type="text"
                  required
                  value={profileData.displayName}
                  onChange={(e) => setProfileData({ ...profileData, displayName: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-[#087CC1] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  เบอร์โทรศัพท์ติดต่อ
                </label>
                <input
                  type="text"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                  placeholder="เช่น 081-887-2341"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-[#087CC1] focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setProfileModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-[#087CC1] hover:bg-[#075A9C] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-60 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'กำลังบันทึก...' : 'บันทึก'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
