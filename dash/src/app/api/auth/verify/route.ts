import { NextResponse } from 'next/server';
import { getSession, logAuthEvent } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({
        authenticated: false,
      });
    }
    
    logAuthEvent('auth_check', session.username, { 
      result: 'valid',
      expiresAt: new Date(session.expiresAt).toISOString(),
    });
    
    return NextResponse.json({
      authenticated: true,
      username: session.username,
      expiresAt: session.expiresAt,
    });
    
  } catch (error) {
    console.error('Session verification error:', error);
    
    return NextResponse.json({
      authenticated: false,
    });
  }
}