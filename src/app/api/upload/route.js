import { NextResponse } from 'next/server';
import { cloudinary } from '@/lib/cloudinary';
import { getUserFromRequest } from '@/lib/auth';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const ALLOWED_TYPES = [...IMAGE_TYPES, ...VIDEO_TYPES];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

export async function POST(request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const isImage = IMAGE_TYPES.includes(file.type);
    const isVideo = VIDEO_TYPES.includes(file.type);

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({
        error: 'نوع الملف غير مسموح به. الأنواع المسموحة: JPEG, PNG, WebP, GIF, MP4, WebM, MOV',
      }, { status: 400 });
    }

    const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
    if (file.size > maxSize) {
      return NextResponse.json({
        error: isVideo
          ? 'حجم الفيديو كبير جداً. الحد الأقصى: 50 ميجابايت'
          : 'حجم الصورة كبير جداً. الحد الأقصى: 5 ميجابايت',
      }, { status: 400 });
    }

    const fileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    if (!fileName || fileName.length === 0) {
      return NextResponse.json({ error: 'اسم الملف غير صالح' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const dataURI = `data:${file.type};base64,${buffer.toString('base64')}`;

    const result = await cloudinary.uploader.upload(dataURI, {
      folder: 'wakil/products',
      resource_type: isVideo ? 'video' : 'image',
      allowed_formats: isVideo ? ['mp4', 'webm', 'mov'] : ['jpg', 'png', 'webp', 'gif'],
    });

    return NextResponse.json({
      success: true,
      url: result.secure_url,
      type: isVideo ? 'video' : 'image',
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file', detail: error?.message || String(error) },
      { status: 500 }
    );
  }
}
