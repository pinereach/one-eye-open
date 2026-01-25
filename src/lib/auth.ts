import bcrypt from 'bcryptjs';
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

const SALT_ROUNDS = 10;
const SESSION_DURATION_DAYS = 14;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
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
