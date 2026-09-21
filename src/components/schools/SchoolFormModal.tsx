import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { School, SchoolStatus, TeamId } from '../../types';
import {
  ALL_THAI_PROVINCES,
  getDistrictsByProvince,
} from '../../constants/thaiProvinces';

interface SchoolFormModalProps {
  schoolToEdit: School | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (schoolData: Omit<School, 'id'>) => Promise<void>;
}

export const SchoolFormModal: React.FC<SchoolFormModalProps> = ({
  schoolToEdit,
  isOpen,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<Omit<School, 'id'>>({
    schoolId: '',
    schoolName: '',
    educationLevels: 'ม.1 - ม.6',
    studentM3: 0,
    studentM6: 0,
    schoolPhone: '',
    teacherName: '',
    teacherPosition: 'ครูแนะแนว',
    teacherPhone: '',
    teacherLine: '',
    preferredContactTime: '',
    district: 'เมืองอุตรดิตถ์',
    province: 'อุตรดิตถ์',
    teamId: 'team1',
    currentStatus: 'NOT_STARTED',
    note: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (schoolToEdit) {
      setFormData({
        schoolId: schoolToEdit.schoolId || '',
        schoolName: schoolToEdit.schoolName || '',
        educationLevels: schoolToEdit.educationLevels || 'ม.1 - ม.6',
        studentM3: schoolToEdit.studentM3 || 0,
        studentM6: schoolToEdit.studentM6 || 0,
        schoolPhone: schoolToEdit.schoolPhone || '',
        teacherName: schoolToEdit.teacherName || '',
        teacherPosition: schoolToEdit.teacherPosition || '',
        teacherPhone: schoolToEdit.teacherPhone || '',
        teacherLine: schoolToEdit.teacherLine || '',
        preferredContactTime: schoolToEdit.preferredContactTime || '',
        district: schoolToEdit.district || 'เมืองอุตรดิตถ์',
        province: schoolToEdit.province || 'อุตรดิตถ์',
        teamId: schoolToEdit.teamId || 'team1',
        currentStatus: schoolToEdit.currentStatus || 'NOT_STARTED',
        note: schoolToEdit.note || '',
        createdAt: schoolToEdit.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } else {
      setFormData({
        schoolId: `SCH-${Math.floor(100 + Math.random() * 900)}`,
        schoolName: '',
        educationLevels: 'ม.1 - ม.6',
        studentM3: 0,
        studentM6: 0,
        schoolPhone: '',
        teacherName: '',
        teacherPosition: 'ครูแนะแนว',
        teacherPhone: '',
        teacherLine: '',
        preferredContactTime: '',
        district: 'เมืองอุตรดิตถ์',
        province: 'อุตรดิตถ์',
        teamId: 'team1',
        currentStatus: 'NOT_STARTED',
        note: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }, [schoolToEdit, isOpen]);

  const [isCustomProvince, setIsCustomProvince] = useState(false);
  const [isCustomDistrict, setIsCustomDistrict] = useState(false);

  // Available districts dynamically filtered by selected province
  const currentDistricts = useMemo(() => {
    return getDistrictsByProvince(formData.province);
  }, [formData.province]);

  useEffect(() => {
    if (isOpen) {
      setIsCustomProvince(!ALL_THAI_PROVINCES.includes(formData.province) && formData.province !== '');
      const districts = getDistrictsByProvince(formData.province);
      setIsCustomDistrict(!districts.includes(formData.district) && formData.district !== '');
    }
  }, [isOpen, formData.province]);

  const handleProvinceChange = (newProvince: string) => {
    const districts = getDistrictsByProvince(newProvince);
    const defaultDistrict = districts[0] || '';
    // Auto-select team: Sukhothai is team2, Uttaradit is team1
    const autoTeam: TeamId = newProvince === 'สุโขทัย' ? 'team2' : 'team1';

    setIsCustomDistrict(false);
    setFormData((prev) => ({
      ...prev,
      province: newProvince,
      district: districts.includes(prev.district) ? prev.district : defaultDistrict,
      teamId: autoTeam,
    }));
  };

  const handleDistrictChange = (newDistrict: string) => {
    setFormData((prev) => ({
      ...prev,
      district: newDistrict,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.schoolName.trim()) {
      setError('กรุณากรอกชื่อโรงเรียน');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await onSave(formData);
      onClose();
    } catch (err: any) {
      setError(err.message || 'บันทึกข้อมูลไม่สำเร็จ');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-2xl">
          <h2 className="text-lg font-bold text-slate-800">
            {schoolToEdit ? 'แก้ไขข้อมูลโรงเรียน' : 'เพิ่มข้อมูลโรงเรียนใหม่'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Row 1: Code & Name */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                รหัสโรงเรียน
              </label>
              <input
                type="text"
                value={formData.schoolId}
                onChange={(e) => setFormData({ ...formData, schoolId: e.target.value })}
                placeholder="SCH-001"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#087CC1] focus:bg-white"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ชื่อโรงเรียน <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.schoolName}
                onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                placeholder="เช่น โรงเรียนอุตรดิตถ์ดรุณี"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#087CC1] focus:bg-white"
                required
              />
            </div>
          </div>

          {/* Row 2: Location & Team (Order: จังหวัด -> อำเภอ -> สายการปฏิบัติงาน) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* 1. จังหวัด (Province) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                จังหวัด <span className="text-red-500">*</span>
              </label>
              <select
                value={isCustomProvince ? 'custom' : formData.province}
                onChange={(e) => {
                  if (e.target.value === 'custom') {
                    setIsCustomProvince(true);
                  } else {
                    setIsCustomProvince(false);
                    handleProvinceChange(e.target.value);
                  }
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#087CC1] focus:bg-white"
                required
              >
                <optgroup label="จังหวัดเป้าหมายหลัก">
                  <option value="อุตรดิตถ์">อุตรดิตถ์</option>
                  <option value="สุโขทัย">สุโขทัย</option>
                </optgroup>
                <optgroup label="จังหวัดทั้งหมดในไทย">
                  {ALL_THAI_PROVINCES.filter((p) => p !== 'อุตรดิตถ์' && p !== 'สุโขทัย').map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </optgroup>
                <option value="custom">-- ระบุจังหวัดอื่น --</option>
              </select>
              {isCustomProvince && (
                <input
                  type="text"
                  placeholder="ระบุชื่อจังหวัด"
                  value={formData.province}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData((prev) => ({
                      ...prev,
                      province: val,
                      district: getDistrictsByProvince(val)[0] || '',
                    }));
                  }}
                  className="mt-1.5 w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#087CC1]"
                  autoFocus
                />
              )}
            </div>

            {/* 2. อำเภอ (District - Changes dynamically based on Province!) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                อำเภอ <span className="text-red-500">*</span>
              </label>
              <select
                value={isCustomDistrict ? 'custom' : formData.district}
                onChange={(e) => {
                  if (e.target.value === 'custom') {
                    setIsCustomDistrict(true);
                  } else {
                    setIsCustomDistrict(false);
                    handleDistrictChange(e.target.value);
                  }
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#087CC1] focus:bg-white"
                required
              >
                {currentDistricts.map((dist) => (
                  <option key={dist} value={dist}>
                    {dist}
                  </option>
                ))}
                {/* If the current district isn't in currentDistricts, still show it */}
                {!currentDistricts.includes(formData.district) && formData.district && !isCustomDistrict && (
                  <option value={formData.district}>{formData.district}</option>
                )}
                <option value="custom">-- ระบุอำเภออื่น --</option>
              </select>
              {isCustomDistrict && (
                <input
                  type="text"
                  placeholder="ระบุชื่ออำเภอ"
                  value={formData.district}
                  onChange={(e) => setFormData((prev) => ({ ...prev, district: e.target.value }))}
                  className="mt-1.5 w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#087CC1]"
                  autoFocus
                />
              )}
            </div>

            {/* 3. สายการปฏิบัติงาน (Team) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                สายการปฏิบัติงาน
              </label>
              <select
                value={formData.teamId}
                onChange={(e) => setFormData({ ...formData, teamId: e.target.value as TeamId })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#087CC1] focus:bg-white"
              >
                <option value="team1">สาย 1: อุตรดิตถ์</option>
                <option value="team2">สาย 2: สุโขทัย</option>
              </select>
            </div>
          </div>

          {/* Row 3: Education & Student Counts */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ระดับชั้น
              </label>
              <input
                type="text"
                value={formData.educationLevels}
                onChange={(e) => setFormData({ ...formData, educationLevels: e.target.value })}
                placeholder="เช่น ม.1 - ม.3 หรือ ม.1 - ม.6"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                จำนวนนักเรียน ม.3 (คน)
              </label>
              <input
                type="number"
                value={formData.studentM3 || ''}
                onChange={(e) => setFormData({ ...formData, studentM3: Number(e.target.value) })}
                placeholder="0"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                จำนวนนักเรียน ม.6 (คน)
              </label>
              <input
                type="number"
                value={formData.studentM6 || ''}
                onChange={(e) => setFormData({ ...formData, studentM6: Number(e.target.value) })}
                placeholder="0"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm"
              />
            </div>
          </div>

          {/* Contact Section: Guidance Teacher */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
            <h3 className="text-xs font-bold text-[#075A9C] uppercase tracking-wider">
              ข้อมูลผู้ประสานงาน / ครูแนะแนว
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อครูแนะแนว
                </label>
                <input
                  type="text"
                  value={formData.teacherName}
                  onChange={(e) => setFormData({ ...formData, teacherName: e.target.value })}
                  placeholder="เช่น ครูสมใจ จันทร์เพ็ญ"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ตำแหน่ง
                </label>
                <input
                  type="text"
                  value={formData.teacherPosition}
                  onChange={(e) => setFormData({ ...formData, teacherPosition: e.target.value })}
                  placeholder="เช่น หัวหน้างานแนะแนว"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  เบอร์โทรครูแนะแนว
                </label>
                <input
                  type="tel"
                  value={formData.teacherPhone}
                  onChange={(e) => setFormData({ ...formData, teacherPhone: e.target.value })}
                  placeholder="08x-xxx-xxxx"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  LINE / ช่องทางติดต่อ
                </label>
                <input
                  type="text"
                  value={formData.teacherLine}
                  onChange={(e) => setFormData({ ...formData, teacherLine: e.target.value })}
                  placeholder="Line ID / เบอร์"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  เบอร์โทรโรงเรียน
                </label>
                <input
                  type="tel"
                  value={formData.schoolPhone}
                  onChange={(e) => setFormData({ ...formData, schoolPhone: e.target.value })}
                  placeholder="055-xxxxxx"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                เวลาที่สะดวกให้ติดต่อ
              </label>
              <input
                type="text"
                value={formData.preferredContactTime}
                onChange={(e) => setFormData({ ...formData, preferredContactTime: e.target.value })}
                placeholder="เช่น ช่วงพักกลางวัน 12:00 - 13:00 น. หรือ หลังเลิกเรียน"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm"
              />
            </div>
          </div>

          {/* Status & Note */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                สถานะปัจจุบัน
              </label>
              <select
                value={formData.currentStatus}
                onChange={(e) => setFormData({ ...formData, currentStatus: e.target.value as SchoolStatus })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm"
              >
                <option value="NOT_STARTED">ยังไม่ดำเนินการ</option>
                <option value="DOCUMENT_SUBMITTED">ยื่นหนังสือแล้ว / รอนัดหมาย</option>
                <option value="WAITING_CONTACT">รอติดต่อกลับ</option>
                <option value="WAITING_APPOINTMENT">รอนัดหมาย</option>
                <option value="APPOINTED">นัดหมายแล้ว</option>
                <option value="GUIDANCE_COMPLETED">ออกแนะแนวแล้ว</option>
                <option value="CANCELLED">ยกเลิก</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                หมายเหตุ
              </label>
              <input
                type="text"
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                placeholder="ข้อมูลเพิ่มเติม เช่น จุดเด่น ขนาดหอประชุม"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#087CC1] hover:bg-[#075A9C] text-white text-xs font-semibold rounded-xl shadow-xs disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
