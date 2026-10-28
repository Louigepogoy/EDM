import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb, save } from './store.js';
import { audit } from './governance.js';

const TOKEN_TTL = '8h';
const MIN_PASSWORD = 8;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Compared against when the email is unknown, so response time doesn't reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

const secret = () => process.env.JWT_SECRET || getDb().jwtSecret;
const issueToken = (user) => jwt.sign({ sub: user.id }, secret(), { expiresIn: TOKEN_TTL });
const cleanEmail = (v) => String(v ?? '').trim().toLowerCase();

export const publicUser = ({ passwordHash, ...user }) => user;

export async function register(req, res) {
  const name = String(req.body?.name ?? '').trim();
  const email = cleanEmail(req.body?.email);
  const password = String(req.body?.password ?? '');

  if (!name) return res.status(400).json({ error: 'Name is required' });
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Enter a valid email address' });
  if (password.length < MIN_PASSWORD) return res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD} characters` });

  const db = getDb();
  if (db.users.some((u) => u.email === email)) return res.status(409).json({ error: 'An account with this email already exists' });

  const user = {
    id: `U-${db.counters.user++}`,
    name,
    email,
    role: 'viewer',
    passwordHash: await bcrypt.hash(password, 10),
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
  };
  db.users.push(user);
  save();
  audit(user, 'auth.register', email, 'allowed', 'New account created with viewer role');
  res.status(201).json({ token: issueToken(user), user: publicUser(user) });
}

export async function login(req, res) {
  const email = cleanEmail(req.body?.email);
  const password = String(req.body?.password ?? '');
  const user = getDb().users.find((u) => u.email === email);
  const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);

  if (!user || !valid) {
    audit({ name: email || '(blank)', role: '—' }, 'auth.login', email || '—', 'denied', 'Invalid email or password');
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  user.lastLoginAt = new Date().toISOString();
  save();
  audit(user, 'auth.login', email, 'allowed', 'Signed in');
  res.json({ token: issueToken(user), user: publicUser(user) });
}

export async function changePassword(req, res) {
  const user = getDb().users.find((u) => u.id === req.user.id);
  const current = String(req.body?.currentPassword ?? '');
  const next = String(req.body?.newPassword ?? '');

  if (!(await bcrypt.compare(current, user.passwordHash))) {
    audit(req.user, 'auth.password.change', user.email, 'denied', 'Current password incorrect');
    return res.status(400).json({ error: 'Current password is incorrect' });
  }
  if (next.length < MIN_PASSWORD) return res.status(400).json({ error: `New password must be at least ${MIN_PASSWORD} characters` });

  user.passwordHash = await bcrypt.hash(next, 10);
  save();
  audit(req.user, 'auth.password.change', user.email, 'allowed', 'Password changed');
  res.json({ ok: true });
}

// Loads the user fresh on every request so role changes take effect immediately.
export function authenticate(req, res, next) {
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Please sign in' });

  try {
    const { sub } = jwt.verify(token, secret());
    const user = getDb().users.find((u) => u.id === sub);
    if (!user) throw new Error('User no longer exists');
    req.user = publicUser(user);
    next();
  } catch {
    res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
  }
}
