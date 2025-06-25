import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Check if email configuration exists with multiple fallback options
    const emailUser = process.env.EMAIL_USER || process.env.GMAIL_USER;
    const emailPass = process.env.EMAIL_PASS || process.env.GMAIL_PASS;

    console.log('Email configuration check:', {
      hasEmailUser: !!emailUser,
      hasEmailPass: !!emailPass,
      emailUser: emailUser ? `${emailUser.substring(0, 3)}***` : 'not set',
      environment: process.env.NODE_ENV || 'development',
    });

    if (!emailUser || !emailPass) {
      return NextResponse.json({ 
        error: 'Email configuration not found. Please set EMAIL_USER and EMAIL_PASS (or GMAIL_USER and GMAIL_PASS) environment variables.',
        details: {
          EMAIL_USER: !!process.env.EMAIL_USER,
          EMAIL_PASS: !!process.env.EMAIL_PASS,
          GMAIL_USER: !!process.env.GMAIL_USER,
          GMAIL_PASS: !!process.env.GMAIL_PASS,
          NODE_ENV: process.env.NODE_ENV,
        }
      }, { status: 500 });
    }

    // Test email transport with enhanced configuration
    let transporter;
    try {
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: emailUser,
          pass: emailPass,
        },
        // Enhanced configuration for better reliability
        pool: true,
        maxConnections: 1,
        rateDelta: 20000,
        rateLimit: 5,
        // Additional options for deployment environments
        secure: true,
        requireTLS: true,
        tls: {
          rejectUnauthorized: false
        }
      });

      // Verify the connection
      await transporter.verify();
      console.log('✅ Email transport verified successfully');
    } catch (verifyError) {
      console.error('❌ Email transport verification failed:', verifyError);
      
      let errorMessage = 'Email transport verification failed.';
      let troubleshooting: string[] = [];
      
      if (verifyError instanceof Error) {
        if (verifyError.message.includes('Invalid login')) {
          errorMessage = 'Invalid Gmail credentials.';
          troubleshooting = [
            'Make sure you are using the correct Gmail address',
            'Use an App Password instead of your regular password',
            'Enable 2-Factor Authentication on your Google account',
            'Generate a new App Password from Google Account settings'
          ];
        } else if (verifyError.message.includes('Username and Password not accepted')) {
          errorMessage = 'Gmail authentication failed.';
          troubleshooting = [
            'You must use an App Password, not your regular Gmail password',
            'Go to Google Account > Security > 2-Step Verification > App passwords',
            'Generate a new App Password for "Mail"',
            'Use the 16-character App Password in your environment variables'
          ];
        } else if (verifyError.message.includes('Less secure app')) {
          errorMessage = 'Gmail security settings prevent access.';
          troubleshooting = [
            'Enable 2-Factor Authentication',
            'Generate an App Password',
            'Do not use "Less secure app access" (deprecated)'
          ];
        }
      }
      
      return NextResponse.json({ 
        error: errorMessage,
        details: verifyError instanceof Error ? verifyError.message : 'Unknown error',
        troubleshooting,
        configCheck: {
          hasUser: !!emailUser,
          hasPass: !!emailPass,
          userPrefix: emailUser ? emailUser.substring(0, 3) + '***' : 'none'
        }
      }, { status: 500 });
    }

    // Send test email with enhanced template
    const mailOptions = {
      from: `"ChatApp Test" <${emailUser}>`,
      to: email,
      subject: 'Email Configuration Test - ChatApp ✅',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f0f9ff;">
          <div style="background-color: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #10b981, #059669); border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px;">
                <span style="color: white; font-size: 24px;">✅</span>
              </div>
              <h1 style="color: #1f2937; margin: 0; font-size: 28px; font-weight: bold;">Email Configuration Test</h1>
            </div>
            
            <div style="background: linear-gradient(135deg, #ecfdf5, #d1fae5); padding: 20px; border-radius: 8px; border: 2px solid #10b981; margin: 20px 0;">
              <p style="color: #065f46; font-size: 18px; font-weight: bold; margin: 0; text-align: center;">
                🎉 Success! Your email configuration is working correctly.
              </p>
            </div>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              Hello!
            </p>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              This is a test email to verify that your ChatApp email configuration is working correctly. 
              If you received this email, your OTP functionality should work properly.
            </p>
            
            <div style="background-color: #eff6ff; border: 1px solid #3b82f6; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <h3 style="color: #1e40af; margin: 0 0 10px 0; font-size: 16px;">Configuration Details:</h3>
              <ul style="color: #1e40af; margin: 0; padding-left: 20px;">
                <li>Email service: Gmail</li>
                <li>Sender: ${emailUser}</li>
                <li>Status: ✅ Working</li>
                <li>Timestamp: ${new Date().toISOString()}</li>
              </ul>
            </div>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              You can now use the OTP verification feature in your ChatApp with confidence.
            </p>
            
            <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
              <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
                This is an automated test message from ChatApp. You can safely ignore this email.
              </p>
            </div>
          </div>
        </div>
      `,
      text: `
        ChatApp - Email Configuration Test
        
        SUCCESS! Your email configuration is working correctly.
        
        Configuration Details:
        - Email service: Gmail
        - Sender: ${emailUser}
        - Status: Working
        - Timestamp: ${new Date().toISOString()}
        
        You can now use the OTP verification feature in your ChatApp.
        
        This is an automated test message. You can safely ignore this email.
      `
    };

    try {
      const result = await transporter.sendMail(mailOptions);
      console.log('✅ Test email sent successfully:', result.messageId);

      // Close the transporter
      transporter.close();

      return NextResponse.json({ 
        success: true, 
        message: 'Test email sent successfully! Check your inbox.',
        messageId: result.messageId,
        timestamp: new Date().toISOString(),
        sender: emailUser
      });
    } catch (sendError) {
      console.error('❌ Error sending test email:', sendError);
      
      // Close the transporter even on error
      if (transporter) {
        transporter.close();
      }
      
      let errorMessage = 'Failed to send test email.';
      let troubleshooting: string[] = [];

      if (sendError instanceof Error) {
        if (sendError.message.includes('Invalid recipient')) {
          errorMessage = 'Invalid email address provided.';
          troubleshooting = ['Please check the email address and try again'];
        } else if (sendError.message.includes('Daily sending quota exceeded')) {
          errorMessage = 'Gmail daily sending limit exceeded.';
          troubleshooting = [
            'Gmail has daily sending limits',
            'Try again in 24 hours',
            'Consider using a different Gmail account'
          ];
        } else if (sendError.message.includes('Authentication failed')) {
          errorMessage = 'Gmail authentication failed during sending.';
          troubleshooting = [
            'Your App Password may have expired',
            'Generate a new App Password',
            'Check your Google Account security settings'
          ];
        }
      }

      return NextResponse.json({ 
        error: errorMessage,
        details: sendError instanceof Error ? sendError.message : 'Unknown error',
        troubleshooting
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Unexpected error in test-email:', error);
    return NextResponse.json({ 
      error: 'An unexpected error occurred during email testing.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}