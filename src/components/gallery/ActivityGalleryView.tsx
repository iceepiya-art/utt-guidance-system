import React, { useState, useMemo } from 'react';
import {
  Image as ImageIcon,
  Maximize2,
  X,
  ExternalLink,
  Search,
  Camera,
  FileText,
} from 'lucide-react';
import { FieldTrip, School, TeamId, PhotoItem, Appointment, DocumentSubmission } from '../../types';
import { formatThaiShortDate } from '../../utils/dateUtils';

interface ActivityGalleryViewProps {
  fieldTrips?: FieldTrip[];
  schools: School[];
  appointments?: Appointment[];
  submissions?: DocumentSubmission[];
}

interface GalleryPhotoWithMeta extends PhotoItem {
  sourceTitle: string;
  sourceDate: string;
  teamId: TeamId;
  activityTitle: string;
  category: 'guidance' | 'submission';
}

export const ActivityGalleryView: React.FC<ActivityGalleryViewProps> = ({
  fieldTrips = [],
  schools,
  appointments = [],
  submissions = [],
}) => {
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('all');
  const [teamFilter, setTeamFilter] = useState<'all' | TeamId>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'guidance' | 'submission'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [lightboxPhoto, setLightboxPhoto] = useState<GalleryPhotoWithMeta | null>(null);

  // Unified photo repository connecting appointments, submissions, and fieldTrips
  const allPhotos = useMemo(() => {
    const list: GalleryPhotoWithMeta[] = [];
    const seenUrls = new Set<string>();

    // 1. Photos from Appointments (Guidance activity)
    appointments.forEach((app) => {
      if (app.photos && app.photos.length > 0) {
        app.photos.forEach((photo) => {
          if (!photo.url || seenUrls.has(photo.url)) return;
          seenUrls.add(photo.url);
          list.push({
            ...photo,
            sourceTitle: app.schoolName || 'กิจกรรมแนะแนว',
            sourceDate: app.date,
            teamId: app.teamId,
            activityTitle: app.workType || 'ออกแนะแนวการศึกษา',
            schoolId: photo.schoolId || app.schoolId,
            category: 'guidance',
          });
        });
      }
    });

    // 2. Photos from FieldTrips
    fieldTrips.forEach((trip) => {
      if (trip.photos && trip.photos.length > 0) {
        trip.photos.forEach((photo) => {
          if (!photo.url || seenUrls.has(photo.url)) return;
          seenUrls.add(photo.url);
          list.push({
            ...photo,
            sourceTitle: trip.schools?.map((s) => s.schoolName).join(', ') || 'กิจกรรมแนะแนว',
            sourceDate: trip.date,
            teamId: trip.teamId,
            activityTitle: trip.workType || 'ออกแนะแนว',
            schoolId: photo.schoolId || trip.schools?.[0]?.schoolId,
            category: 'guidance',
          });
        });
      }
    });

    // 3. Photos from Document Submissions (Letter submission evidence)
    submissions.forEach((sub) => {
      if (sub.photos && sub.photos.length > 0) {
        sub.photos.forEach((photo) => {
          if (!photo.url || seenUrls.has(photo.url)) return;
          seenUrls.add(photo.url);
          list.push({
            ...photo,
            sourceTitle: sub.schoolName || 'ยื่นหนังสือ',
            sourceDate: sub.submissionDate,
            teamId: sub.teamId,
            activityTitle: `ยื่นหนังสือ (${sub.documentNumber || 'มีหลักฐาน'})`,
            schoolId: photo.schoolId || sub.schoolId,
            category: 'submission',
          });
        });
      }
    });

    return list.sort((a, b) => (b.sourceDate || '').localeCompare(a.sourceDate || ''));
  }, [appointments, fieldTrips, submissions]);

  // Counts for category badges
  const categoryCounts = useMemo(() => {
    let guidanceCount = 0;
    let submissionCount = 0;
    allPhotos.forEach((p) => {
      if (p.category === 'guidance') guidanceCount++;
      if (p.category === 'submission') submissionCount++;
    });
    return {
      all: allPhotos.length,
      guidance: guidanceCount,
      submission: submissionCount,
    };
  }, [allPhotos]);

  // Filter photos
  const filteredPhotos = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allPhotos.filter((item) => {
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
      if (teamFilter !== 'all' && item.teamId !== teamFilter) return false;
      if (selectedSchoolId !== 'all' && item.schoolId !== selectedSchoolId) return false;
      if (q) {
        const matchTitle = item.sourceTitle.toLowerCase().includes(q);
        const matchActivity = item.activityTitle.toLowerCase().includes(q);
        const matchFile = (item.fileName || '').toLowerCase().includes(q);
        if (!matchTitle && !matchActivity && !matchFile) return false;
      }
      return true;
    });
  }, [allPhotos, categoryFilter, teamFilter, selectedSchoolId, searchQuery]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ImageIcon className="w-6 h-6 text-[#087CC1]" />
            <span>คลังรูปภาพกิจกรรมและหลักฐาน ({filteredPhotos.length} รูป)</span>
          </h1>
          <p className="text-[13px] sm:text-sm text-slate-500 mt-1">
            รวบรวมรูปภาพจากกิจกรรมออกแนะแนวและหลักฐานการยื่นหนังสือทุกโรงเรียนอย่างครบถ้วน
          </p>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              categoryFilter === 'all'
                ? 'bg-white text-slate-800 shadow-2xs'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            <span>ทั้งหมด</span>
            <span className="px-1.5 py-0.2 text-[11px] rounded-full bg-slate-200/70 text-slate-700">
              {categoryCounts.all}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter('guidance')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              categoryFilter === 'guidance'
                ? 'bg-[#087CC1] text-white shadow-2xs'
                : 'text-slate-600 hover:text-[#087CC1]'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>กิจกรรมแนะแนว</span>
            <span className={`px-1.5 py-0.2 text-[11px] rounded-full ${
              categoryFilter === 'guidance' ? 'bg-white/25 text-white' : 'bg-slate-200/70 text-slate-700'
            }`}>
              {categoryCounts.guidance}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter('submission')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              categoryFilter === 'submission'
                ? 'bg-[#10B981] text-white shadow-2xs'
                : 'text-slate-600 hover:text-[#10B981]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>ยื่นหนังสือ</span>
            <span className={`px-1.5 py-0.2 text-[11px] rounded-full ${
              categoryFilter === 'submission' ? 'bg-white/25 text-white' : 'bg-slate-200/70 text-slate-700'
            }`}>
              {categoryCounts.submission}
            </span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-wrap items-center gap-3">
        {/* Search School or Activity */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาชื่อโรงเรียน หรือกิจกรรม..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-[#087CC1] focus:border-transparent outline-none transition-all"
          />
        </div>

        {/* Team Filter */}
        <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setTeamFilter('all')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-colors ${
              teamFilter === 'all' ? 'bg-white text-slate-800 shadow-2xs' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            ทุกสาย
          </button>
          <button
            type="button"
            onClick={() => setTeamFilter('team1')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-colors ${
              teamFilter === 'team1' ? 'bg-[#1976D2] text-white shadow-2xs' : 'text-[#1976D2]'
            }`}
          >
            อุตรดิตถ์
          </button>
          <button
            type="button"
            onClick={() => setTeamFilter('team2')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-colors ${
              teamFilter === 'team2' ? 'bg-[#F59E0B] text-white shadow-2xs' : 'text-[#F59E0B]'
            }`}
          >
            สุโขทัย
          </button>
        </div>

        {/* School Filter Dropdown */}
        <div className="w-full sm:w-auto sm:min-w-[200px]">
          <select
            value={selectedSchoolId}
            onChange={(e) => setSelectedSchoolId(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:bg-white focus:ring-2 focus:ring-[#087CC1]"
          >
            <option value="all">ทุกโรงเรียน</option>
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
          <p className="text-sm font-medium text-slate-600">ไม่พบรูปภาพตามเงื่อนไขที่ค้นหา</p>
          <p className="text-xs mt-1 text-slate-400">
            ลองล้างคำค้นหา หรือเปลี่ยนหมวดหมู่ / สายปฏิบัติงาน / โรงเรียน
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {filteredPhotos.map((item, idx) => {
            const isTeam1 = item.teamId === 'team1';
            const isGuidance = item.category === 'guidance';
            return (
              <div
                key={item.id || `${item.url}-${idx}`}
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
                  <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-md shadow-xs ${
                        isTeam1 ? 'bg-[#1976D2] text-white' : 'bg-[#F59E0B] text-white'
                      }`}
                    >
                      {isTeam1 ? 'อุตรดิตถ์' : 'สุโขทัย'}
                    </span>
                    <span
                      className={`text-[11px] font-medium px-2 py-0.5 rounded-md text-white shadow-xs backdrop-blur-xs ${
                        isGuidance ? 'bg-sky-700/90' : 'bg-emerald-700/90'
                      }`}
                    >
                      {isGuidance ? 'แนะแนว' : 'ยื่นหนังสือ'}
                    </span>
                  </div>
                </div>

                <div className="p-3 flex-1 flex flex-col justify-between text-xs">
                  <div>
                    <div className="font-bold text-slate-800 text-sm line-clamp-1 group-hover:text-[#087CC1] transition-colors">
                      {item.sourceTitle}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                      {item.activityTitle}
                    </div>
                  </div>
                  <div className="text-xs text-slate-400 mt-2 flex items-center justify-between pt-1 border-t border-slate-100">
                    <span>{formatThaiShortDate(item.sourceDate)}</span>
                    <Maximize2 className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
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
                  {formatThaiShortDate(lightboxPhoto.sourceDate)} • {lightboxPhoto.activityTitle} • {lightboxPhoto.fileName}
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
