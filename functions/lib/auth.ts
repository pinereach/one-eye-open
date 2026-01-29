import { dbFirst, type D1Database } from './db';

export interface User {
  id: number;
  username: string;
  view_scores?: boolean;
  view_market_maker?: boolean;
  view_market_creation?: boolean;
  admin?: boolean;
}

interface TokenPayload {
  userId: number;
  username: string;
  exp: number;
}

const SESSION_DURATION_DAYS = 14;

// Plain text password storage (no security - for unserious projects only!)
export async function hashPassword(password: string): Promise<string> {
  return password;
}

export async function verifyPassword(
  password: string,
  storedPassword: string
): Promise<boolean> {
  return password === storedPassword;
}

function getSessionExpiry(days: number = SESSION_DURATION_DAYS): number {
  return Math.floor(Date.now() / 1000) + days * 24 * 60 * 60;
}

async function getSecretKey(env: any): Promise<CryptoKey> {
  // Use a simple secret from env or default
  const secret = env.SESSION_SECRET || 'default-secret-key-change-in-production';
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const keyBuffer = await crypto.subtle.digest('SHA-256', keyData);
  
  return crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function createToken(
  user: User,
  env: any
): Promise<string> {
  const payload: TokenPayload = {
    userId: user.id,
    username: user.username,
    exp: getSessionExpiry(),
  };

  const payloadJson = JSON.stringify(payload);
  const encoder = new TextEncoder();
  const payloadData = encoder.encode(payloadJson);

  const key = await getSecretKey(env);
  const signature = await crypto.subtle.sign('HMAC', key, payloadData);

  // Simple base64 encoding (not URL-safe, but works for cookies)
  const payloadB64 = btoa(payloadJson);
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)));

  return `${payloadB64}.${sigB64}`;
}

export async function verifyToken(
  token: string,
  env: any
): Promise<TokenPayload | null> {
  try {
    const [payloadB64, sigB64] = token.split('.');
    if (!payloadB64 || !sigB64) return null;

    const payloadJson = atob(payloadB64);
    const payload: TokenPayload = JSON.parse(payloadJson);

    // Check expiration
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    // Verify signature
    const encoder = new TextEncoder();
    const payloadData = encoder.encode(payloadJson);
    const signature = Uint8Array.from(atob(sigB64), c => c.charCodeAt(0));

    const key = await getSecretKey(env);
    const isValid = await crypto.subtle.verify('HMAC', key, signature, payloadData);

    if (!isValid) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function getUserFromToken(
  db: D1Database,
  token: string,
  env: any
): Promise<User | null> {
  const payload = await verifyToken(token, env);
  if (!payload) {
    return null;
  }

  // Verify user still exists and get latest data (include view flags for nav/features)
  try {
    const row = await dbFirst<{
      id: number;
      username: string;
      view_scores?: number;
      view_market_maker?: number;
      view_market_creation?: number;
      admin?: number;
    }>(
      db,
      `SELECT id, username, view_scores, view_market_maker, view_market_creation, admin FROM users WHERE id = ?`,
      [payload.userId]
    );

    if (!row) return null;

    return {
      id: row.id,
      username: row.username,
      view_scores: Boolean(row.view_scores ?? 0),
      view_market_maker: Boolean(row.view_market_maker ?? 0),
      view_market_creation: Boolean(row.view_market_creation ?? 0),
      admin: Boolean(row.admin ?? 0),
    };
  } catch {
    // Fallback if view_scores etc columns don't exist (migrations 0041/0042 not run)
    const user = await dbFirst<{ id: number; username: string }>(
      db,
      `SELECT id, username FROM users WHERE id = ?`,
      [payload.userId]
    );
    if (!user) return null;
    return { id: user.id, username: user.username };
  }
}

export function getCookieValue(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(';').map((c) => c.trim());
  for (const cookie of cookies) {
    const [key, value] = cookie.split('=');
    if (key === name) {
      return decodeURIComponent(value);
    }
  }
  return null;
}

export function setSessionCookie(token: string, days: number = SESSION_DURATION_DAYS): string {
  const maxAge = days * 24 * 60 * 60;
  return `session=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}

export function clearSessionCookie(): string {
  return `session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}
