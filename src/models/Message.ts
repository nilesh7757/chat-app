import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema(
  {
    roomId: { type: String, required: true },
    from: { type: String, required: true },
    text: { type: String, default: "" },
    file: {
      url: String,
      name: String,
      type: String,
      size: Number,
    },
    status: { type: String, enum: ["sent", "delivered", "seen"], default: "sent" },
    edited: { type: Boolean, default: false },
    editedAt: { type: Date },
    deleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    deletedFor: [{ type: String }], // Array of user emails who deleted this message for themselves
    deletedForAll: { type: Boolean, default: false }, // True if message is deleted for everyone
  },
  {
    timestamps: true,
  },
);

export default mongoose.models.Message || mongoose.model("Message", MessageSchema);
