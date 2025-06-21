import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import cloudinary from "@/lib/cloudinary";

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await connectDB();
    
    // Get current user
    const currentUser = await User.findOne({ email: session.user.email });
    
    if (!currentUser?.image) {
      return NextResponse.json({ error: "No profile image to delete" }, { status: 400 });
    }

    // Delete image from Cloudinary
    try {
      const urlParts = currentUser.image.split('/');
      const filenameWithExtension = urlParts[urlParts.length - 1];
      const publicId = `chat-profiles/${filenameWithExtension.split('.')[0]}`;
      
      await cloudinary.uploader.destroy(publicId);
      console.log('Deleted image from Cloudinary:', publicId);
    } catch (deleteError) {
      console.error('Error deleting from Cloudinary:', deleteError);
      // Continue with database update even if Cloudinary deletion fails
    }

    // Remove image URL from database
    await User.findOneAndUpdate(
      { email: session.user.email },
      { $unset: { image: 1 } }
    );

    return NextResponse.json({ message: "Profile photo deleted successfully" });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
} 