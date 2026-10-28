import {
  SOURCE_RULES,
  WORKING_DAYS,
  DEPARTMENT_NAMES,
  recordProblems,
  normalizeName,
  normalizeDate,
  normalizeMonth,
  normalizeDept,
  normalizeStatus,
  parseAmount,
  parseDays,
  nameMatchScore,
} from './rules.js';

const NAME_MATCH_THRESHOLD = 0.6;
const MAX_RUNS = 20;

const round = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d;

export function runEtl(db, user) {
  const startedAt = new Date();
  const logs = [];
  const issues = [];
  const log = (stage, message) => logs.push({ stage, message });
  const issue = (source, recordId, severity, message) => issues.push({ source, recordId, severity, message });

  // ── EXTRACT ─────────────────────────────────────────────
  const extracted = {};
  for (const [key, src] of Object.entries(db.sources)) {
    extracted[key] = src.records.map((r) => ({ ...r }));
    log('extract', `Extracted ${extracted[key].length} records from ${src.name} (${src.system})`);
  }

  // ── TRANSFORM: validate, quarantine and de-duplicate ────
  let duplicatesRemoved = 0;
  let rejected = 0;
  const clean = {};
  for (const [key, records] of Object.entries(extracted)) {
    const { idField, nameField } = SOURCE_RULES[key];
    const byId = new Map();
    for (const r of records) {
      const id = String(r[idField] ?? '').trim();
      if (!id || !String(r[nameField] ?? '').trim()) {
        rejected++;
        issue(key, id || '—', 'error', 'Rejected: record has no employee ID or name');
        continue;
      }
      if (byId.has(id)) {
        duplicatesRemoved++;
        issue(key, id, 'info', 'Duplicate record removed');
        continue;
      }
      for (const p of recordProblems(key, r)) issue(key, id, 'warning', p);
      byId.set(id, r);
    }
    clean[key] = byId;
  }
  log('transform', 'Mapped source-specific fields (employeeId / empId / emp_id) to one canonical schema');
  log('transform', `Removed ${duplicatesRemoved} duplicate record(s), rejected ${rejected} record(s) missing an ID or name`);

  // ── TRANSFORM: match, standardise, calculate, combine ───
  const nameResolutions = [];
  const employees = [];
  let datesConverted = 0;
  let deptsStandardised = 0;

  for (const [id, h] of clean.hr) {
    const name = normalizeName(h.name);
    const pay = clean.payroll.get(id);
    const att = clean.attendance.get(id);

    const variants = [{ source: 'hr', value: h.name, confidence: 1 }];
    for (const [key, rec] of [['payroll', pay], ['attendance', att]]) {
      if (!rec) continue;
      const raw = rec[SOURCE_RULES[key].nameField];
      const confidence = nameMatchScore(name, raw);
      variants.push({ source: key, value: raw, confidence });
      if (confidence < NAME_MATCH_THRESHOLD) {
        issue(key, id, 'warning', `Name "${raw}" does not match HR name "${name}" (confidence ${confidence})`);
      }
    }
    if (variants.some((v) => v.value !== name)) nameResolutions.push({ employeeId: id, resolvedName: name, variants });

    const hireDate = normalizeDate(h.hireDate);
    if (hireDate && hireDate !== h.hireDate) datesConverted++;
    const departmentCode = normalizeDept(h.department);
    if (departmentCode && departmentCode !== h.department) deptsStandardised++;
    const status = normalizeStatus(h.status);

    const amount = pay ? parseAmount(pay.monthlySalary) : null;
    const monthlySalary = amount > 0 ? amount : null;
    const daysPresent = att ? parseDays(att.daysPresent) : null;
    const dailyRate = monthlySalary != null ? round(monthlySalary / WORKING_DAYS) : null;
    const attendanceRate = daysPresent != null ? round(Math.min(daysPresent / WORKING_DAYS, 1) * 100, 1) : null;
    const estimatedPay =
      monthlySalary != null && daysPresent != null ? round((monthlySalary * Math.min(daysPresent, WORKING_DAYS)) / WORKING_DAYS) : null;

    // Business rules
    const flags = [];
    if (!pay) flags.push('Missing payroll');
    else if (monthlySalary == null) flags.push('Invalid salary');
    if (!att) flags.push('Missing attendance');
    else if (daysPresent == null) flags.push('Invalid attendance');
    if (daysPresent != null && daysPresent >= WORKING_DAYS) flags.push('Perfect attendance');
    if (attendanceRate != null && attendanceRate < 75 && status === 'active') flags.push('Low attendance');
    if (status === 'inactive' && daysPresent > 0) flags.push('Inactive but clocking in');
    if (!departmentCode) flags.push('Unmapped department');

    employees.push({
      employeeId: id,
      name,
      departmentCode,
      department: DEPARTMENT_NAMES[departmentCode] ?? null,
      position: h.position || null,
      hireDate,
      status,
      monthlySalary,
      currency: pay?.currency || 'PHP',
      dailyRate,
      payDate: pay ? normalizeDate(pay.payDate) : null,
      month: att ? normalizeMonth(att.month) : null,
      daysPresent,
      attendanceRate,
      estimatedPay,
      lineage: ['hr', pay && 'payroll', att && 'attendance'].filter(Boolean),
      flags,
      complete: Boolean(monthlySalary != null && daysPresent != null && hireDate && departmentCode && status),
    });
  }

  let orphans = 0;
  for (const key of ['payroll', 'attendance']) {
    for (const id of clean[key].keys()) {
      if (clean.hr.has(id)) continue;
      orphans++;
      issue(key, id, 'error', 'Orphan record: no matching employee in HR (system of record) — quarantined');
    }
  }

  const flagged = employees.filter((e) => e.flags.length).length;
  log('transform', `Standardised ${nameResolutions.length} employee name(s) and matched them across systems by employee ID`);
  log('transform', `Converted ${datesConverted} hire date(s) to ISO 8601 (YYYY-MM-DD)`);
  log('transform', `Standardised ${deptsStandardised} department value(s) to canonical codes`);
  log('transform', `Calculated daily rate (salary ÷ ${WORKING_DAYS}), attendance rate and estimated pay`);
  log('transform', `Applied business rules — ${flagged} employee(s) flagged`);
  log('transform', `Quarantined ${orphans} orphan record(s) with no HR match`);

  // ── LOAD ────────────────────────────────────────────────
  const runId = `RUN-${String(db.counters.run++).padStart(4, '0')}`;
  db.warehouse = { employees, loadedAt: new Date().toISOString(), runId };
  log('load', `Loaded ${employees.length} unified employee record(s) into the data warehouse (full refresh)`);
  log('load', `${employees.filter((e) => e.complete).length} of ${employees.length} records are complete and analytics-ready`);

  const errors = issues.filter((i) => i.severity === 'error').length;
  const warnings = issues.filter((i) => i.severity === 'warning').length;
  const finishedAt = new Date();
  const run = {
    id: runId,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt - startedAt,
    triggeredBy: user.name,
    role: user.role,
    status: errors ? 'completed_with_errors' : warnings ? 'completed_with_warnings' : 'success',
    stats: {
      extracted: Object.fromEntries(Object.entries(extracted).map(([k, v]) => [k, v.length])),
      duplicatesRemoved,
      rejected,
      orphans,
      loaded: employees.length,
      complete: employees.filter((e) => e.complete).length,
      errors,
      warnings,
    },
    logs,
    issues,
    nameResolutions,
  };

  db.etlRuns.unshift(run);
  db.etlRuns.length = Math.min(db.etlRuns.length, MAX_RUNS);
  return run;
}

export const summarizeRun = ({ logs, issues, nameResolutions, ...summary }) => summary;
