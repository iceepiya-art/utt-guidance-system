import React from "react";
import { getSubmissionWorkflowNote } from "../../utils/submissionWorkflow";
import { X, Image as ImageIcon } from "lucide-react";
import type { DocumentSubmission } from "../../types";
import { formatThaiShortDate } from "../../utils/dateUtils";
import { formatSchoolDisplayName } from "../../utils/schoolStatus";
import { getSubmissionDisplayStatus } from "../../utils/submissionUtils";

export function SubmissionDetailModal({
  detail,
  statusOverride,
  noteOverride,
  submitterNames,
  onClose,
  onPhoto,
}: {
  detail: DocumentSubmission;
  statusOverride?: ReturnType<typeof getSubmissionDisplayStatus>;
  noteOverride?: string;
  submitterNames: string[];
  onClose: () => void;
  onPhoto: (url: string) => void;
}) {
  const status = statusOverride || getSubmissionDisplayStatus(detail);
  return (
    <>
      {
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => onClose()}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="รายละเอียดการยื่นหนังสือ"
            className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl my-auto overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center px-5 py-4 border-b border-slate-100 shrink-0 bg-white">
              <div>
                <h2 className="text-base font-bold text-slate-800">
                  รายละเอียดการยื่นหนังสือ
                </h2>
                <p className="text-xs font-semibold text-sky-800 mt-0.5">
                  {formatSchoolDisplayName(detail.schoolName)}
                </p>
              </div>
              <button
                type="button"
                aria-label="ปิดรายละเอียด"
                onClick={() => onClose()}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-sm flex-1">
              <dl className="space-y-2.5">
                <div className="flex justify-between border-b border-slate-50 pb-2">
                  <dt className="text-slate-500">เลขที่หนังสือ</dt>
                  <dd className="font-medium text-slate-800">
                    {detail.documentNumber || "-"}
                  </dd>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-2">
                  <dt className="text-slate-500">วันที่และเวลายื่น</dt>
                  <dd className="font-medium text-slate-800">
                    {formatThaiShortDate(detail.submissionDate)}{" "}
                    {detail.submissionTime ? `${detail.submissionTime} น.` : ""}
                  </dd>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-2">
                  <dt className="text-slate-500">สายการปฏิบัติงาน</dt>
                  <dd className="font-medium text-slate-800">
                    {detail.teamId === "team1"
                      ? "อุตรดิตถ์ (สาย 1)"
                      : "สุโขทัย (สาย 2)"}
                  </dd>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-2">
                  <dt className="text-slate-500">ยานพาหนะ</dt>
                  <dd className="font-medium text-slate-800">
                    {detail.vehicleName || "ไม่ระบุ"}
                  </dd>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-2">
                  <dt className="text-slate-500">อาจารย์ผู้ยื่น</dt>
                  <dd className="font-medium text-slate-800 text-right">
                    {submitterNames.join(", ") || "ไม่ระบุ"}
                  </dd>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-2">
                  <dt className="text-slate-500">ครูแนะแนว / เบอร์โทร</dt>
                  <dd className="font-medium text-slate-800">
                    {detail.teacherName || "-"}{" "}
                    {detail.teacherPhone && `(${detail.teacherPhone})`}
                  </dd>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-2">
                  <dt className="text-slate-500">สถานะ</dt>
                  <dd>
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-[13px] font-semibold ${status.bg} ${status.text}`}
                    >
                      {status.label}
                    </span>
                  </dd>
                </div>
                {getSubmissionDisplayStatus(detail).isOtherActivity &&
                  detail.otherActivityDetails && (
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                      <dt className="text-xs font-semibold text-emerald-800">
                        กิจกรรมอื่นๆ ที่ดำเนินการ:
                      </dt>
                      <dd className="font-medium text-emerald-900 mt-1">
                        {detail.otherActivityDetails}
                      </dd>
                    </div>
                  )}
                <div>
                  <dt className="text-slate-500 mb-1">หมายเหตุ</dt>
                  <dd className="whitespace-pre-wrap p-3 bg-slate-50 rounded-xl text-slate-700 border border-slate-100">
                    {noteOverride ?? (getSubmissionWorkflowNote(detail, [], []) || "-")}
                  </dd>
                </div>
              </dl>

              {detail.photos && detail.photos.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-600 mb-2">
                    รูปถ่ายหลักฐาน ({detail.photos.length} รูป)
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {detail.photos.map((photo, i) => (
                      <button
                        key={photo.id || i}
                        type="button"
                        onClick={() => onPhoto(photo.url)}
                        className="cursor-pointer overflow-hidden rounded-xl border border-slate-200 hover:opacity-90 hover:shadow-md transition-all text-left"
                      >
                        <img
                          src={photo.url}
                          alt={`หลักฐาน ${i + 1}`}
                          className="w-full aspect-square object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer with Clear Close Button */}
            <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-end bg-slate-50 shrink-0">
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
