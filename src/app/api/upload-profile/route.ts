import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import cloudinary from "@/lib/cloudinary";
import { Readable } from "stream";

interface CloudinaryResult {
  secure_url: string;
  public_id: string;
  format: string;
  width: number;
  height: number;
  resource_type: string;
  created_at: string;
  bytes: number;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  try {
    // Connect to database first
    await connectDB();
    
    // Get current user to check if they have an existing image
    const currentUser = await User.findOne({ email: session.user.email });
    
    // If user has an existing image, delete it from Cloudinary
    if (currentUser?.image) {
      try {
        // Extract public_id from the image URL
        const urlParts = currentUser.image.split('/');
        const filenameWithExtension = urlParts[urlParts.length - 1];
        const publicId = `chat-profiles/${filenameWithExtension.split('.')[0]}`;
        
        // Delete the old image from Cloudinary
        await cloudinary.uploader.destroy(publicId);
        console.log('Deleted old image:', publicId);
      } catch (deleteError) {
        console.error('Error deleting old image:', deleteError);
        // Continue with upload even if deletion fails
      }
    }

    // Upload new image
    const buffer = Buffer.from(await file.arrayBuffer());

    const result: CloudinaryResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: "chat-profiles", resource_type: "image" },
        (err, result) => {
          if (err) reject(err);
          else resolve(result as CloudinaryResult);
        }
      );
      Readable.from(buffer).pipe(uploadStream);
    });

    // Update user with new image URL
    await User.findOneAndUpdate(
      { email: session.user.email }, 
      { image: result.secure_url }
    );

    return NextResponse.json({ image: result.secure_url });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
