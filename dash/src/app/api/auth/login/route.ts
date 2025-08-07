import { NextRequest, NextResponse } from 'next/server';
import { verifyCredentials, createSession, setSessionCookie, logAuthEvent } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;
    
    if (!username || !password) {
      logAuthEvent('login_failure', username || 'unknown', { reason: 'missing_credentials' });
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }
    
    logAuthEvent('login_attempt', username, { 
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent'),
    });
    
    const isValid = await verifyCredentials(username, password);
    
    if (!isValid) {
      logAuthEvent('login_failure', username, { reason: 'invalid_credentials' });
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }
    
    // Create session
    const token = await createSession(username);
    await setSessionCookie(token);
    
    logAuthEvent('login_success', username);
    
    return NextResponse.json({
      success: true,
      username,
      message: 'Login successful',
    });
    
  } catch (error) {
    console.error('Login error:', error);
    logAuthEvent('login_failure', 'unknown', { error: String(error) });
    
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}