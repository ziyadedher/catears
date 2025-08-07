import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';

// Security configuration
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || (() => {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be set in production');
    }
    console.warn('[AUTH] No JWT_SECRET set, using insecure default (development only)');
    return 'default-secret-change-me-in-production';
  })()
);

const AUTH_COOKIE_NAME = 'catears-auth';
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

// Pre-shared password from environment (username can be anything)
// Using base64 encoding to avoid $ character parsing issues in env vars
const VALID_PASSWORD_HASH = process.env.AUTH_PASSWORD_HASH_BASE64 
  ? Buffer.from(process.env.AUTH_PASSWORD_HASH_BASE64, 'base64').toString('utf8')
  : (() => {
      console.warn('[AUTH] No AUTH_PASSWORD_HASH_BASE64 set, using default password "changeme"');
      return bcrypt.hashSync('changeme', 10);
    })();

export interface SessionPayload {
  username: string;
  expiresAt: number;
}

export async function createSession(username: string): Promise<string> {
  const expiresAt = Date.now() + SESSION_DURATION;
  
  const token = await new SignJWT({ username, expiresAt })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
    
  return token;
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    
    if (!payload.username || !payload.expiresAt) {
      return null;
    }
    
    if (Date.now() > (payload.expiresAt as number)) {
      return null;
    }
    
    return {
      username: payload.username as string,
      expiresAt: payload.expiresAt as number,
    };
  } catch (error) {
    console.error('Session verification failed:', error);
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME);
  
  if (!token) {
    return null;
  }
  
  return verifySession(token.value);
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  
  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION / 1000, // Convert to seconds
    path: '/',
  });
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
}

export async function verifyCredentials(username: string, password: string): Promise<boolean> {
  // Username can be anything (used for logging only)
  // Only validate the password
  if (!username || username.trim().length === 0) {
    return false;
  }
  
  return bcrypt.compare(password, VALID_PASSWORD_HASH);
}

// Audit logging helper
export function logAuthEvent(
  event: 'login_attempt' | 'login_success' | 'login_failure' | 'logout' | 'auth_check',
  username: string,
  metadata?: Record<string, unknown>
) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    event,
    username,
    ...metadata,
  };
  
  // Log to console with structured format
  console.log(`[AUTH] ${JSON.stringify(logEntry)}`);
}