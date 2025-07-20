import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  roomId: { type: String, required: true },
  from: { type: String, required: true },
  text: { type: String, required: true },
  file: {
    url: String,
    name: String,
    type: String
  },
  edited: { type: Boolean, default: false },
  editedAt: { type: Date },
  deleted: { type: Boolean, default: false },
  deletedAt: { type: Date },
}, { timestamps: true });

messageSchema.index({ roomId: 1, createdAt: 1 });

export const Message = mongoose.models.Message || mongoose.model("Message", messageSchema); 