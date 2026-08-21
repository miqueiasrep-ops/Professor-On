/**
 * Utilities for file processing and compression in browser
 */

export async function processAndCompressFile(file: File): Promise<{ base64: string; sizeFormatted: string; originalSize: number }> {
  // If it's an image, compress it with Canvas
  if (file.type.startsWith('image/')) {
    try {
      const compressedBase64 = await compressImageFile(file, 1600, 0.8);
      const approxBytes = Math.round((compressedBase64.length * 3) / 4);
      return {
        base64: compressedBase64,
        sizeFormatted: `${(approxBytes / (1024 * 1024)).toFixed(2)} MB`,
        originalSize: file.size
      };
    } catch (e) {
      console.warn('Image compression fallback to standard reader:', e);
    }
  }

  // For PDFs and other files, convert directly to Base64
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        const base64 = e.target.result as string;
        resolve({
          base64,
          sizeFormatted: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
          originalSize: file.size
        });
      } else {
        reject(new Error('Failed to read file'));
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

function compressImageFile(file: File, maxDimension = 1600, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(readerEvent.target?.result as string);
          return;
        }

        // Draw image onto canvas
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Export as JPEG with good quality
        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed);
      };
      img.onerror = () => reject(new Error('Image decode error'));
      img.src = readerEvent.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}
