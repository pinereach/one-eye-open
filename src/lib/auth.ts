import { dbFirst, dbRun, type D1Database } from './db';

export interface User {
  id: string;
  email: string;
  display_name: string;
  role: 'user' | 'admin';
  created_at: number;
}

export interface Session {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: number;
  created_at: number;
}

const SALT_ROUNDS = 100000; // PBKDF2 iterations
const SESSION_DURATION_DAYS = 14;

// Web Crypto API compatible password hashing using PBKDF2
async function deriveKey(password: string, salt: ArrayBuffer): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: SALT_ROUNDS,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );
}

export async function hashPassword(password: string): Promise<string> {
  const saltArray = crypto.getRandomValues(new Uint8Array(16));
  const salt = saltArray.buffer;
  const key = await deriveKey(password, salt);
  const keyBuffer = await crypto.subtle.exportKey('raw', key);
  const hash = Array.from(new Uint8Array(keyBuffer));

  // Store as: salt:hash (both base64 encoded)
  const saltB64 = btoa(String.fromCharCode(...saltArray));
  const hashB64 = btoa(String.fromCharCode(...hash));
  return `${saltB64}:${hashB64}`;
}

export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  try {
    const [saltB64, hashB64] = storedHash.split(':');
    if (!saltB64 || !hashB64) return false;

    const saltArray = Uint8Array.from(atob(saltB64), (c) => c.charCodeAt(0));
    const salt = saltArray.buffer;
    const key = await deriveKey(password, salt);
    const keyBuffer = await crypto.subtle.exportKey('raw', key);
    const hash = Array.from(new Uint8Array(keyBuffer));
    const hashB64New = btoa(String.fromCharCode(...hash));

    return hashB64 === hashB64New;
  } catch {
    return false;
  }
}

export function generateSessionToken(): string {
  return crypto.randomUUID();
}

export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function getSessionExpiry(days: number = SESSION_DURATION_DAYS): number {
  return Math.floor(Date.now() / 1000) + days * 24 * 60 * 60;
}

export async function createSession(
  db: D1Database,
  userId: string,
  token: string,
  days: number = SESSION_DURATION_DAYS
): Promise<Session> {
  const sessionId = crypto.randomUUID();
  const tokenHash = await hashToken(token);
  const expiresAt = getSessionExpiry(days);
  const createdAt = Math.floor(Date.now() / 1000);

  await dbRun(
    db,
    `INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [sessionId, userId, tokenHash, expiresAt, createdAt]
  );

  return {
    id: sessionId,
    user_id: userId,
    token_hash: tokenHash,
    expires_at: expiresAt,
    created_at: createdAt,
  };
}

export async function getSessionByToken(
  db: D1Database,
  token: string
): Promise<{ session: Session; user: User } | null> {
  const tokenHash = await hashToken(token);
  const now = Math.floor(Date.now() / 1000);

  const session = await dbFirst<Session>(
    db,
    `SELECT * FROM sessions 
     WHERE token_hash = ? AND expires_at > ?`,
    [tokenHash, now]
  );

  if (!session) {
    return null;
  }

  const user = await dbFirst<User>(
    db,
    `SELECT id, email, display_name, role, created_at FROM users WHERE id = ?`,
    [session.user_id]
  );

  if (!user) {
    return null;
  }

  return { session, user };
}

export async function deleteSession(
  db: D1Database,
  token: string
): Promise<void> {
  const tokenHash = await hashToken(token);
  await dbRun(db, `DELETE FROM sessions WHERE token_hash = ?`, [tokenHash]);
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
  return `session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}

export function clearSessionCookie(): string {
  return `session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}
