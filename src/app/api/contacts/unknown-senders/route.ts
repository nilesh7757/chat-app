import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/models/User';
import { Message } from '@/models/Message';

interface Contact {
  email: string;
  name: string;
  image: string | null;
  found: boolean;
}

interface UnknownSender extends Contact {
  lastMessage: string;
  lastMessageTime: Date;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const currentUser = await User.findOne({ email: session.user.email });
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Find all messages where the user is a participant
    const messages = await Message.find({
      roomId: { $regex: session.user.email }
    }).sort({ createdAt: 1 });

    // Find all other participants (senders or recipients)
    const otherEmails = new Set<string>();
    messages.forEach(msg => {
      const [email1, email2] = msg.roomId.split('+');
      if (email1 === session.user.email) {
        otherEmails.add(email2);
      } else if (email2 === session.user.email) {
        otherEmails.add(email1);
      }
    });

    // Remove self
    otherEmails.delete(session.user.email);

    // Remove contacts
    const contactEmails = currentUser.contacts?.map((contact: Contact) => contact.email) || [];
    contactEmails.forEach(email => otherEmails.delete(email));

    // For each unknown sender, get their details and last message
    const unknownSendersWithDetails: UnknownSender[] = [];
    for (const email of otherEmails) {
      const senderUser = await User.findOne({ email }).select('name email image');
      // Find the last message in this room
      const roomId = [session.user.email, email].sort().join('+');
      const lastMsg = await Message.findOne({ roomId }).sort({ createdAt: -1 });
      unknownSendersWithDetails.push({
        email,
        name: senderUser?.name || email.split('@')[0],
        image: senderUser?.image || null,
        found: !!senderUser,
        lastMessage: lastMsg?.text || '',
        lastMessageTime: lastMsg?.createdAt || new Date(0)
      });
    }

    return NextResponse.json({ unknownSenders: unknownSendersWithDetails });
  } catch (error) {
    console.error('Error fetching unknown senders:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 