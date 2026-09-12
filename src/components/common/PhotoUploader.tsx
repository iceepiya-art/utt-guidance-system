import React, { useRef, useState } from 'react';
import { Camera, Image as ImageIcon, X, AlertCircle, CheckCircle2, Loader2, Maximize2 } from 'lucide-react';
import { PhotoItem } from '../../types';
import { uploadImageFile } from '../../firebase/dbService';

interface PhotoUploaderProps {
  photos: PhotoItem[];
  onChange: (photos: PhotoItem[]) => void;
  folder?: 'document-submissions' | 'guidance-activities' | string;
  schoolId?: string;
  disabled?: boolean;
}

export const PhotoUploader: React.FC<PhotoUploaderProps> = ({
  photos,
  onChange,
  folder = 'document-submissions',
  schoolId = 'general',
  disabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setError(null);
    setUploading(true);
    setProgress(10);

    const newPhotos: PhotoItem[] = [...photos];
    const totalFiles = fileList.length;

    try {
      for (let i = 0; i < totalFiles; i++) {
        const file = fileList[i];
        if (!file.type.startsWith('image/')) {
          continue;
        }

        const uploaded = await uploadImageFile(file, folder, schoolId, (pct) => {
          const overallProgress = Math.round(((i + pct / 100) / totalFiles) * 100);
          setProgress(overallProgress);
        });

        newPhotos.push({
          id: `photo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          url: uploaded.url,
          fileName: uploaded.fileName,
          storagePath: uploaded.storagePath,
          uploadedAt: new Date().toISOString(),
          schoolId,
        });
      }

      onChange(newPhotos);
    } catch (err: any) {
      console.error('Upload failed:', err);
      setError('อัปโหลดรูปไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setUploading(false);
      setProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = (index: number) => {
    const updated = photos.filter((_, idx) => idx !== index);
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
        disabled={disabled || uploading}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
        disabled={disabled || uploading}
      />

      {/* Action Buttons for Mobile & Desktop */}
      <div className="flex flex-wrap gap-2.5">
        <button
          type="button"
          id="btn-take-photo"
          onClick={() => cameraInputRef.current?.click()}
          disabled={disabled || uploading}
          className="flex-1 min-w-[130px] inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#087CC1] hover:bg-[#075A9C] text-white text-sm font-medium rounded-xl shadow-xs transition-colors disabled:opacity-50"
        >
          <Camera className="w-4 h-4" />
          <span>ถ่ายรูป</span>
        </button>

        <button
          type="button"
          id="btn-browse-photo"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
          className="flex-1 min-w-[130px] inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-sm font-medium rounded-xl shadow-xs transition-colors disabled:opacity-50"
        >
          <ImageIcon className="w-4 h-4 text-slate-500" />
          <span>เลือกรูปจากเครื่อง</span>
        </button>
      </div>

      {/* Uploading progress indicator */}
      {uploading && (
        <div className="p-3 bg-[#EAF6FD] border border-[#087CC1]/20 rounded-xl space-y-1.5 animate-pulse">
          <div className="flex items-center justify-between text-xs text-[#075A9C] font-medium">
            <span className="flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              กำลังอัปโหลดรูปภาพ...
            </span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-blue-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-[#087CC1] h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between text-xs text-red-700">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="underline font-medium text-red-800 hover:text-red-900"
          >
            ลองอีกครั้ง
          </button>
        </div>
      )}

      {/* Thumbnails Grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5 pt-1">
          {photos.map((item, index) => (
            <div
              key={item.id || index}
              className="group relative aspect-square rounded-lg border border-slate-200 overflow-hidden bg-slate-100 shadow-2xs"
            >
              <img
                src={item.url}
                alt={item.fileName || `ภาพที่ ${index + 1}`}
                className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
              />

              {/* Action overlays */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  type="button"
                  title="ดูภาพขยาย"
                  onClick={() => setLightboxIndex(index)}
                  className="p-1.5 bg-white/90 text-slate-800 rounded-full hover:bg-white"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
                {!disabled && (
                  <button
                    type="button"
                    title="ลบรูปภาพ"
                    onClick={() => handleRemovePhoto(index)}
                    className="p-1.5 bg-red-500/90 text-white rounded-full hover:bg-red-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Mobile delete button always visible */}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemovePhoto(index)}
                  className="sm:hidden absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxIndex !== null && photos[lightboxIndex] && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setLightboxIndex(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setLightboxIndex(null)}
              className="absolute -top-10 right-0 p-2 text-white hover:text-slate-300"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={photos[lightboxIndex].url}
              alt="ภาพขยาย"
              className="max-h-[80vh] w-auto max-w-full object-contain rounded-lg shadow-2xl"
            />
            <p className="text-white text-xs mt-3 opacity-80">
              {photos[lightboxIndex].fileName} ({lightboxIndex + 1} จาก {photos.length})
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
