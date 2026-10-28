import { getDb, save } from './store.js';

const MAX_AUDIT = 500;

export const ROLES = {
  admin: { label: 'Administrator', description: 'Manages source systems, runs pipelines and reviews the audit trail' },
  analyst: { label: 'Data Analyst', description: 'Runs ETL and works with full warehouse data' },
  viewer: { label: 'Viewer', description: 'Read-only access to curated data; sensitive fields are masked' },
};

export const PERMISSIONS = {
  'sources:read': { label: 'View raw source data', roles: ['admin', 'analyst'] },
  'sources:write': { label: 'Add / delete source records', roles: ['admin'] },
  'etl:read': { label: 'View pipeline runs', roles: ['admin', 'analyst', 'viewer'] },
  'etl:run': { label: 'Run ETL pipeline', roles: ['admin', 'analyst'] },
  'warehouse:read': { label: 'Query data warehouse', roles: ['admin', 'analyst', 'viewer'] },
  'salary:view': { label: 'See unmasked salary data', roles: ['admin', 'analyst'] },
  'quality:read': { label: 'View data quality reports', roles: ['admin', 'analyst', 'viewer'] },
  'audit:read': { label: 'Read audit trail', roles: ['admin'] },
  'users:manage': { label: 'Manage user accounts & roles', roles: ['admin'] },
  'system:reset': { label: 'Reset demo data', roles: ['admin'] },
};

export const POLICIES = [
  { id: 'GOV-01', category: 'Ownership', name: 'Named data owners & stewards', description: 'Every source system has an accountable owner department and a data steward.' },
  { id: 'GOV-02', category: 'Security', name: 'Role-based access control', description: 'Access to raw sources, pipelines and audit logs is granted per role, never per person. New accounts start as Viewer; only admins grant higher roles.' },
  { id: 'GOV-03', category: 'Security', name: 'Sensitive field masking', description: 'Salary, daily rate and pay figures are masked for roles without salary:view.' },
  { id: 'GOV-04', category: 'Compliance', name: 'Immutable audit trail', description: 'Every sign-in, write, pipeline run, sensitive read and denied request is logged with who, what and when.' },
  { id: 'GOV-05', category: 'Quality', name: 'HR is the system of record', description: 'Employee identity comes from HR; payroll or attendance records with no HR match are quarantined.' },
  { id: 'GOV-06', category: 'Quality', name: 'Validate before load', description: 'Records missing an ID or name are rejected; invalid values are nulled and flagged, never guessed.' },
];

export function permissionsFor(role) {
  return Object.keys(PERMISSIONS).filter((p) => PERMISSIONS[p].roles.includes(role));
}

export const can = (user, permission) => PERMISSIONS[permission]?.roles.includes(user.role) ?? false;

export function audit(user, action, resource, outcome = 'allowed', detail = '') {
  const db = getDb();
  db.auditLog.unshift({
    id: db.counters.audit++,
    at: new Date().toISOString(),
    user: user.name,
    role: user.role,
    action,
    resource,
    outcome,
    detail,
  });
  db.auditLog.length = Math.min(db.auditLog.length, MAX_AUDIT);
  save();
}

export function requirePermission(permission) {
  return (req, res, next) => {
    if (can(req.user, permission)) return next();
    audit(req.user, `${req.method} ${req.path}`, permission, 'denied', `Role "${req.user.role}" lacks ${permission}`);
    res.status(403).json({ error: `Your role (${req.user.role}) is not allowed to: ${PERMISSIONS[permission].label}` });
  };
}

const SENSITIVE_FIELDS = ['monthlySalary', 'dailyRate', 'estimatedPay'];

export function maskEmployee(employee) {
  const masked = { ...employee };
  for (const f of SENSITIVE_FIELDS) masked[f] = null;
  return masked;
}
