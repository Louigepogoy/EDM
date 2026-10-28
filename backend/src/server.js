import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import { getDb, save, reset } from './store.js';
import { runEtl, summarizeRun } from './etl.js';
import { computeQuality } from './quality.js';
import { recordProblems, SOURCE_RULES } from './rules.js';
import { INDUSTRIES, INTEGRATION_METHODS } from './industries.js';
import { authenticate, register, login, changePassword, publicUser } from './auth.js';
import {
  ROLES,
  PERMISSIONS,
  POLICIES,
  requirePermission,
  permissionsFor,
  audit,
  can,
  maskEmployee,
} from './governance.js';

const PORT = process.env.PORT || 4000;
const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));

// ── Authentication (public) ─────────────────────────────
app.post('/api/auth/register', register);
app.post('/api/auth/login', login);

// Everything below requires a signed-in user.
app.use('/api', authenticate);

app.post('/api/auth/logout', (req, res) => {
  audit(req.user, 'auth.logout', req.user.email, 'allowed', 'Signed out');
  res.json({ ok: true });
});

app.post('/api/auth/password', changePassword);

const sourceSummary = (src) => {
  const { records, ...rest } = src;
  return { ...rest, recordCount: records.length };
};

function findSource(req, res, next) {
  req.source = getDb().sources[req.params.id];
  if (!req.source) return res.status(404).json({ error: `Unknown source "${req.params.id}"` });
  next();
}

// ── Session ─────────────────────────────────────────────
app.get('/api/me', (req, res) => {
  res.json({ user: req.user, permissions: permissionsFor(req.user.role), roles: ROLES });
});

// ── Dashboard ───────────────────────────────────────────
app.get('/api/dashboard', (req, res) => {
  const db = getDb();
  const quality = computeQuality(db);
  const employees = db.warehouse.employees;
  const tally = (values) => values.reduce((acc, v) => ({ ...acc, [v]: (acc[v] || 0) + 1 }), {});

  res.json({
    sources: Object.values(db.sources).map(sourceSummary),
    rawRecords: Object.values(db.sources).reduce((n, s) => n + s.records.length, 0),
    warehouse: { records: employees.length, complete: employees.filter((e) => e.complete).length, loadedAt: db.warehouse.loadedAt },
    quality: { overall: quality.overall, dimensions: quality.dimensions, issues: quality.issues.length },
    lastRun: db.etlRuns[0] ? summarizeRun(db.etlRuns[0]) : null,
    departments: tally(employees.map((e) => e.department || 'Unmapped')),
    flags: tally(employees.flatMap((e) => e.flags)),
  });
});

// ── Source systems ──────────────────────────────────────
app.get('/api/sources', requirePermission('sources:read'), (req, res) => {
  res.json(Object.values(getDb().sources).map(sourceSummary));
});

app.get('/api/sources/:id', requirePermission('sources:read'), findSource, (req, res) => {
  const key = req.source.id;
  res.json({
    ...req.source,
    idField: SOURCE_RULES[key].idField,
    records: req.source.records.map((r) => ({ ...r, _problems: recordProblems(key, r) })),
  });
});

app.post('/api/sources/:id/records', requirePermission('sources:write'), findSource, (req, res) => {
  const db = getDb();
  const src = req.source;
  const { idField } = SOURCE_RULES[src.id];
  const record = { _rid: `${src.id}-${db.counters.record++}` };
  for (const f of src.fields) record[f] = String(req.body?.[f] ?? '').trim();
  if (!record[idField]) return res.status(400).json({ error: `${idField} is required` });

  src.records.push(record);
  save();
  audit(req.user, 'source.record.create', `${src.id}/${record[idField]}`, 'allowed', `Added record to ${src.name}`);
  res.status(201).json({ ...record, _problems: recordProblems(src.id, record) });
});

app.delete('/api/sources/:id/records/:rid', requirePermission('sources:write'), findSource, (req, res) => {
  const src = req.source;
  const index = src.records.findIndex((r) => r._rid === req.params.rid);
  if (index === -1) return res.status(404).json({ error: 'Record not found' });

  const [removed] = src.records.splice(index, 1);
  save();
  audit(req.user, 'source.record.delete', `${src.id}/${removed[SOURCE_RULES[src.id].idField]}`, 'allowed', `Deleted record from ${src.name}`);
  res.json({ ok: true });
});

// ── ETL pipeline ────────────────────────────────────────
app.post('/api/etl/run', requirePermission('etl:run'), (req, res) => {
  const db = getDb();
  const run = runEtl(db, req.user);
  save();
  audit(req.user, 'etl.run', run.id, 'allowed', `Loaded ${run.stats.loaded} records · ${run.stats.errors} errors · ${run.stats.warnings} warnings`);
  res.status(201).json(run);
});

app.get('/api/etl/runs', requirePermission('etl:read'), (req, res) => {
  res.json(getDb().etlRuns.map(summarizeRun));
});

app.get('/api/etl/runs/:id', requirePermission('etl:read'), (req, res) => {
  const run = getDb().etlRuns.find((r) => r.id === req.params.id);
  if (!run) return res.status(404).json({ error: 'Run not found' });
  res.json(run);
});

// ── Data warehouse ──────────────────────────────────────
app.get('/api/warehouse/employees', requirePermission('warehouse:read'), (req, res) => {
  const { employees, loadedAt, runId } = getDb().warehouse;
  const unmasked = can(req.user, 'salary:view');
  audit(req.user, 'warehouse.read', 'employees', 'allowed', unmasked ? 'Salary fields visible' : 'Salary fields masked');
  res.json({
    loadedAt,
    runId,
    masked: !unmasked,
    employees: unmasked ? employees : employees.map(maskEmployee),
  });
});

// ── Data quality ────────────────────────────────────────
app.get('/api/quality', requirePermission('quality:read'), (req, res) => {
  res.json(computeQuality(getDb()));
});

// ── Governance ──────────────────────────────────────────
app.get('/api/governance', (req, res) => {
  const db = getDb();
  res.json({
    roles: ROLES,
    permissions: PERMISSIONS,
    policies: POLICIES,
    owners: Object.values(db.sources).map(({ id, name, owner, steward, role }) => ({ id, name, owner, steward, role })),
  });
});

app.get('/api/governance/audit', requirePermission('audit:read'), (req, res) => {
  res.json(getDb().auditLog);
});

// ── User management ─────────────────────────────────────
app.get('/api/users', requirePermission('users:manage'), (req, res) => {
  res.json(getDb().users.map(publicUser));
});

app.patch('/api/users/:id', requirePermission('users:manage'), (req, res) => {
  const role = req.body?.role;
  if (!ROLES[role]) return res.status(400).json({ error: `Unknown role "${role}"` });
  const user = getDb().users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.id === req.user.id) return res.status(400).json({ error: "You can't change your own role" });

  const previous = user.role;
  user.role = role;
  save();
  audit(req.user, 'user.role.update', user.email, 'allowed', `${previous} → ${role}`);
  res.json(publicUser(user));
});

// ── Reference content ───────────────────────────────────
app.get('/api/industries', (req, res) => {
  res.json({ industries: INDUSTRIES, methods: INTEGRATION_METHODS });
});

app.post('/api/system/reset', requirePermission('system:reset'), (req, res) => {
  reset();
  audit(req.user, 'system.reset', 'all', 'allowed', 'Demo data restored to seed state');
  res.json({ ok: true });
});

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// Serve the built React app in production.
const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'frontend', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

getDb();
app.listen(PORT, () => console.log(`EDM API listening on http://localhost:${PORT}`));
