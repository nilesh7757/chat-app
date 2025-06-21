import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";

export async function GET(
  req: NextRequest,
  { params }: { params: { email: string } }
) {
  try {
    await connectDB();
    
    // Decode the email from the URL parameter
    const email = decodeURIComponent(params.email);
    
    const user = await User.findOne({ email }).select('name email image');
    
    if (!user) {
      return NextResponse.json({ 
        found: false, 
        email: email,
        name: email.split('@')[0], // Use email prefix as name
        image: null 
      });
    }
    
    return NextResponse.json({
      found: true,
      email: user.email,
      name: user.name,
      image: user.image
    });
    
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
} 