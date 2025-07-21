import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Message from '@/models/Message';

export async function DELETE(req: NextRequest) {
  await connectDB();
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userEmail = session.user.email;
  const { searchParams } = new URL(req.url);
  const withEmail = searchParams.get('with');
  if (!withEmail) {
    return NextResponse.json({ error: 'Missing target email' }, { status: 400 });
  }
  // Room id logic (should match ws server)
  const roomId = [userEmail, withEmail].sort().join('+');
  // Find all messages in this room
  const messages = await Message.find({ roomId });
  let updatedCount = 0;
  for (const msg of messages) {
    if (!msg.deletedFor.includes(userEmail)) {
      msg.deletedFor.push(userEmail);
      await msg.save();
      updatedCount++;
    }
  }
  return NextResponse.json({ success: true, updated: updatedCount });
} 