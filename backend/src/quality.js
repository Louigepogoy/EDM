import { SOURCE_RULES, missingFields, recordProblems } from './rules.js';

const pct = (part, whole) => (whole ? Math.round((part / whole) * 1000) / 10 : 100);
const clean = (v) => String(v ?? '').trim();

// Data Quality Management: scores the raw source systems on five dimensions.
export function computeQuality(db) {
  const sources = [];
  const issues = [];
  let fields = 0, missing = 0, records = 0, valid = 0, duplicates = 0;

  for (const [key, src] of Object.entries(db.sources)) {
    const rules = SOURCE_RULES[key];
    const recs = src.records;
    const srcFields = recs.length * rules.required.length;
    const srcMissing = recs.reduce((n, r) => n + missingFields(key, r).length, 0);
    let srcValid = 0;
    const seen = new Set();
    let srcDup = 0;

    for (const r of recs) {
      const id = clean(r[rules.idField]);
      const problems = recordProblems(key, r);
      if (id && seen.has(id)) {
        srcDup++;
        problems.push('Duplicate employee ID within source');
      }
      if (id) seen.add(id);
      if (problems.length === 0) srcValid++;
      for (const p of problems) issues.push({ source: key, sourceName: src.name, recordId: id || '—', problem: p });
    }

    fields += srcFields;
    missing += srcMissing;
    records += recs.length;
    valid += srcValid;
    duplicates += srcDup;
    sources.push({
      id: key,
      name: src.name,
      records: recs.length,
      completeness: pct(srcFields - srcMissing, srcFields),
      validity: pct(srcValid, recs.length),
      uniqueness: pct(recs.length - srcDup, recs.length),
    });
  }

  // Cross-system checks against HR, the system of record.
  const hrNames = new Map(db.sources.hr.records.map((r) => [clean(r.employeeId), clean(r.name)]));
  let linked = 0, consistent = 0, dependents = 0;
  for (const key of ['payroll', 'attendance']) {
    const { idField, nameField } = SOURCE_RULES[key];
    for (const r of db.sources[key].records) {
      dependents++;
      const id = clean(r[idField]);
      if (!hrNames.has(id)) continue;
      linked++;
      if (clean(r[nameField]) === hrNames.get(id)) consistent++;
    }
  }

  const dimensions = [
    { key: 'completeness', label: 'Completeness', score: pct(fields - missing, fields), description: 'Required fields are populated' },
    { key: 'validity', label: 'Validity', score: pct(valid, records), description: 'Values pass format and range rules' },
    { key: 'uniqueness', label: 'Uniqueness', score: pct(records - duplicates, records), description: 'No duplicate records within a source' },
    { key: 'consistency', label: 'Consistency', score: pct(consistent, linked), description: 'Same employee spelled identically across systems' },
    { key: 'integrity', label: 'Referential integrity', score: pct(linked, dependents), description: 'Payroll & attendance records link to an HR employee' },
  ];
  const overall = Math.round((dimensions.reduce((n, d) => n + d.score, 0) / dimensions.length) * 10) / 10;

  const employees = db.warehouse.employees;
  return {
    evaluatedAt: new Date().toISOString(),
    overall,
    dimensions,
    sources,
    issues,
    warehouse: {
      loadedAt: db.warehouse.loadedAt,
      records: employees.length,
      complete: employees.filter((e) => e.complete).length,
      completeness: pct(employees.filter((e) => e.complete).length, employees.length),
    },
  };
}
