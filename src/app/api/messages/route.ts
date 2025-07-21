import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Message from "@/models/Message"

export async function POST(req: NextRequest) {
  await connectDB();
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userEmail = session.user.email;
  const body = await req.json();
  const { text, to, file } = body;
  if ((!text || typeof text !== 'string' || !text.trim()) && !file) {
    return NextResponse.json({ error: 'Message text or file required' }, { status: 400 });
  }
  if (!to || typeof to !== 'string') {
    return NextResponse.json({ error: 'Recipient (to) is required' }, { status: 400 });
  }
  // Room id logic (should match ws server)
  const roomId = [userEmail, to].sort().join('+');
  const messageData = {
    from: userEmail,
    to,
    text: text?.trim() || '',
    roomId,
    createdAt: new Date(),
    file: file || undefined,
    deletedFor: [],
    deleted: false,
    deletedForAll: false,
  };
  try {
    const message = await Message.create(messageData);
    return NextResponse.json({ success: true, message });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to save message' }, { status: 500 });
  }
} 