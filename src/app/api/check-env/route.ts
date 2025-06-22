import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const envCheck = {
      // Email configuration
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
    };

    const emailConfigured = envCheck.GMAIL_USER && envCheck.GMAIL_PASS;
    const emailConfiguredAlt = envCheck.EMAIL_USER && envCheck.EMAIL_PASS;
    const emailWorking = emailConfigured || emailConfiguredAlt;

    const requiredConfig = {
      email: emailWorking,
      nextauth: envCheck.NEXTAUTH_URL && envCheck.NEXTAUTH_SECRET,
      mongodb: envCheck.MONGODB_URI,
    };

    const allRequired = Object.values(requiredConfig).every(Boolean);

    return NextResponse.json({
      success: true,
      environment: envCheck,
      required: requiredConfig,
      allRequired,
      emailConfigured: emailWorking,
      emailMethod: emailConfigured ? 'GMAIL_USER/GMAIL_PASS' : emailConfiguredAlt ? 'EMAIL_USER/EMAIL_PASS' : 'Not configured'
    });

  } catch (error) {
    console.error('Error checking environment:', error);
    return NextResponse.json({ 
      error: 'Failed to check environment configuration',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 