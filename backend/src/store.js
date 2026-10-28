import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSeed, createDemoUser, DEMO_ACCOUNTS } from './seed.js';

const DATA_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

let db;

// Brings older databases up to date: adds users, demo accounts and a signing secret if missing.
function migrate() {
  db.users ??= [];
  db.counters.user ??= db.users.length + 1;
  for (const demo of DEMO_ACCOUNTS) {
    if (!db.users.some((u) => u.email === demo.email)) db.users.push(createDemoUser(demo, `U-${db.counters.user++}`));
  }
  db.jwtSecret ??= crypto.randomBytes(32).toString('hex');
}

export function getDb() {
  if (!db) {
    try {
      db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    } catch {
      db = createSeed();
    }
    migrate();
    save();
  }
  return db;
}

export function save() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// Restores the demo data but keeps user accounts and the signing secret.
export function reset() {
  const { users, jwtSecret, counters } = getDb();
  db = createSeed();
  db.users = users;
  db.jwtSecret = jwtSecret;
  db.counters.user = counters.user;
  save();
  return db;
}
