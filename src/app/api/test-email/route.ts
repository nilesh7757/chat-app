import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Check if email configuration exists
    const emailUser = process.env.GMAIL_USER || process.env.EMAIL_USER;
    const emailPass = process.env.GMAIL_PASS || process.env.EMAIL_PASS;

    console.log('Email configuration check:', {
      hasEmailUser: !!emailUser,
      hasEmailPass: !!emailPass,
      emailUser: emailUser ? `${emailUser.substring(0, 3)}***` : 'not set',
      emailPass: emailPass ? '***' : 'not set'
    });

    if (!emailUser || !emailPass) {
      return NextResponse.json({ 
        error: 'Email configuration not found. Please set GMAIL_USER and GMAIL_PASS environment variables.',
        details: {
          GMAIL_USER: !!process.env.GMAIL_USER,
          GMAIL_PASS: !!process.env.GMAIL_PASS,
          EMAIL_USER: !!process.env.EMAIL_USER,
          EMAIL_PASS: !!process.env.EMAIL_PASS
        }
      }, { status: 500 });
    }

    // Test email transport
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    });

    // Verify the connection
    try {
      await transporter.verify();
      console.log('Email transport verified successfully');
    } catch (verifyError) {
      console.error('Email transport verification failed:', verifyError);
      return NextResponse.json({ 
        error: 'Email transport verification failed. Please check your Gmail credentials.',
        details: verifyError instanceof Error ? verifyError.message : 'Unknown error'
      }, { status: 500 });
    }

    // Send test email
    const mailOptions = {
      from: emailUser,
      to: email,
      subject: 'Email Configuration Test - ChatApp',
      text: 'This is a test email to verify that your email configuration is working correctly.',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Email Configuration Test</h2>
          <p>Hello!</p>
          <p>This is a test email to verify that your email configuration is working correctly.</p>
          <p>If you received this email, your OTP functionality should work properly.</p>
          <p>Best regards,<br>ChatApp Team</p>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Test email sent successfully:', result.messageId);

    return NextResponse.json({ 
      success: true, 
      message: 'Test email sent successfully! Check your inbox.',
      messageId: result.messageId
    });

  } catch (error) {
    console.error('Error sending test email:', error);
    
    // Provide more specific error information
    let errorMessage = 'Failed to send test email. Please check your email configuration.';
    let errorDetails = 'Unknown error';

    if (error instanceof Error) {
      errorDetails = error.message;
      
      // Check for specific Gmail errors
      if (error.message.includes('Invalid login')) {
        errorMessage = 'Invalid Gmail credentials. Please check your username and app password.';
      } else if (error.message.includes('Username and Password not accepted')) {
        errorMessage = 'Gmail authentication failed. Make sure you\'re using an app password, not your regular password.';
      } else if (error.message.includes('Less secure app access')) {
        errorMessage = 'Gmail requires app-specific password. Please generate an app password in your Google Account settings.';
      } else if (error.message.includes('2FA')) {
        errorMessage = 'Two-factor authentication is required. Please generate an app password.';
      }
    }

    return NextResponse.json({ 
      error: errorMessage,
      details: errorDetails
    }, { status: 500 });
  }
} 