import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import { Message } from '@/models/Message';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await connectDB();
    const email = session.user.email;
    // Pagination
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const skip = (page - 1) * limit;
    const messages = await Message.find({ roomId: { $regex: email } })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit);
    const total = await Message.countDocuments({ roomId: { $regex: email } });
    // Filter out messages deleted for all or for this user
    const filteredMessages = messages.filter((m: any) => {
      if (m.deletedForAll || m.deleted) return false;
      if (Array.isArray(m.deletedFor) && m.deletedFor.includes(email)) return false;
      return true;
    });
    // Map messages to include only relevant fields, especially deletedFor
    const mappedMessages = filteredMessages.map((m: any) => ({
      _id: m._id,
      from: m.from,
      text: m.text,
      file: m.file,
      createdAt: m.createdAt,
      status: m.status,
      edited: m.edited,
      editedAt: m.editedAt,
      deleted: m.deleted,
      deletedAt: m.deletedAt,
      deletedFor: m.deletedFor
    }));
    return NextResponse.json({ messages: mappedMessages, page, limit, total });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 