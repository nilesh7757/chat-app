import mongoose from "mongoose";

let isConnected = false;

export async function connectDB() {
  if (isConnected) return;
  await mongoose.connect(process.env.MONGODB_URI!, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  } as any);
  isConnected = true;
}
