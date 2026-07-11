export async function compressImage(
  dataUrl: string,
  maxWidth = 1920,
  maxHeight = 1920,
  quality = 0.95
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = dataUrl;

    img.onload = () => {
      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      // Calculate new dimensions if image exceeds max bounds
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl); // Fallback to original
        return;
      }

      // Draw the image scaled
      ctx.drawImage(img, 0, 0, width, height);

      // Check if original is jpeg or transparent. 
      // If dataUrl already says jpeg, stick to jpeg. Otherwise webp to preserve transparency but compress better.
      const isJpeg = dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg');
      const mimeType = isJpeg ? 'image/jpeg' : 'image/webp';

      // Get compressed dataURL
      const compressedDataUrl = canvas.toDataURL(mimeType, quality);
      
      // Only use compressed if it's actually smaller (it usually is, but just in case)
      if (compressedDataUrl.length < dataUrl.length) {
        resolve(compressedDataUrl);
      } else {
        resolve(dataUrl);
      }
    };

    img.onerror = () => {
      // If error (e.g. cross origin issue on sticker), just return original
      resolve(dataUrl);
    };
  });
}
