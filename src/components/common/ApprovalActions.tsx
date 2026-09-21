import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  FileEdit,
  Send,
  XCircle,
  ShieldCheck,
  MessageSquare,
} from 'lucide-react';
import { ApprovalStatus } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { formatThaiShortDate } from '../../utils/dateUtils';

interface ApprovalActionsProps {
  currentStatus?: ApprovalStatus;
  approvedByName?: string;
  approvedAt?: string;
  approvalNote?: string;
  onApprove?: (note?: string) => Promise<void>;
  onReject?: (reason: string) => Promise<void>;
  onSubmitForApproval?: () => Promise<void>;
  compact?: boolean;
}

export const ApprovalBadge: React.FC<{ status?: ApprovalStatus }> = ({ status = 'APPROVED' }) => {
  switch (status) {
    case 'PENDING_APPROVAL':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          <span>รออนุมัติ</span>
        </span>
      );
    case 'REVISION_REQUESTED':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
          <AlertCircle className="w-3 h-3 text-rose-500" />
          <span>ส่งกลับแก้ไข</span>
        </span>
      );
    case 'DRAFT':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
          <FileEdit className="w-3 h-3 text-slate-400" />
          <span>ฉบับร่าง</span>
        </span>
      );
    case 'APPROVED':
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          <span>อนุมัติแล้ว</span>
        </span>
      );
  }
};

export const ApprovalActions: React.FC<ApprovalActionsProps> = ({
  currentStatus = 'APPROVED',
  approvedByName,
  approvedAt,
  approvalNote,
  onApprove,
  onReject,
  onSubmitForApproval,
  compact = false,
}) => {
  const { isAdmin, isManager } = useAuth();
  const canApprove = isAdmin || isManager;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState<'approve' | 'reject'>('approve');
  const [noteInput, setNoteInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenApproveModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    setModalAction('approve');
    setNoteInput('');
    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenRejectModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    setModalAction('reject');
    setNoteInput('');
    setError(null);
    setIsModalOpen(true);
  };

  const handleConfirmAction = async () => {
    if (modalAction === 'reject' && !noteInput.trim()) {
      setError('กรุณาระบุเหตุผลที่ส่งกลับแก้ไข');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      if (modalAction === 'approve' && onApprove) {
        await onApprove(noteInput.trim() || undefined);
      } else if (modalAction === 'reject' && onReject) {
        await onReject(noteInput.trim());
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setError(err?.message || 'เกิดข้อผิดพลาดในการบันทึกผลการพิจารณา');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onSubmitForApproval) return;
    setLoading(true);
    try {
      await onSubmitForApproval();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-1.5" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center gap-2 flex-wrap">
        <ApprovalBadge status={currentStatus} />

        {/* Manager/Admin controls */}
        {canApprove && currentStatus !== 'APPROVED' && (
          <div className="flex items-center gap-1.5">
            {onApprove && (
              <button
                type="button"
                onClick={handleOpenApproveModal}
                disabled={loading}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                title="อนุมัติรายการนี้"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>อนุมัติ</span>
              </button>
            )}
            {onReject && (
              <button
                type="button"
                onClick={handleOpenRejectModal}
                disabled={loading}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                title="ส่งกลับเพื่อแก้ไข"
              >
                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                <span>ส่งกลับแก้ไข</span>
              </button>
            )}
          </div>
        )}

        {/* Staff submit button */}
        {!canApprove && (currentStatus === 'DRAFT' || currentStatus === 'REVISION_REQUESTED') && onSubmitForApproval && (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#087CC1] hover:bg-[#075A9C] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Send className="w-3 h-3" />
            <span>ส่งขออนุมัติ</span>
          </button>
        )}
      </div>

      {/* History notes banner */}
      {!compact && (approvedByName || approvalNote) && (
        <div className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200/80 rounded-lg p-2 space-y-0.5">
          {approvedByName && (
            <div className="flex items-center gap-1 font-medium text-slate-700">
              <ShieldCheck className="w-3.5 h-3.5 text-[#087CC1]" />
              <span>ผู้พิจารณา: {approvedByName}</span>
              {approvedAt && <span className="text-slate-400">({formatThaiShortDate(approvedAt)})</span>}
            </div>
          )}
          {approvalNote && (
            <div className="flex items-start gap-1 text-slate-600">
              <MessageSquare className="w-3 h-3 text-slate-400 mt-0.5 shrink-0" />
              <span className="italic font-normal">"{approvalNote}"</span>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              {modalAction === 'approve' ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-bold text-slate-800 text-sm">อนุมัติรายการ</h3>
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5 text-rose-600" />
                  <h3 className="font-bold text-slate-800 text-sm">ส่งกลับแก้ไข / ไม่อนุมัติ</h3>
                </>
              )}
            </div>

            {error && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {modalAction === 'approve' ? 'บันทึกความเห็นเพิ่มเติม (ถ้ามี)' : 'เหตุผลที่ส่งกลับแก้ไข (จำเป็น)'}
              </label>
              <textarea
                rows={3}
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder={
                  modalAction === 'approve'
                    ? 'เช่น อนุมัติแผนการเดินทางและการใช้รถตู้'
                    : 'เช่น กรุณาปรับเปลี่ยนเวลาให้ไม่ตรงกับคาบสอนวิชาหลัก หรือเปลี่ยนอาจารย์ผู้รับผิดชอบ'
                }
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-[#087CC1] focus:bg-white outline-hidden"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={loading}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-xl font-medium"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                disabled={loading}
                className={`px-4 py-1.5 text-xs font-semibold rounded-xl text-white shadow-xs ${
                  modalAction === 'approve'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {loading ? 'กำลังบันทึก...' : modalAction === 'approve' ? 'ยืนยันอนุมัติ' : 'ส่งกลับแก้ไข'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
