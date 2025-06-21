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
    const messages = await Message.find({ roomId: { $regex: email } }).sort({ createdAt: 1 });
    return NextResponse.json({ messages });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 