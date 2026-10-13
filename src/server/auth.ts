import 'server-only';
import { createHmac, createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { NextRequest } from 'next/server';

const scrypt = promisify(scryptCallback);
const cookieName = 'cars21_session';
const sessionSeconds = 60 * 60 * 12;

export type SessionUser = { sub: string; role: 'superadmin' | 'admin' | 'vendor'; name: string; email?: string; vendorId?: string; credentialVersion?: string; exp: number };

function signingKey() {
  return process.env.CARS21_SESSION_SECRET || process.env.CARS21_SUPERADMIN_PASSWORD || process.env.CARS21_ADMIN_TOKEN || '';
}

export function verifySuperadminCredentials(identifier: string, password: string) {
  const expectedUser = process.env.CARS21_SUPERADMIN_USERNAME || '';
  const expectedPassword = process.env.CARS21_SUPERADMIN_PASSWORD || '';
  return Boolean(expectedUser && expectedPassword && safeEqual(identifier.trim(), expectedUser) && safeEqual(password, expectedPassword));
}

function safeEqual(leftValue: string, rightValue: string) {
  if (!leftValue || !rightValue) return false;
  const left = Buffer.from(leftValue);
  const right = Buffer.from(rightValue);
  return left.length === right.length && timingSafeEqual(left, right);
}

function superadminCredentialVersion() {
  const value = process.env.CARS21_SUPERADMIN_PASSWORD || '';
  return value ? createHash('sha256').update(value).digest('base64url') : '';
}

export function verifyAdminToken(value: string) {
  const expected = process.env.CARS21_ADMIN_TOKEN || '';
  if (!expected || !value) return false;
  const left = Buffer.from(expected);
  const right = Buffer.from(value);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function createSession(user: Omit<SessionUser, 'exp'>) {
  const key = signingKey();
  if (!key) throw new Error('Set CARS21_SESSION_SECRET or configure management credentials before enabling management access.');
  if (user.role === 'superadmin') user.credentialVersion = superadminCredentialVersion();
  const payload = Buffer.from(JSON.stringify({ ...user, exp: Math.floor(Date.now() / 1000) + sessionSeconds })).toString('base64url');
  const signature = createHmac('sha256', key).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function getSession(request: NextRequest): SessionUser | null {
  const token = request.cookies.get(cookieName)?.value;
  const key = signingKey();
  if (!token || !key) return null;
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra) return null;
  const expected = createHmac('sha256', key).update(payload).digest();
  let actual: Buffer;
  try { actual = Buffer.from(signature, 'base64url'); } catch { return null; }
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const user = JSON.parse(Buffer.from(payload, 'base64url').toString()) as SessionUser;
    if (!user.sub || !['superadmin', 'admin', 'vendor'].includes(user.role) || !Number.isFinite(user.exp) || user.exp <= Date.now() / 1000) return null;
    if (user.role === 'superadmin' && (!user.credentialVersion || user.credentialVersion !== superadminCredentialVersion())) return null;
    return user;
  } catch { return null; }
}

export function isAdminRequest(request: NextRequest): boolean {
  const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
  const role = getSession(request)?.role;
  return verifyAdminToken(bearer) || role === 'admin' || role === 'superadmin';
}

export function isSuperAdminRequest(request: NextRequest): boolean {
  return getSession(request)?.role === 'superadmin';
}

export function isVendorSession(request: NextRequest) {
  const session = getSession(request);
  return session?.role === 'vendor' ? session : null;
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const derived = await scrypt(password, salt, 64) as Buffer;
  return { salt, hash: derived.toString('hex') };
}

export async function verifyPassword(password: string, salt: string, expectedHash: string) {
  if (!salt || !expectedHash) return false;
  const derived = await scrypt(password, salt, 64) as Buffer;
  const expected = Buffer.from(expectedHash, 'hex');
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}

export const sessionCookieName = cookieName;
export const sessionCookieMaxAge = sessionSeconds;
