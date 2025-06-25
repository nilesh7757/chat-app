import mongoose from "mongoose";

const contactSchema = new mongoose.Schema({
  email: { type: String, required: true },
  name: { type: String, required: true },
  image: String,
  found: { type: Boolean, default: false }
});

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  image: String, // profile picture
  contacts: [contactSchema], // user's contact list
  verified: { type: Boolean, default: false },
  otp: String,
  otpExpiry: Date,
  bio: { type: String, maxlength: 200 },
  isOnline: { type: Boolean, default: false }, // online status
  lastSeen: { type: Date }, // last seen timestamp
}, { timestamps: true });

export const User = mongoose.models.User || mongoose.model("User", userSchema);
