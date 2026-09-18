/**
 * Client-side Image Compression Utility
 * Optimizes photos before uploading to keep Firebase Storage 100% within the Free Tier (5 GB).
 * Downscales high-resolution smartphone camera photos (5-12 MB) to ~60-150 KB
 * while preserving high legibility for official school letters and event pictures.
 */

export function fileToDataUrl(file: Blob | File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

export async function compressImageFile(
  file: File,
  maxWidth: number = 1280,
  maxHeight: number = 1280,
  quality: number = 0.75
): Promise<File> {
  // If file is not an image, return original
  if (!file.type.startsWith('image/')) {
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

        // Fill white background for transparent PNGs before converting to JPEG
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);

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
              `[Image Optimizer] Processed ${file.name} (${(file.size / 1024).toFixed(1)} KB -> ${(compressedFile.size / 1024).toFixed(1)} KB)`
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

