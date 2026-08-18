/**
 * Image Optimization & Compression Utility
 * Resizes and compresses image files (JPEG, PNG, WebP, GIF) using HTML5 Canvas
 * to ensure images stay within safe size boundaries (~30KB-120KB) for Firestore documents
 * and fast network rendering.
 */

export interface OptimizeOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'image/jpeg' | 'image/webp' | 'image/png';
}

/**
 * Optimizes an image File, Blob, or base64 Data URL and returns a compressed Data URL
 */
export async function optimizeImage(
  input: File | Blob | string,
  options: OptimizeOptions = {}
): Promise<string> {
  const {
    maxWidth = 800,
    maxHeight = 800,
    quality = 0.82,
    format = 'image/jpeg'
  } = options;

  return new Promise((resolve, reject) => {
    // If input is already a string (data URL or http URL)
    if (typeof input === 'string') {
      if (input.startsWith('http://') || input.startsWith('https://')) {
        // External URLs don't need recompression
        return resolve(input);
      }
      // If it's a data URL, load it into an image
      const img = new Image();
      img.onload = () => {
        try {
          const compressed = processImageElement(img, maxWidth, maxHeight, quality, format);
          resolve(compressed);
        } catch (err) {
          console.warn("[optimizeImage] Canvas compression failed, returning original string", err);
          resolve(input);
        }
      };
      img.onerror = () => {
        console.warn("[optimizeImage] Image loading error, returning original string");
        resolve(input);
      };
      img.src = input;
      return;
    }

    // If input is a File or Blob
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (!result) {
        return resolve('');
      }

      const img = new Image();
      img.onload = () => {
        try {
          const compressed = processImageElement(img, maxWidth, maxHeight, quality, format);
          resolve(compressed);
        } catch (err) {
          console.warn("[optimizeImage] Canvas processing failed, falling back to data URL", err);
          resolve(result);
        }
      };
      img.onerror = () => {
        console.warn("[optimizeImage] Image object failed loading, falling back to data URL");
        resolve(result);
      };
      img.src = result;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(input);
  });
}

function processImageElement(
  img: HTMLImageElement,
  maxWidth: number,
  maxHeight: number,
  quality: number,
  format: string
): string {
  let width = img.width || 800;
  let height = img.height || 800;

  // Calculate proportional dimensions
  if (width > maxWidth || height > maxHeight) {
    if (width / height > maxWidth / maxHeight) {
      height = Math.round((height * maxWidth) / width);
      width = maxWidth;
    } else {
      width = Math.round((width * maxHeight) / height);
      height = maxHeight;
    }
  }

  // Ensure minimum dimensions
  width = Math.max(1, width);
  height = Math.max(1, height);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d', { alpha: format === 'image/png' });
  if (!ctx) {
    throw new Error('Canvas 2D context is not supported in this browser.');
  }

  // If JPEG, fill white background for transparent PNG inputs
  if (format === 'image/jpeg') {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, width, height);

  return canvas.toDataURL(format, quality);
}
