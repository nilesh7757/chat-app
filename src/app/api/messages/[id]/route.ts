import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import { Message } from '@/models/Message';

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const messageId = params.id;
    await connectDB();
    const message = await Message.findById(messageId);
    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }
    if (message.from !== session.user.email) {
      return NextResponse.json({ error: 'Forbidden: Only the sender can delete this message.' }, { status: 403 });
    }
    await Message.findByIdAndDelete(messageId);
    return NextResponse.json({ success: true, message: 'Message deleted successfully.' });
  } catch (error) {
    console.error('Error deleting message:', error);
    return NextResponse.json({ error: 'Failed to delete message.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const messageId = params.id;
    await connectDB();
    const message = await Message.findById(messageId);
    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }
    if (message.from !== session.user.email) {
      return NextResponse.json({ error: 'Forbidden: Only the sender can edit this message.' }, { status: 403 });
    }
    const body = await req.json();
    if (typeof body.text !== 'string' || !body.text.trim()) {
      return NextResponse.json({ error: 'Text is required.' }, { status: 400 });
    }
    message.text = body.text.trim();
    await message.save();
    return NextResponse.json({ success: true, data: { text: message.text } });
  } catch (error) {
    console.error('Error updating message:', error);
    return NextResponse.json({ error: 'Failed to update message.' }, { status: 500 });
  }
} 