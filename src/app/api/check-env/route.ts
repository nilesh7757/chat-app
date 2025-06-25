import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const envCheck = {
      // Email configuration (multiple options)
      GMAIL_USER: !!process.env.GMAIL_USER,
      GMAIL_PASS: !!process.env.GMAIL_PASS,
      EMAIL_USER: !!process.env.EMAIL_USER,
      EMAIL_PASS: !!process.env.EMAIL_PASS,
      
      // NextAuth configuration
      NEXTAUTH_URL: !!process.env.NEXTAUTH_URL,
      NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
      
      // MongoDB configuration
      MONGODB_URI: !!process.env.MONGODB_URI,
      
      // Google OAuth (optional)
      GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
      
      // Cloudinary (optional)
      NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: !!process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
      CLOUDINARY_API_KEY: !!process.env.CLOUDINARY_API_KEY,
      CLOUDINARY_API_SECRET: !!process.env.CLOUDINARY_API_SECRET,
      
      // WebSocket (optional)
      NEXT_PUBLIC_WS_URL: !!process.env.NEXT_PUBLIC_WS_URL,
      
      // Environment info
      NODE_ENV: process.env.NODE_ENV || 'development',
      VERCEL: !!process.env.VERCEL,
      VERCEL_ENV: process.env.VERCEL_ENV || 'none',
    };

    // Check email configuration with multiple fallback options
    const emailConfigured = envCheck.GMAIL_USER && envCheck.GMAIL_PASS;
    const emailConfiguredAlt = envCheck.EMAIL_USER && envCheck.EMAIL_PASS;
    const emailWorking = emailConfigured || emailConfiguredAlt;

    const requiredConfig = {
      email: emailWorking,
      nextauth: envCheck.NEXTAUTH_URL && envCheck.NEXTAUTH_SECRET,
      mongodb: envCheck.MONGODB_URI,
    };

    const allRequired = Object.values(requiredConfig).every(Boolean);

    // Determine email method and provide guidance
    let emailMethod = 'Not configured';
    let emailGuidance = [];
    
    if (emailConfigured) {
      emailMethod = 'GMAIL_USER/GMAIL_PASS';
      emailGuidance = ['✅ Gmail configuration detected'];
    } else if (emailConfiguredAlt) {
      emailMethod = 'EMAIL_USER/EMAIL_PASS';
      emailGuidance = ['✅ Alternative email configuration detected'];
    } else {
      emailGuidance = [
        '❌ No email configuration found',
        'Set GMAIL_USER and GMAIL_PASS environment variables',
        'Use your Gmail address for GMAIL_USER',
        'Use a Gmail App Password for GMAIL_PASS (not your regular password)',
        'Enable 2-Factor Authentication on your Google account first'
      ];
    }

    // Add deployment-specific guidance
    if (process.env.VERCEL) {
      emailGuidance.push('📝 For Vercel deployment: Set environment variables in Vercel dashboard');
    }

    return NextResponse.json({
      success: true,
      environment: envCheck,
      required: requiredConfig,
      allRequired,
      emailConfigured: emailWorking,
      emailMethod,
      emailGuidance,
      deployment: {
        platform: process.env.VERCEL ? 'Vercel' : 'Other',
        environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
        isProduction: process.env.NODE_ENV === 'production'
      },
      troubleshooting: {
        emailSetup: [
          '1. Go to Google Account settings (myaccount.google.com)',
          '2. Security → 2-Step Verification (enable if not already)',
          '3. Security → App passwords → Generate password for "Mail"',
          '4. Use the 16-character app password as GMAIL_PASS',
          '5. Set GMAIL_USER to your full Gmail address'
        ],
        vercelDeployment: [
          '1. Go to Vercel dashboard → Your project → Settings → Environment Variables',
          '2. Add GMAIL_USER with your Gmail address',
          '3. Add GMAIL_PASS with your Gmail app password',
          '4. Redeploy your application'
        ]
      }
    });

  } catch (error) {
    console.error('Error checking environment:', error);
    return NextResponse.json({ 
      error: 'Failed to check environment configuration',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}