import { NextResponse } from 'next/server';
import { clearSession, getSession, logAuthEvent } from '@/lib/auth';

export async function POST() {
  try {
    const session = await getSession();
    
    if (session) {
      logAuthEvent('logout', session.username);
    }
    
    await clearSession();
    
    return NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });
    
  } catch (error) {
    console.error('Logout error:', error);
    
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
  }
}