// Shared normalisation + validation rules used by both the ETL engine and the DQM scorer.

export const WORKING_DAYS = 22;

const DEPARTMENT_ALIASES = {
  IT: ['it', 'i.t.', 'information technology', 'tech'],
  HR: ['hr', 'human resources'],
  FIN: ['fin', 'finance', 'accounting'],
  OPS: ['ops', 'operations'],
  LAB: ['lab', 'laboratory', 'medical laboratory'],
};

export const DEPARTMENT_NAMES = {
  IT: 'Information Technology',
  HR: 'Human Resources',
  FIN: 'Finance',
  OPS: 'Operations',
  LAB: 'Laboratory',
};

const STATUSES = ['active', 'inactive', 'on leave'];
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

const isBlank = (v) => v === undefined || v === null || String(v).trim() === '';

function monthIndex(name) {
  const i = MONTHS.indexOf(String(name).slice(0, 3).toLowerCase());
  return i === -1 ? null : i + 1;
}

function toIsoDate(y, m, d) {
  if (!m) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return dt.toISOString().slice(0, 10);
}

// Accepts 2019-03-15, 03/15/2019 (US), 15-Mar-2019, March 15, 2019
export function normalizeDate(value) {
  const s = String(value ?? '').trim();
  let m;
  if ((m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/))) return toIsoDate(+m[1], +m[2], +m[3]);
  if ((m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/))) return toIsoDate(+m[3], +m[1], +m[2]);
  if ((m = s.match(/^(\d{1,2})[-\s]([A-Za-z]{3,})[-\s,]+(\d{4})$/))) return toIsoDate(+m[3], monthIndex(m[2]), +m[1]);
  if ((m = s.match(/^([A-Za-z]{3,})\.?\s+(\d{1,2}),?\s+(\d{4})$/))) return toIsoDate(+m[3], monthIndex(m[1]), +m[2]);
  return null;
}

// Accepts 2026-09, 09/2026, Sep 2026, September 2026
export function normalizeMonth(value) {
  const s = String(value ?? '').trim();
  let m, year, month;
  if ((m = s.match(/^(\d{4})-(\d{1,2})$/))) [year, month] = [+m[1], +m[2]];
  else if ((m = s.match(/^(\d{1,2})\/(\d{4})$/))) [year, month] = [+m[2], +m[1]];
  else if ((m = s.match(/^([A-Za-z]{3,})\.?\s+(\d{4})$/))) [year, month] = [+m[2], monthIndex(m[1])];
  if (!month || month < 1 || month > 12) return null;
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function normalizeDept(value) {
  const key = String(value ?? '').trim().toLowerCase();
  for (const [code, aliases] of Object.entries(DEPARTMENT_ALIASES)) {
    if (aliases.includes(key)) return code;
  }
  return null;
}

export function normalizeStatus(value) {
  const s = String(value ?? '').trim().toLowerCase();
  return STATUSES.includes(s) ? s : null;
}

export function parseAmount(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const cleaned = String(value ?? '').replace(/PHP|[₱$,\s]/gi, '');
  return /^-?\d+(\.\d+)?$/.test(cleaned) ? Number(cleaned) : null;
}

export function parseDays(value) {
  if (isBlank(value)) return null;
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 && n <= 31 ? n : null;
}

export function normalizeName(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/(^|[\s-])(\p{L})/gu, (_, sep, ch) => sep + ch.toUpperCase());
}

const nameTokens = (n) => normalizeName(n).toLowerCase().replace(/\./g, '').split(' ').filter(Boolean);

// Token match where an initial ("D.") partially matches a full token ("Dela").
export function nameMatchScore(a, b) {
  const ta = nameTokens(a);
  const tb = nameTokens(b);
  if (!ta.length || !tb.length) return 0;
  const [short, long] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  const used = new Set();
  let matched = 0;
  for (const t of short) {
    let weight = 0;
    const i = long.findIndex((u, idx) => {
      if (used.has(idx)) return false;
      if (u === t) return (weight = 1);
      if ((t.length === 1 && u.startsWith(t)) || (u.length === 1 && t.startsWith(u))) return (weight = 0.8);
      return false;
    });
    if (i !== -1) {
      used.add(i);
      matched += weight;
    }
  }
  return Math.round((matched / ((short.length + long.length) / 2)) * 100) / 100;
}

export const SOURCE_RULES = {
  hr: {
    idField: 'employeeId',
    nameField: 'name',
    required: ['employeeId', 'name', 'department', 'hireDate', 'status'],
    check(r) {
      const problems = [];
      if (!isBlank(r.hireDate) && !normalizeDate(r.hireDate)) problems.push(`Unrecognised hire date "${r.hireDate}"`);
      if (!isBlank(r.department) && !normalizeDept(r.department)) problems.push(`Unknown department code "${r.department}"`);
      if (!isBlank(r.status) && !normalizeStatus(r.status)) problems.push(`Unknown status "${r.status}"`);
      return problems;
    },
  },
  payroll: {
    idField: 'empId',
    nameField: 'fullName',
    required: ['empId', 'fullName', 'monthlySalary', 'payDate'],
    check(r) {
      const problems = [];
      if (!isBlank(r.monthlySalary)) {
        const amount = parseAmount(r.monthlySalary);
        if (amount === null) problems.push(`Salary "${r.monthlySalary}" is not a number`);
        else if (amount <= 0) problems.push(`Salary must be positive (got ${amount})`);
      }
      if (!isBlank(r.payDate) && !normalizeDate(r.payDate)) problems.push(`Unrecognised pay date "${r.payDate}"`);
      return problems;
    },
  },
  attendance: {
    idField: 'emp_id',
    nameField: 'employee',
    required: ['emp_id', 'employee', 'daysPresent', 'month'],
    check(r) {
      const problems = [];
      if (!isBlank(r.daysPresent) && parseDays(r.daysPresent) === null) problems.push(`Days present "${r.daysPresent}" must be a whole number 0–31`);
      if (!isBlank(r.month) && !normalizeMonth(r.month)) problems.push(`Unrecognised month "${r.month}"`);
      return problems;
    },
  },
};

export function missingFields(sourceKey, record) {
  return SOURCE_RULES[sourceKey].required.filter((f) => isBlank(record[f]));
}

export function recordProblems(sourceKey, record) {
  return [...missingFields(sourceKey, record).map((f) => `Missing ${f}`), ...SOURCE_RULES[sourceKey].check(record)];
}
