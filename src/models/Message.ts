import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  roomId: { type: String, required: true },
  from: { type: String, required: true },
  text: { type: String, required: true },
}, { timestamps: true });

export const Message = mongoose.models.Message || mongoose.model("Message", messageSchema); 