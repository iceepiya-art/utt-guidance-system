import React, { useState, useEffect } from 'react';
import {
  Car,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Wrench,
  Users,
  Shield,
  Save,
  X,
} from 'lucide-react';
import { Vehicle, VehicleStatus } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  subscribeVehicles,
  addVehicle,
  updateVehicle,
  deleteVehicle,
} from '../../firebase/dbService';

export const VehicleManagerSection: React.FC = () => {
  const { currentUser, isAdmin } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  const [formData, setFormData] = useState<{
    vehicleName: string;
    registrationNumber: string;
    vehicleType: 'VAN' | 'PICKUP' | 'BUS' | 'SEDAN' | 'PERSONAL';
    capacity: number;
    status: VehicleStatus;
    active: boolean;
    notes: string;
  }>({
    vehicleName: '',
    registrationNumber: '',
    vehicleType: 'VAN',
    capacity: 12,
    status: 'AVAILABLE',
    active: true,
    notes: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    return subscribeVehicles(setVehicles);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleOpenAdd = () => {
    setEditingVehicle(null);
    setFormData({
      vehicleName: '',
      registrationNumber: '',
      vehicleType: 'VAN',
      capacity: 12,
      status: 'AVAILABLE',
      active: true,
      notes: '',
    });
    setError(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (v: Vehicle) => {
    setEditingVehicle(v);
    setFormData({
      vehicleName: v.vehicleName,
      registrationNumber: v.registrationNumber,
      vehicleType: v.vehicleType || 'VAN',
      capacity: v.capacity || 12,
      status: v.status || 'AVAILABLE',
      active: v.active ?? true,
      notes: v.notes || '',
    });
    setError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vehicleName.trim() || !formData.registrationNumber.trim()) {
      setError('กรุณาระบุชื่อยานพาหนะและหมายเลขทะเบียน');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      if (editingVehicle) {
        await updateVehicle(editingVehicle.id, formData, currentUser);
        showToast('อัปเดตข้อมูลยานพาหนะสำเร็จ');
      } else {
        await addVehicle(formData, currentUser);
        showToast('เพิ่มยานพาหนะใหม่สำเร็จ');
      }
      setModalOpen(false);
    } catch (err: any) {
      setError(err?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (v: Vehicle) => {
    if (!isAdmin) return;
    if (confirm(`ยืนยันการลบยานพาหนะ "${v.vehicleName} (${v.registrationNumber})"?`)) {
      try {
        await deleteVehicle(v.id, v.vehicleName, currentUser);
        showToast('ลบข้อมูลยานพาหนะเรียบร้อยแล้ว');
      } catch (err: any) {
        alert(err?.message || 'เกิดข้อผิดพลาดในการลบ');
      }
    }
  };

  const getStatusBadge = (status?: VehicleStatus) => {
    switch (status) {
      case 'MAINTENANCE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Wrench className="w-3 h-3 text-amber-600" />
            <span>ซ่อมบำรุง</span>
          </span>
        );
      case 'IN_USE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Car className="w-3 h-3 text-blue-600" />
            <span>กำลังใช้งาน</span>
          </span>
        );
      case 'AVAILABLE':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>พร้อมใช้งาน</span>
          </span>
        );
    }
  };

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#087CC1] flex items-center justify-center">
            <Car className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-bold text-slate-800 text-sm sm:text-base">
              จัดการกองยานพาหนะขององค์กร (Fleet Management)
            </h2>
            <p className="text-xs text-slate-500">
              ยานพาหนะสำหรับใช้ในการเดินทางยื่นหนังสือและออกแนะแนวการศึกษา
            </p>
          </div>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#087CC1] hover:bg-[#075A9C] text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>เพิ่มยานพาหนะ</span>
          </button>
        )}
      </div>

      {toastMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Vehicles Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {vehicles.map((v) => (
          <div
            key={v.id}
            className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-white transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                {getStatusBadge(v.status)}
                {v.active === false && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded-sm">
                    ปิดการใช้งาน
                  </span>
                )}
              </div>

              <div className="font-bold text-slate-800 text-sm truncate">
                {v.vehicleName}
              </div>
              <div className="text-xs font-mono text-slate-500 mt-0.5">
                ทะเบียน: {v.registrationNumber}
              </div>

              <div className="mt-3 flex items-center gap-3 text-xs text-slate-600 pt-2.5 border-t border-slate-200/60">
                <div className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  <span>ความจุ: {v.capacity || 12} ที่นั่ง</span>
                </div>
              </div>

              {v.notes && (
                <p className="mt-2 text-[11px] text-slate-500 italic bg-white/80 p-1.5 rounded-lg border border-slate-100">
                  {v.notes}
                </p>
              )}
            </div>

            {isAdmin && (
              <div className="mt-4 pt-2.5 border-t border-slate-200/60 flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(v)}
                  className="p-1.5 text-slate-500 hover:text-[#087CC1] hover:bg-slate-100 rounded-lg text-xs font-semibold flex items-center gap-1"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>แก้ไข</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(v)}
                  className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg text-xs font-semibold flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>ลบ</span>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <Car className="w-4 h-4 text-[#087CC1]" />
                <span>{editingVehicle ? 'แก้ไขข้อมูลยานพาหนะ' : 'เพิ่มยานพาหนะใหม่'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อยานพาหนะ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.vehicleName}
                  onChange={(e) => setFormData({ ...formData, vehicleName: e.target.value })}
                  placeholder="เช่น รถตู้โตโยต้า คอมมิวเตอร์ คันที่ 1"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#087CC1] outline-hidden"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ทะเบียนรถ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.registrationNumber}
                    onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                    placeholder="เช่น นข-4521 อต"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#087CC1] outline-hidden"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ความจุ (ที่นั่ง)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value, 10) || 12 })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#087CC1] outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ประเภทรถ
                  </label>
                  <select
                    value={formData.vehicleType}
                    onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white outline-hidden"
                  >
                    <option value="VAN">รถตู้ (Van)</option>
                    <option value="PICKUP">รถกระบะ (Pickup)</option>
                    <option value="BUS">รถบัส / มินิบัส</option>
                    <option value="SEDAN">รถเก๋ง</option>
                    <option value="PERSONAL">รถส่วนบุคคล</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    สถานะการใช้งาน
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white outline-hidden"
                  >
                    <option value="AVAILABLE">พร้อมใช้งาน</option>
                    <option value="MAINTENANCE">ซ่อมบำรุง / เข้าศูนย์</option>
                    <option value="IN_USE">กำลังใช้งาน</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  หมายเหตุเพิ่มเติม
                </label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="เช่น ประจำอุตรดิตถ์ หรือ ซ่อมระบบแอร์"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#087CC1] outline-hidden"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="chk-active-vehicle"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="w-4 h-4 text-[#087CC1] rounded-sm"
                />
                <label htmlFor="chk-active-vehicle" className="text-xs text-slate-700 select-none">
                  เปิดให้เลือกจองใช้งานในระบบ
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-xl font-medium"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#087CC1] hover:bg-[#075A9C] text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
