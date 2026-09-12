import React, { useState, useMemo } from 'react';
import {
  Image as ImageIcon,
  Filter,
  Calendar,
  GraduationCap,
  Maximize2,
  X,
  Download,
  ExternalLink,
} from 'lucide-react';
import { FieldTrip, DocumentSubmission, School, TeamId, PhotoItem } from '../../types';
import { formatThaiShortDate } from '../../utils/dateUtils';

interface ActivityGalleryViewProps {
  fieldTrips: FieldTrip[];
  submissions: DocumentSubmission[];
  schools: School[];
}

interface GalleryPhotoWithMeta extends PhotoItem {
  sourceType: 'fieldTrip' | 'submission';
  sourceTitle: string;
  sourceDate: string;
  teamId: TeamId;
}

export const ActivityGalleryView: React.FC<ActivityGalleryViewProps> = ({
  fieldTrips,
  submissions,
  schools,
}) => {
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('all');
  const [teamFilter, setTeamFilter] = useState<'all' | TeamId>('all');
  const [sourceTypeFilter, setSourceTypeFilter] = useState<'all' | 'fieldTrip' | 'submission'>('all');
  const [lightboxPhoto, setLightboxPhoto] = useState<GalleryPhotoWithMeta | null>(null);

  // Aggregate all photos from field trips and submissions
  const allPhotos = useMemo(() => {
    const list: GalleryPhotoWithMeta[] = [];

    // From Field Trips
    fieldTrips.forEach((trip) => {
      if (trip.photos) {
        trip.photos.forEach((photo) => {
          list.push({
            ...photo,
            sourceType: 'fieldTrip',
            sourceTitle: trip.schools?.map((s) => s.schoolName).join(', ') || 'กิจกรรมแนะแนว',
            sourceDate: trip.date,
            teamId: trip.teamId,
          });
        });
      }
    });

    // From Document Submissions
    submissions.forEach((sub) => {
      if (sub.photos) {
        sub.photos.forEach((photo) => {
          list.push({
            ...photo,
            sourceType: 'submission',
            sourceTitle: `ยื่นหนังสือ: ${sub.schoolName}`,
            sourceDate: sub.submissionDate,
            teamId: sub.teamId,
          });
        });
      }
    });

    // Sort by uploadedAt or date desc
    return list.sort((a, b) => (b.sourceDate || '').localeCompare(a.sourceDate || ''));
  }, [fieldTrips, submissions]);

  // Filter photos
  const filteredPhotos = useMemo(() => {
    return allPhotos.filter((item) => {
      if (teamFilter !== 'all' && item.teamId !== teamFilter) return false;
      if (sourceTypeFilter !== 'all' && item.sourceType !== sourceTypeFilter) return false;
      if (selectedSchoolId !== 'all' && item.schoolId !== selectedSchoolId) return false;
      return true;
    });
  }, [allPhotos, teamFilter, sourceTypeFilter, selectedSchoolId]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <ImageIcon className="w-6 h-6 text-[#087CC1]" />
            <span>คลังรูปกิจกรรมและหลักฐาน ({filteredPhotos.length} รูป)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            รวบรวมภาพถ่ายการยื่นหนังสือและภาพกิจกรรมการออกแนะแนวการศึกษา
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-wrap items-center gap-3">
        {/* Team Filter */}
        <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setTeamFilter('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              teamFilter === 'all' ? 'bg-white text-slate-800 shadow-2xs' : 'text-slate-500'
            }`}
          >
            ทุกสาย
          </button>
          <button
            onClick={() => setTeamFilter('team1')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              teamFilter === 'team1' ? 'bg-[#1976D2] text-white shadow-2xs' : 'text-[#1976D2]'
            }`}
          >
            สาย 1 (เมือง)
          </button>
          <button
            onClick={() => setTeamFilter('team2')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              teamFilter === 'team2' ? 'bg-[#F59E0B] text-white shadow-2xs' : 'text-[#F59E0B]'
            }`}
          >
            สาย 2 (รอบนอก)
          </button>
        </div>

        {/* Source Type Filter */}
        <div>
          <select
            value={sourceTypeFilter}
            onChange={(e) => setSourceTypeFilter(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:ring-2 focus:ring-[#087CC1]"
          >
            <option value="all">หมวดหมู่: ทั้งหมด</option>
            <option value="fieldTrip">ภาพออกแนะแนว</option>
            <option value="submission">ภาพยื่นหนังสือ</option>
          </select>
        </div>

        {/* School Filter */}
        <div className="flex-1 min-w-[200px]">
          <select
            value={selectedSchoolId}
            onChange={(e) => setSelectedSchoolId(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:ring-2 focus:ring-[#087CC1]"
          >
            <option value="all">โรงเรียน: ทั้งหมด</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.schoolName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Photos Grid */}
      {filteredPhotos.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400">
          <ImageIcon className="w-12 h-12 mx-auto mb-2 text-slate-300" />
          <p className="text-sm">ยังไม่มีรูปภาพในหมวดหมู่นี้</p>
          <p className="text-xs mt-1 text-slate-400">
            รูปภาพจะปรากฏที่นี่เมื่อมีการบันทึกการยื่นหนังสือ หรือบันทึกการออกแนะแนว
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {filteredPhotos.map((item, idx) => {
            const isTeam1 = item.teamId === 'team1';
            return (
              <div
                key={item.id || idx}
                onClick={() => setLightboxPhoto(item)}
                className="group relative bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden cursor-pointer hover:shadow-md transition-all flex flex-col"
              >
                <div className="aspect-4/3 relative overflow-hidden bg-slate-100">
                  <img
                    src={item.url}
                    alt={item.fileName || 'รูปภาพ'}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute top-2 left-2 flex gap-1">
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm shadow-xs ${
                        isTeam1 ? 'bg-[#1976D2] text-white' : 'bg-[#F59E0B] text-white'
                      }`}
                    >
                      {isTeam1 ? 'สาย 1' : 'สาย 2'}
                    </span>
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-sm bg-black/60 text-white backdrop-blur-xs">
                      {item.sourceType === 'fieldTrip' ? 'ออกแนะแนว' : 'ยื่นหนังสือ'}
                    </span>
                  </div>
                </div>

                <div className="p-2.5 flex-1 flex flex-col justify-between text-xs">
                  <div className="font-bold text-slate-800 line-clamp-1">
                    {item.sourceTitle}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
                    <span>{formatThaiShortDate(item.sourceDate)}</span>
                    <Maximize2 className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setLightboxPhoto(null)}
        >
          <div
            className="relative max-w-4xl max-h-[92vh] w-full flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between pb-3 text-white">
              <div>
                <h3 className="font-bold text-sm sm:text-base">{lightboxPhoto.sourceTitle}</h3>
                <p className="text-xs text-white/70">
                  {formatThaiShortDate(lightboxPhoto.sourceDate)} • {lightboxPhoto.fileName}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={lightboxPhoto.url}
                  target="_blank"
                  rel="noreferrer"
                  download={lightboxPhoto.fileName || 'guidance-photo.jpg'}
                  className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
                  title="เปิดดูภาพต้นฉบับ"
                >
                  <ExternalLink className="w-5 h-5" />
                </a>
                <button
                  type="button"
                  onClick={() => setLightboxPhoto(null)}
                  className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <img
              src={lightboxPhoto.url}
              alt="ภาพขยาย"
              className="max-h-[80vh] w-auto max-w-full object-contain rounded-xl shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};
