import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  format: string;
  width: number;
  height: number;
  resource_type: string;
  created_at: string;
  bytes: number;
}

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File size must be less than 10MB' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain', 'text/csv',
      // Add more document types
      'application/vnd.oasis.opendocument.text', // .odt
      'application/vnd.oasis.opendocument.spreadsheet', // .ods
      'application/rtf', // .rtf
      'application/x-zip-compressed', 'application/zip',
      'application/vnd.rar',
      'application/octet-stream' // fallback for some docs
    ];
    
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'File type not supported. Please upload images, PDFs, documents, or text files.' 
      }, { status: 400 });
    }

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Determine resource type based on file type
    const resourceType = file.type.startsWith('image/') ? 'image' : 'raw';

    // Upload to Cloudinary
    const uploadRes = await new Promise<CloudinaryUploadResult>((resolve, reject) => {
      cloudinary.uploader.upload_stream({ 
        resource_type: resourceType,
        folder: 'chat-files'
      }, (err, result) => {
        if (err) reject(err);
        else resolve(result as CloudinaryUploadResult);
      }).end(buffer);
    });

    return NextResponse.json({ 
      url: uploadRes.secure_url,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size
    });
  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json({ error: 'File upload failed' }, { status: 500 });
  }
} 