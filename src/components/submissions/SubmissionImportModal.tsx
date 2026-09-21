import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Image as ImageIcon,
  Calendar,
  FileText,
  Search,
  School as SchoolIcon,
} from 'lucide-react';
import { DocumentSubmission, School, TeamId, PhotoItem, PostSubmissionStatus } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { createDocumentSubmission } from '../../firebase/dbService';
import { formatThaiShortDate, THAI_MONTHS, getBuddhistYear } from '../../utils/dateUtils';

interface SubmissionImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  existingSubmissions: DocumentSubmission[];
  schools: School[];
}

interface RawImportItem {
  idGuide: string;
  schoolName: string;
  documentNumber: string;
  submissionDate: string;
  submissionTime: string;
  status: PostSubmissionStatus;
  statusDetail?: string;
  counselor: string;
  submittedByName: string;
  submittedByNames: string[];
  teamId: TeamId;
  note: string;
  photos: PhotoItem[];
  otherActivityDetails?: string;
}

export const SubmissionImportModal: React.FC<SubmissionImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  existingSubmissions,
  schools,
}) => {
  const { currentUser, canEdit } = useAuth();
  const [items, setItems] = useState<RawImportItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [result, setResult] = useState<{ imported: number; skipped: number; failed: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setResult(null);
      setError(null);
      setProgress(0);
      return;
    }

    setLoading(true);
    fetch('/utt_full_letters_with_photos.json')
      .then((res) => {
        if (!res.ok) throw new Error('ไม่สามารถโหลดไฟล์ข้อมูล UTT ได้');
        return res.json();
      })
      .then((data: RawImportItem[]) => {
        setItems(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError(err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
        setLoading(false);
      });
  }, [isOpen]);

  // Clean school name helper
  const cleanSchool = (name: string) =>
    (name || '').replace(/^(โรงเรียน|รร\.)\s*/, '').trim().toLowerCase();

  // Check which items already exist in current Firestore
  const itemsWithStatus = useMemo(() => {
    return items.map((item) => {
      const itemClean = cleanSchool(item.schoolName);
      const isDuplicate = existingSubmissions.some((existing) => {
        const existClean = cleanSchool(existing.schoolName);
        const sameSchool = existClean === itemClean || existing.schoolName === item.schoolName;
        const sameDate = existing.submissionDate === item.submissionDate;
        const sameDoc = item.documentNumber && item.documentNumber !== '-' && existing.documentNumber === item.documentNumber;
        return sameSchool && (sameDate || sameDoc);
      });

      // Find matching school in DB
      const matchedSchool = schools.find((s) => {
        const sClean = cleanSchool(s.schoolName);
        return sClean === itemClean || s.schoolName === item.schoolName;
      });

      return {
        ...item,
        isDuplicate,
        schoolId: matchedSchool?.id || '',
        matchedSchoolName: matchedSchool?.schoolName || item.schoolName,
      };
    });
  }, [items, existingSubmissions, schools]);

  const newItemsCount = useMemo(() => {
    return itemsWithStatus.filter((i) => !i.isDuplicate).length;
  }, [itemsWithStatus]);

  const totalPhotosCount = useMemo(() => {
    return items.reduce((sum, i) => sum + (i.photos?.length || 0), 0);
  }, [items]);

  const availableMonths = useMemo(() => {
    const map = new Map<string, number>();
    itemsWithStatus.forEach((item) => {
      if (item.submissionDate && item.submissionDate.length >= 7) {
        const m = item.submissionDate.substring(0, 7);
        map.set(m, (map.get(m) || 0) + 1);
      }
    });
    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, count]) => {
        const [y, m] = key.split('-');
        const label = `${THAI_MONTHS[parseInt(m, 10) - 1]} ${getBuddhistYear(parseInt(y, 10))}`;
        return { key, label, count };
      });
  }, [itemsWithStatus]);

  const filteredItems = useMemo(() => {
    return itemsWithStatus.filter((item) => {
      const matchMonth = selectedMonth === 'all' || item.submissionDate.startsWith(selectedMonth);
      const matchSearch =
        !searchTerm ||
        item.schoolName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.documentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.counselor.toLowerCase().includes(searchTerm.toLowerCase());
      return matchMonth && matchSearch;
    });
  }, [itemsWithStatus, selectedMonth, searchTerm]);

  const handleStartImport = async () => {
    if (!currentUser || !canEdit || importing) return;
    setImporting(true);
    setError(null);
    setProgress(0);

    const candidates = itemsWithStatus.filter((i) => !i.isDuplicate);
    let imported = 0;
    let failed = 0;
    const skipped = itemsWithStatus.length - candidates.length;

    for (let idx = 0; idx < candidates.length; idx++) {
      const item = candidates[idx];
      try {
        await createDocumentSubmission(
          {
            schoolId: item.schoolId,
            schoolName: item.schoolName,
            documentNumber: item.documentNumber || '-',
            submissionDate: item.submissionDate,
            submissionTime: item.submissionTime || '09:00',
            teamId: item.teamId,
            teacherName: '',
            teacherPhone: '',
            status: item.status || 'WAITING_APPOINTMENT',
            note: item.note || '',
            photos: item.photos || [],
            submittedByName: item.submittedByName || 'อ.ประชา',
            submittedByNames: item.submittedByNames || ['อ.ประชา'],
            otherActivityDetails: item.otherActivityDetails,
            academicYear: '2569',
          } as any,
          currentUser
        );
        imported++;
      } catch (err) {
        console.error('Failed to import item:', item.schoolName, err);
        failed++;
      }
      setProgress(idx + 1);
    }

    setResult({ imported, skipped, failed });
    setImporting(false);
    onSuccess();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-fadeIn">
      <div
        className="bg-white w-full max-w-5xl max-h-[92vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <span>นำเข้าข้อมูลการยื่นหนังสือจากระบบ UTT</span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {items.length} รายการ
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                ดึงจาก https://www.utt.ac.th/guide/file_letter.php พร้อมรูปถ่ายหลักฐานการยื่นหนังสือครบถ้วน
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={importing}
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-30 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-red-700 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="py-20 text-center space-y-3">
              <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mx-auto" />
              <p className="text-sm font-semibold text-slate-700">กำลังโหลดรายการข้อมูลและรูปถ่าย...</p>
            </div>
          ) : result ? (
            /* Result View */
            <div className="py-10 text-center space-y-6 max-w-md mx-auto">
              <CheckCircle2 className="w-16 h-16 text-emerald-600 mx-auto animate-bounce" />
              <div>
                <h3 className="text-xl font-bold text-slate-800">นำเข้าข้อมูลเสร็จสิ้นแล้ว!</h3>
                <p className="text-xs text-slate-500 mt-1">
                  ข้อมูลการยื่นหนังสือและรูปถ่ายหลักฐานได้ถูกบันทึกลงสู่ระบบเรียบร้อย
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700">
                  <div className="text-2xl font-bold">{result.imported}</div>
                  <div className="text-xs font-semibold mt-1">นำเข้าสำเร็จ</div>
                </div>
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 text-amber-700">
                  <div className="text-2xl font-bold">{result.skipped}</div>
                  <div className="text-xs font-semibold mt-1">ข้ามข้อมูลเดิม</div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-600">
                  <div className="text-2xl font-bold">{result.failed}</div>
                  <div className="text-xs font-semibold mt-1">ไม่สำเร็จ</div>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 bg-[#087CC1] hover:bg-[#075A9C] text-white font-semibold rounded-xl text-sm transition-colors shadow-xs"
              >
                ดูรายการในหน้าระบบ
              </button>
            </div>
          ) : (
            /* Preview & Actions View */
            <>
              {/* Highlight Stats Banner */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <div className="text-xs text-slate-500">ข้อมูลจาก UTT ทั้งหมด</div>
                  <div className="text-xl font-bold text-slate-800 mt-0.5">{items.length} รายการ</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-100">
                  <div className="text-xs text-emerald-700 font-semibold">พร้อมนำเข้าใหม่</div>
                  <div className="text-xl font-bold text-emerald-700 mt-0.5">{newItemsCount} รายการ</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-100">
                  <div className="text-xs text-amber-700 font-semibold">มีในระบบแล้ว (ข้าม)</div>
                  <div className="text-xl font-bold text-amber-700 mt-0.5">{items.length - newItemsCount} รายการ</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-100">
                  <div className="text-xs text-sky-700 font-semibold">รูปถ่ายหลักฐาน</div>
                  <div className="text-xl font-bold text-sky-700 mt-0.5">{totalPhotosCount} รูป</div>
                </div>
              </div>

              {/* Filter controls */}
              <div className="flex flex-col sm:flex-row gap-2.5 items-center justify-between pt-1">
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="ค้นหาชื่อโรงเรียน, เลขที่หนังสือ, ผู้ออกแนะแนว..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#087CC1] focus:bg-white"
                  />
                </div>

                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 shrink-0 w-full sm:w-auto">
                  <Calendar className="w-4 h-4 text-[#087CC1] shrink-0" />
                  <span className="text-xs font-semibold text-slate-500">เดือน:</span>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="bg-transparent text-sm font-semibold text-slate-700 outline-none cursor-pointer"
                  >
                    <option value="all">ทุกเดือน ({items.length})</option>
                    {availableMonths.map((m) => (
                      <option key={m.key} value={m.key}>
                        {m.label} ({m.count})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Progress Bar when importing */}
              {importing && (
                <div className="p-4 bg-sky-50 border border-sky-200 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-sky-800">
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="w-4 h-4 animate-spin text-sky-700" />
                      กำลังนำเข้าข้อมูลสู่ระบบ...
                    </span>
                    <span>
                      {progress} / {newItemsCount} รายการ
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-sky-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-sky-600 transition-all duration-200"
                      style={{ width: `${(progress / Math.max(1, newItemsCount)) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Table Preview */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="overflow-x-auto max-h-[380px]">
                  <table className="w-full text-left text-sm min-w-[780px]">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold text-xs sticky top-0 z-10">
                      <tr>
                        <th className="py-2.5 px-3 text-center w-12">ลำดับ</th>
                        <th className="py-2.5 px-3">รูปภาพ</th>
                        <th className="py-2.5 px-3 min-w-[180px]">โรงเรียน</th>
                        <th className="py-2.5 px-3 min-w-[110px]">เลขที่หนังสือ</th>
                        <th className="py-2.5 px-3 min-w-[120px]">วันที่ยื่น</th>
                        <th className="py-2.5 px-3 min-w-[80px] text-center">สาย</th>
                        <th className="py-2.5 px-3 min-w-[120px]">ผู้ออกแนะแนว</th>
                        <th className="py-2.5 px-3 text-center min-w-[100px]">สถานะนำเข้า</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {filteredItems.map((item, idx) => {
                        const isTeam1 = item.teamId === 'team1';
                        const hasPhotos = item.photos && item.photos.length > 0;
                        return (
                          <tr
                            key={idx}
                            className={`hover:bg-slate-50/80 transition-colors ${
                              item.isDuplicate ? 'bg-slate-50/50 text-slate-400' : ''
                            }`}
                          >
                            <td className="py-2.5 px-3 text-center font-medium text-slate-400">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-3">
                              {hasPhotos ? (
                                <a
                                  href={item.photos[0].url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="group relative block w-10 h-10 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shrink-0"
                                >
                                  <img
                                    src={item.photos[0].url}
                                    alt="หลักฐาน"
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                                    loading="lazy"
                                  />
                                </a>
                              ) : (
                                <span className="text-slate-300 text-[11px]">-</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-semibold text-slate-800 text-sm">
                                {item.schoolName}
                              </div>
                              {item.otherActivityDetails && (
                                <div className="text-[11px] text-emerald-700 mt-0.5">
                                  {item.otherActivityDetails}
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-600">
                              {item.documentNumber || '-'}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <div className="font-medium text-slate-800">
                                {formatThaiShortDate(item.submissionDate)}
                              </div>
                              {item.submissionTime && (
                                <div className="text-[11px] text-slate-400">
                                  {item.submissionTime} น.
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-md font-bold text-[10px] ${
                                  isTeam1 ? 'bg-[#E3F2FD] text-[#1976D2]' : 'bg-[#FFF7E0] text-[#F59E0B]'
                                }`}
                              >
                                {isTeam1 ? 'อุตรดิตถ์' : 'สุโขทัย'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-medium text-slate-700">
                              {item.counselor || '-'}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {item.isDuplicate ? (
                                <span className="inline-block px-2 py-0.5 rounded-md font-semibold text-[11px] bg-amber-50 text-amber-700 border border-amber-200">
                                  มีในระบบแล้ว
                                </span>
                              ) : (
                                <span className="inline-block px-2 py-0.5 rounded-md font-semibold text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  พร้อมนำเข้า
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!result && (
          <div className="bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              {newItemsCount > 0 ? (
                <span>
                  จะนำเข้าข้อมูลใหม่ <b className="text-emerald-700">{newItemsCount}</b> รายการ (ข้ามรายการเดิมอัตโนมัติ)
                </span>
              ) : (
                <span className="text-emerald-700 font-semibold">
                  ข้อมูลทั้ง 126 รายการมีครบในระบบแล้ว
                </span>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                disabled={importing}
                onClick={onClose}
                className="px-4 py-2 text-sm font-semibold rounded-xl text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={importing || newItemsCount === 0 || !canEdit}
                onClick={handleStartImport}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-xs disabled:opacity-40 transition-colors"
              >
                {importing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>กำลังนำเข้า...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>ยืนยันนำเข้า {newItemsCount} รายการ (พร้อมรูปถ่าย)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
