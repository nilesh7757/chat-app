import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import { Message } from "@/models/Message"

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  await connectDB();
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userEmail = session.user.email;
  const messageId = params.id;

  // Check for "everyone" param (delete for everyone)
  const { searchParams } = new URL(req.url);
  const deleteForEveryone = searchParams.get("everyone") === "true";

  const message = await Message.findById(messageId);
  if (!message) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  if (deleteForEveryone) {
    // Only sender can delete for everyone
    if (message.from !== userEmail) {
      return NextResponse.json({ error: "Forbidden: Only sender can delete for everyone" }, { status: 403 });
    }
    message.deletedForAll = true;
    message.deleted = true;
    message.deletedAt = new Date();
    await message.save();
    return NextResponse.json({ success: true, deletedForAll: true, deletedAt: message.deletedAt });
  } else {
    // Delete for self: add user to deletedFor array
    if (!message.deletedFor.includes(userEmail)) {
      message.deletedFor.push(userEmail);
      // If both users have deleted, remove from DB
      // Assume roomId is a combination of both emails, so get both participants
      // We'll infer the other participant from roomId and message.from
      let participants = [];
      if (message.roomId && typeof message.roomId === 'string') {
        if (message.roomId.includes('--')) {
          participants = message.roomId.split('--');
        } else if (message.roomId.includes('+')) {
          participants = message.roomId.split('+');
        } else {
          participants = [message.from];
        }
      }
      // Remove empty strings and duplicates
      participants = Array.from(new Set(participants.filter(Boolean)));
      // If both participants have deleted, remove from DB
      if (participants.length === 2 && message.deletedFor.length >= 2 &&
        participants.every((p) => message.deletedFor.includes(p))) {
        await message.deleteOne();
        return NextResponse.json({ success: true, deleted: true, deletedFor: message.deletedFor, removed: true });
      } else {
        await message.save();
      }
    }
    return NextResponse.json({ success: true, deletedForMe: true, deletedAt: message.deletedAt, deletedFor: message.deletedFor });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  await connectDB();
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userEmail = session.user.email;
  const messageId = params.id;
  const body = await req.json();
  const { text } = body;
  if (typeof text !== "string" || !text.trim()) {
    return NextResponse.json({ error: "Invalid text" }, { status: 400 });
  }
  const message = await Message.findById(messageId);
  if (!message) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }
  if (message.from !== userEmail) {
    return NextResponse.json({ error: "Forbidden: Only sender can edit" }, { status: 403 });
  }
  message.text = text;
  message.edited = true;
  message.editedAt = new Date();
  await message.save();
  return NextResponse.json({ success: true, edited: true, message });
}
