import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";

export async function POST(req: NextRequest) {
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

    // Get the current user
    const currentUser = await User.findOne({ email: session.user.email });
    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get the contact user details
    const contactUser = await User.findOne({ email: contactEmail }).select('name email image');
    
    // Prepare contact data
    const contactData = {
      email: contactEmail,
      name: contactUser?.name || contactEmail.split('@')[0],
      image: contactUser?.image || null,
      found: !!contactUser
    };

    // Initialize contacts array if it doesn't exist
    if (!currentUser.contacts) {
      currentUser.contacts = [];
    }

    // Check if contact already exists
    const contactExists = currentUser.contacts.some(
      (contact: any) => contact.email === contactEmail
    );

    if (!contactExists) {
      currentUser.contacts.push(contactData);
      await currentUser.save();
    }

    return NextResponse.json({ 
      success: true, 
      contact: contactData,
      added: !contactExists 
    });

  } catch (error) {
    console.error('Error adding contact:', error);
    return NextResponse.json({ error: "Failed to add contact" }, { status: 500 });
  }
} 