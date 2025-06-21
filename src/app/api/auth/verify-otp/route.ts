import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/models/User';

export async function POST(req: NextRequest) {
  try {
    const { email, otp } = await req.json();
    if (!email || !otp) {
      return NextResponse.json({ error: 'Email and OTP are required' }, { status: 400 });
    }
    await connectDB();
    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    if (user.verified) {
      return NextResponse.json({ error: 'User already verified' }, { status: 400 });
    }
    if (!user.otp || !user.otpExpiry || user.otp !== otp || user.otpExpiry < new Date()) {
      return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 });
    }
    user.verified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return NextResponse.json({ error: 'Failed to verify OTP' }, { status: 500 });
  }
} 