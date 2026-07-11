export async function uploadToCloudinary(dataUrl: string): Promise<string> {
  // If it's already a URL or not a base64 image (like an SVG string), skip
  if (!dataUrl.startsWith('data:image/') || dataUrl.includes('image/svg+xml')) {
    return dataUrl;
  }

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error('Thiếu cấu hình Cloudinary Cloud Name hoặc Upload Preset trong biến môi trường!');
  }

  const formData = new FormData();
  formData.append('file', dataUrl);
  formData.append('upload_preset', uploadPreset);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: formData
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error('Cloudinary upload error:', errorText);
    throw new Error('Lỗi upload ảnh lên Cloudinary');
  }

  const data = await res.json();
  if (!data.secure_url) {
    throw new Error('Không nhận được URL từ Cloudinary');
  }

  return data.secure_url;
}
