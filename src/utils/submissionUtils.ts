import { DocumentSubmission } from '../types';

/**
 * Checks if otherActivityDetails is an exact/verified alias for normal guidance workflow
 * (e.g. "ยื่นหนังสือแนะแนว", "ยื่นหนังสือ", "แนะแนว")
 * rather than a genuine distinct other activity like "Open House", "Techno Cup", or "ยื่นใบเสร็จ".
 */
export const isNormalGuidanceActivity = (details?: string): boolean => {
  if (!details) return true;
  const d = details.trim();
  if (!d) return true;
  return /^(ยื่นหนังสือ(\s*แนะแนว(\s*การศึกษา)?)?|แนะแนว)$/.test(d);
};

export interface SubmissionDisplayStatus {
  label: string;
  bg: string;
  text: string;
  isOtherActivity: boolean;
}

/**
 * Returns the display status for the Submissions page.
 * 
 * Workflow Separation Rule:
 * - Submissions View = Submission history only!
 * - Normal guidance submissions display "ยื่นแล้ว".
 * - Genuine other activities (Open House, Techno Cup, etc.) display "กิจกรรมอื่นๆ".
 * - No cross-workflow status calculation (no "นัดหมายแล้ว", no "ออกแนะแนวแล้ว" on this page).
 */
export const getSubmissionDisplayStatus = (
  sub: DocumentSubmission
): SubmissionDisplayStatus => {
  if (sub.status === 'OTHER_ACTIVITY') {
    if (isNormalGuidanceActivity(sub.otherActivityDetails)) {
      // Legacy normal guidance submission recorded as OTHER_ACTIVITY + "ยื่นหนังสือแนะแนว"
      return {
        label: 'ยื่นแล้ว',
        bg: 'bg-blue-50',
        text: 'text-blue-700',
        isOtherActivity: false,
      };
    }
    // Genuine other activity (Open House, Techno Cup, ยื่นใบเสร็จ, etc.)
    return {
      label: 'กิจกรรมอื่นๆ',
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      isOtherActivity: true,
    };
  }

  if (sub.status === 'WAITING_CONTACT') {
    return { label: 'รอติดต่อกลับ', bg: 'bg-amber-50', text: 'text-amber-700', isOtherActivity: false };
  }
  if (sub.status === 'CALL_LATER') {
    return { label: 'ขอให้ติดต่อภายหลัง', bg: 'bg-orange-50', text: 'text-orange-700', isOtherActivity: false };
  }
  if (sub.status === 'NOT_READY') {
    return { label: 'โรงเรียนยังไม่พร้อม', bg: 'bg-slate-100', text: 'text-slate-600', isOtherActivity: false };
  }

  // All normal guidance submissions (DOCUMENT_SUBMITTED, WAITING_APPOINTMENT, etc.)
  return {
    label: 'ยื่นแล้ว',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    isOtherActivity: false,
  };
};
