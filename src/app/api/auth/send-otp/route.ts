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

    // Check email configuration with multiple fallback options
    const emailUser = process.env.EMAIL_USER || process.env.GMAIL_USER;
    const emailPass = process.env.EMAIL_PASS || process.env.GMAIL_PASS;

    if (!emailUser || !emailPass) {
      console.error('❌ Email configuration missing');
      console.error('Available env vars:', {
        EMAIL_USER: !!process.env.EMAIL_USER,
        EMAIL_PASS: !!process.env.EMAIL_PASS,
        GMAIL_USER: !!process.env.GMAIL_USER,
        GMAIL_PASS: !!process.env.GMAIL_PASS,
      });
      return NextResponse.json({ 
        error: 'Email service not configured. Please contact administrator.',
        debug: {
          hasEmailUser: !!process.env.EMAIL_USER,
          hasEmailPass: !!process.env.EMAIL_PASS,
          hasGmailUser: !!process.env.GMAIL_USER,
          hasGmailPass: !!process.env.GMAIL_PASS,
        }
      }, { status: 500 });
    }

    console.log('📧 Email config check:', {
      emailUser: emailUser ? `${emailUser.substring(0, 3)}***` : 'not set',
      hasPassword: !!emailPass,
    });

    // Create transporter with better error handling
    let transporter;
    try {
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: emailUser,
          pass: emailPass,
        },
        // Add these options for better reliability
        pool: true,
        maxConnections: 1,
        rateDelta: 20000,
        rateLimit: 5,
      });

      // Verify the connection before sending
      await transporter.verify();
      console.log('✅ Email transporter verified successfully');
    } catch (verifyError) {
      console.error('❌ Email transporter verification failed:', verifyError);
      
      // Provide specific error messages based on the error
      let errorMessage = 'Email service configuration error.';
      if (verifyError instanceof Error) {
        if (verifyError.message.includes('Invalid login')) {
          errorMessage = 'Invalid Gmail credentials. Please check your email and app password.';
        } else if (verifyError.message.includes('Username and Password not accepted')) {
          errorMessage = 'Gmail authentication failed. Make sure you are using an app password, not your regular password.';
        } else if (verifyError.message.includes('Less secure app')) {
          errorMessage = 'Please enable 2FA and use an app-specific password for Gmail.';
        }
      }
      
      return NextResponse.json({ 
        error: errorMessage,
        details: verifyError instanceof Error ? verifyError.message : 'Unknown verification error'
      }, { status: 500 });
    }

    const mailOptions = {
      from: `"ChatApp" <${emailUser}>`,
      to: email,
      subject: 'Your OTP for Email Verification - ChatApp',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
          <div style="background-color: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #3b82f6, #1d4ed8); border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px;">
                <span style="color: white; font-size: 24px;">💬</span>
              </div>
              <h1 style="color: #1f2937; margin: 0; font-size: 28px; font-weight: bold;">Email Verification</h1>
            </div>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              Hello <strong>${user.name || email}</strong>,
            </p>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
              Please use the following verification code to complete your email verification:
            </p>
            
            <div style="background: linear-gradient(135deg, #eff6ff, #dbeafe); padding: 30px; text-align: center; border-radius: 12px; margin: 30px 0; border: 2px solid #3b82f6;">
              <div style="color: #1e40af; font-size: 42px; font-weight: bold; letter-spacing: 8px; font-family: 'Courier New', monospace; margin: 0;">
                ${otp}
              </div>
              <p style="color: #3730a3; font-size: 14px; margin: 10px 0 0 0; font-weight: 500;">
                Verification Code
              </p>
            </div>
            
            <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <p style="color: #92400e; font-size: 14px; margin: 0; font-weight: 500;">
                ⚠️ This code will expire in 10 minutes for security reasons.
              </p>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
              If you didn't request this verification code, please ignore this email. Your account remains secure.
            </p>
            
            <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
              <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
                This is an automated message from ChatApp. Please do not reply to this email.
              </p>
            </div>
          </div>
        </div>
      `,
      text: `
        ChatApp - Email Verification
        
        Hello ${user.name || email},
        
        Your verification code is: ${otp}
        
        This code will expire in 10 minutes.
        
        If you didn't request this code, please ignore this email.
        
        Best regards,
        ChatApp Team
      `,
    };

    try {
      const result = await transporter.sendMail(mailOptions);
      console.log('✅ OTP sent successfully to:', email, 'MessageID:', result.messageId);
      
      // Close the transporter
      transporter.close();
      
      return NextResponse.json({ 
        success: true, 
        message: 'OTP sent successfully',
        messageId: result.messageId 
      });
    } catch (sendError) {
      console.error('❌ Error sending email:', sendError);
      
      // Close the transporter even on error
      if (transporter) {
        transporter.close();
      }
      
      // Provide specific error messages
      let errorMessage = 'Failed to send OTP. Please try again later.';
      if (sendError instanceof Error) {
        if (sendError.message.includes('Invalid recipient')) {
          errorMessage = 'Invalid email address. Please check and try again.';
        } else if (sendError.message.includes('Daily sending quota exceeded')) {
          errorMessage = 'Email sending limit reached. Please try again later.';
        } else if (sendError.message.includes('Authentication failed')) {
          errorMessage = 'Email service authentication failed. Please contact support.';
        }
      }
      
      return NextResponse.json({ 
        error: errorMessage,
        details: sendError instanceof Error ? sendError.message : 'Unknown sending error'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('❌ Unexpected error in send-otp:', error);
    return NextResponse.json({ 
      error: 'An unexpected error occurred. Please try again later.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}