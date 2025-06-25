import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ email: string }> }
) {
  try {
    await connectDB();
    
    // Decode the email from the URL parameter
    const { email } = await params;
    const decodedEmail = decodeURIComponent(email);
    
    const user = await User.findOne({ email: decodedEmail }).select('name email image bio');
    
    if (!user) {
      return NextResponse.json({ 
        found: false, 
        email: decodedEmail,
        name: decodedEmail.split('@')[0], // Use email prefix as name
        image: null 
      });
    }
    
    return NextResponse.json({
      found: true,
      email: user.email,
      name: user.name,
      image: user.image,
      bio: user.bio
    });
    
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ email: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { email } = await params;
    const decodedEmail = decodeURIComponent(email);
    if (session.user.email !== decodedEmail) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const body = await req.json();
    const update: any = {};
    if (typeof body.name === "string" && body.name.trim().length > 0) {
      update.name = body.name.trim();
    }
    if (typeof body.bio === "string") {
      if (body.bio.length > 200) {
        return NextResponse.json({ error: "Bio too long" }, { status: 400 });
      }
      update.bio = body.bio;
    }
    const user = await User.findOneAndUpdate(
      { email: decodedEmail },
      { $set: update },
      { new: true }
    ).select('name email image bio');
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({
      found: true,
      email: user.email,
      name: user.name,
      image: user.image,
      bio: user.bio
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
} 