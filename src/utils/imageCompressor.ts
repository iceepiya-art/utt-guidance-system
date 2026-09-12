/**
 * Client-side Image Compression Utility
 * Optimizes photos before uploading to keep Firebase Storage 100% within the Free Tier (5 GB).
 * Downscales high-resolution smartphone camera photos (5-12 MB) to ~150-300 KB
 * while preserving high legibility for official school letters and event pictures.
 */

export async function compressImageFile(
  file: File,
  maxWidth: number = 1600,
  maxHeight: number = 1600,
  quality: number = 0.8
): Promise<File> {
  // If file is not an image or is already very small (< 250 KB), return original
  if (!file.type.startsWith('image/') || file.size < 250 * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate aspect-ratio preserved dimensions
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        // Draw and apply smooth bicubic downsampling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to optimized JPEG format
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }

            // Create compressed file with original name and .jpg extension
            const cleanName = file.name.replace(/\.[^/.]+$/, '') + '.jpg';
            const compressedFile = new File([blob], cleanName, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });

            console.log(
              `[Free-Tier Optimizer] Compressed ${file.name} from ${(file.size / 1024).toFixed(1)} KB to ${(compressedFile.size / 1024).toFixed(1)} KB (-${Math.round((1 - compressedFile.size / file.size) * 100)}%)`
            );

            resolve(compressedFile);
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => {
        resolve(file);
      };
    };

    reader.onerror = () => {
      resolve(file);
    };
  });
}
