import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/models/User';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    console.log('📧 Sending OTP to:', email);

    await connectDB();
    const user = await User.findOne({ email });
    if (!user) {
      console.log('❌ User not found:', email);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    console.log('🔐 Generated OTP:', otp, 'for user:', email);
    
    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save();

    // Check email configuration
    const emailUser = process.env.EMAIL_USER || process.env.GMAIL_USER;
    const emailPass = process.env.EMAIL_PASS || process.env.GMAIL_PASS;

    if (!emailUser || !emailPass) {
      console.error('❌ Email configuration missing. Please set EMAIL_USER/EMAIL_PASS or GMAIL_USER/GMAIL_PASS');
      return NextResponse.json({ 
        error: 'Email service not configured. Please contact administrator.' 
      }, { status: 500 });
    }

    // Send OTP via email
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    });

    const mailOptions = {
      from: emailUser,
      to: email,
      subject: 'Your OTP for Email Verification',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb; text-align: center;">Email Verification</h2>
          <p>Hello ${user.name || email},</p>
          <p>Your verification code is:</p>
          <div style="background-color: #f3f4f6; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <h1 style="color: #1f2937; font-size: 32px; letter-spacing: 8px; margin: 0;">${otp}</h1>
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request this code, please ignore this email.</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; text-align: center;">
            This is an automated message, please do not reply.
          </p>
        </div>
      `,
      text: `Your OTP is: ${otp}. This code will expire in 10 minutes.`,
    };

    await transporter.sendMail(mailOptions);
    console.log('✅ OTP sent successfully to:', email);
    
    return NextResponse.json({ success: true, message: 'OTP sent successfully' });
  } catch (error) {
    console.error('❌ Error sending OTP:', error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('Invalid login')) {
        return NextResponse.json({ 
          error: 'Email service authentication failed. Please check email configuration.' 
        }, { status: 500 });
      }
      if (error.message.includes('Invalid recipient')) {
        return NextResponse.json({ 
          error: 'Invalid email address' 
        }, { status: 400 });
      }
    }
    
    return NextResponse.json({ 
      error: 'Failed to send OTP. Please try again later.' 
    }, { status: 500 });
  }
} 