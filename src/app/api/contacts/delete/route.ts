import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { contactEmail } = await req.json();
    if (!contactEmail) {
      return NextResponse.json({ error: "Contact email is required" }, { status: 400 });
    }

    await connectDB();

    // Remove contact from user's contacts
    const result = await User.findOneAndUpdate(
      { email: session.user.email },
      { $pull: { contacts: { email: contactEmail } } },
      { new: true }
    );

    if (!result) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      message: "Contact deleted successfully" 
    });

  } catch (error) {
    console.error('Error deleting contact:', error);
    return NextResponse.json({ error: "Failed to delete contact" }, { status: 500 });
  }
} 