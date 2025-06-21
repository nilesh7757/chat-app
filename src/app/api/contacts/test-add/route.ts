import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";

interface Contact {
  email: string;
  name: string;
  image?: string | null;
  found: boolean;
}

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

    // Get contact user details
    const contactUser = await User.findOne({ email: contactEmail }).select('name email image');
    
    // Prepare contact data
    const contactData: Contact = {
      email: contactEmail,
      name: contactUser?.name || contactEmail.split('@')[0],
      image: contactUser?.image || null,
      found: !!contactUser
    };

    // Get current user
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Initialize contacts array if it doesn't exist
    if (!user.contacts) {
      user.contacts = [];
      await user.save();
    }

    // Check if contact already exists
    const contactExists = user.contacts.some((contact: Contact) => contact.email === contactEmail);
    if (contactExists) {
      return NextResponse.json({ 
        success: false, 
        message: "Contact already exists" 
      });
    }

    // Add contact
    const result = await User.findOneAndUpdate(
      { email: session.user.email },
      { $push: { contacts: contactData } },
      { new: true }
    );

    if (result) {
      return NextResponse.json({ 
        success: true, 
        message: "Contact added successfully",
        contact: contactData
      });
    } else {
      return NextResponse.json({ error: "Failed to add contact" }, { status: 500 });
    }

  } catch (error) {
    console.error('Error adding contact:', error);
    return NextResponse.json({ error: "Failed to add contact" }, { status: 500 });
  }
} 