import React from "react";
import { Edit2 } from "lucide-react";
import type { FieldTrip } from "../../types";
import { formatThaiShortDate } from "../../utils/dateUtils";
import { formatSchoolDisplayName } from "../../utils/schoolStatus";
import { formatAppointmentTime } from "../../utils/appointmentUtils";
import { useAuth } from "../../context/AuthContext";

export function FieldTripDetailModal({
  selectedTrip,
  responsibleNames,
  onClose,
  onPhoto,
  onEdit,
}: {
  selectedTrip: FieldTrip;
  responsibleNames: string[];
  onClose: () => void;
  onPhoto: (url: string) => void;
  onEdit?: (trip: FieldTrip) => void;
}) {
  const { canEdit } = useAuth();
  return (
    <>
      {
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          aria-label="ปิดรายละเอียด"
          onClick={() => onClose()}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="รายละเอียดการออกแนะแนว"
            className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 shadow-2xl border border-slate-200 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-bold text-[#087CC1]">
                  สรุปผลการออกแนะแนว
                </span>
                <h3 className="text-base font-bold text-slate-800 mt-0.5">
                  วันที่ {formatThaiShortDate(selectedTrip.date)}
                </h3>
              </div>
              <div className="flex items-center gap-1.5">
                {onEdit && canEdit && (
                  <button
                    type="button"
                    aria-label="แก้ไขข้อมูลการออกแนะแนว"
                    onClick={() => onEdit(selectedTrip)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#087CC1] hover:text-[#075A9C] hover:bg-sky-50 rounded-xl transition-colors cursor-pointer border border-sky-100"
                  >
                    <Edit2 size={14} />
                    <span>แก้ไขข้อมูล</span>
                  </button>
                )}
                <button
                  aria-label="ปิดรายละเอียด"
                  onClick={() => onClose()}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <p>อาจารย์แนะแนว: {responsibleNames.join(", ") || "ไม่ระบุ"}</p>
              <p>รถที่ใช้: {selectedTrip.vehicleName || "ไม่ระบุ"}</p>
              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <div className="font-bold text-slate-800">
                  โรงเรียนที่จัดกิจกรรม:
                </div>
                {selectedTrip.schools?.map((s, idx) => {
                  let formattedSlot = "ช่วงเวลาปกติ";
                  if (s.timeSlot && s.timeSlot.trim()) {
                    const clean = s.timeSlot.replace(/\s*น\.\s*$/, "").trim();
                    if (clean.includes("-")) {
                      const parts = clean.split("-").map((p) => p.trim());
                      formattedSlot = formatAppointmentTime(parts[0], parts[1]);
                    } else {
                      formattedSlot = s.timeSlot;
                    }
                  }
                  return (
                    <div
                      key={idx}
                      className="flex justify-between text-slate-700"
                    >
                      <span>
                        • {formatSchoolDisplayName(s.schoolName)} (
                        {formattedSlot})
                      </span>
                      <span className="font-semibold text-emerald-700">
                        {s.studentCount || 0} คน
                      </span>
                    </div>
                  );
                })}
              </div>

              {selectedTrip.summary && (
                <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl">
                  <div className="font-bold text-[#075A9C] mb-1">
                    ผลการปฏิบัติงาน:
                  </div>
                  <p className="text-slate-700 leading-relaxed">
                    {selectedTrip.summary}
                  </p>
                </div>
              )}

              {selectedTrip.issues && (
                <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl">
                  <div className="font-bold text-amber-900 mb-1">
                    ปัญหา / อุปสรรค:
                  </div>
                  <p className="text-slate-700 leading-relaxed">
                    {selectedTrip.issues}
                  </p>
                </div>
              )}

              {/* Photos inside modal */}
              {selectedTrip.photos && selectedTrip.photos.length > 0 && (
                <div>
                  <div className="font-bold text-slate-800 mb-2">
                    รูปภาพกิจกรรม:
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedTrip.photos.map((p, idx) => (
                      <img
                        key={p.id || idx}
                        src={p.url}
                        alt="ภาพกิจกรรม"
                        onClick={() => onPhoto(p.url)}
                        className="w-full aspect-square object-cover rounded-lg border border-slate-200 cursor-pointer hover:opacity-90"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer with Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <div>
                {onEdit && canEdit && (
                  <button
                    type="button"
                    onClick={() => onEdit(selectedTrip)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#087CC1] hover:bg-[#075A9C] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    <Edit2 size={14} />
                    <span>แก้ไขข้อมูล</span>
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => onClose()}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      }
    </>
  );
}
