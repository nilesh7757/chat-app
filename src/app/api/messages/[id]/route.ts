import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Message } from "@/models/Message";

export const runtime = "nodejs"; // Ensure nodejs runtime on Vercel

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("DELETE handler started");
    await connectDB();

    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      console.log("Unauthorized access");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userEmail = session.user.email;
    const messageId = params?.id;

    if (!messageId) {
      return NextResponse.json({ error: "Missing message ID" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const deleteForEveryone = searchParams.get("everyone") === "true";

    const message = await Message.findById(messageId);
    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    if (deleteForEveryone) {
      if (message.from !== userEmail) {
        return NextResponse.json({ error: "Forbidden: Only sender can delete for everyone" }, { status: 403 });
      }
      message.deletedForAll = true;
      message.deleted = true;
      message.deletedAt = new Date();
      await message.save();
      return NextResponse.json({ success: true, deletedForAll: true, deletedAt: message.deletedAt });
    } else {
      if (!message.deletedFor.includes(userEmail)) {
        message.deletedFor.push(userEmail);

        let participants: string[] = [];
        if (message.roomId && typeof message.roomId === "string") {
          participants = Array.from(new Set(message.roomId.split("--").filter(Boolean)));
        }

        if (
          participants.length === 2 &&
          message.deletedFor.length >= 2 &&
          participants.every((p) => message.deletedFor.includes(p))
        ) {
          await message.deleteOne();
          return NextResponse.json({ success: true, deleted: true, deletedFor: message.deletedFor, removed: true });
        } else {
          await message.save();
        }
      }

      return NextResponse.json({
        success: true,
        deletedForMe: true,
        deletedAt: message.deletedAt,
        deletedFor: message.deletedFor,
      });
    }
  } catch (error) {
    console.error("DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("PATCH handler started");
    await connectDB();

    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      console.log("Unauthorized access");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userEmail = session.user.email;
    const messageId = params?.id;
    if (!messageId) {
      return NextResponse.json({ error: "Missing message ID" }, { status: 400 });
    }

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
  } catch (error) {
    console.error("PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
