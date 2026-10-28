import bcrypt from 'bcryptjs';

// Deliberately messy source data: inconsistent names, date formats, department codes,
// duplicates, invalid values and orphan records — the problems EDM integration solves.

// Demo accounts, one or more per role. Credentials are documented in the README.
export const DEMO_ACCOUNTS = [
  { name: 'System Administrator', email: 'admin@edm.local', password: 'Admin@12345', role: 'admin', note: 'Full access' },
  { name: 'Dana Cruz', email: 'analyst@edm.local', password: 'Analyst@123', role: 'analyst', note: 'Runs ETL, sees salaries' },
  { name: 'Maria Santos', email: 'maria.santos@edm.local', password: 'Maria@1234', role: 'analyst', note: 'HR data steward' },
  { name: 'Vic Ramos', email: 'viewer@edm.local', password: 'Viewer@123', role: 'viewer', note: 'Read-only, salaries masked' },
  { name: 'Grace Lim', email: 'grace.lim@edm.local', password: 'Grace@1234', role: 'viewer', note: 'IT data engineer' },
];

export function createDemoUser({ name, email, password, role }, id) {
  return {
    id,
    name,
    email,
    role,
    passwordHash: bcrypt.hashSync(password, 10),
    createdAt: new Date().toISOString(),
    lastLoginAt: null,
  };
}

export const createDefaultUsers = () => DEMO_ACCOUNTS.map((a, i) => createDemoUser(a, `U-${i + 1}`));

const withIds = (key, records) => records.map((r, i) => ({ _rid: `${key}-${i + 1}`, ...r }));

export function createSeed() {
  return {
    sources: {
      hr: {
        id: 'hr',
        name: 'HR Database',
        system: 'PostgreSQL · HRIS',
        owner: 'Human Resources',
        steward: 'Maria Santos',
        role: 'System of record for employee identity',
        fields: ['employeeId', 'name', 'department', 'position', 'hireDate', 'status'],
        records: withIds('hr', [
          { employeeId: '1001', name: 'Juan Dela Cruz', department: 'IT', position: 'Systems Analyst', hireDate: '2019-03-15', status: 'Active' },
          { employeeId: '1002', name: 'Maria Santos', department: 'Human Resources', position: 'HR Officer', hireDate: '03/22/2020', status: 'active' },
          { employeeId: '1003', name: 'Jose Rizal', department: 'FIN', position: 'Accountant', hireDate: '15-Jun-2018', status: 'Active' },
          { employeeId: '1004', name: 'Ana Reyes', department: 'Operations', position: 'Operations Lead', hireDate: 'March 1, 2021', status: 'Active' },
          { employeeId: '1004', name: 'Ana Reyes', department: 'OPS', position: 'Operations Lead', hireDate: '2021-03-01', status: 'Active' },
          { employeeId: '1005', name: 'Pedro Penduko', department: 'I.T.', position: 'Network Engineer', hireDate: '2022-07-11', status: 'Active' },
          { employeeId: '1006', name: 'Liza Soberano', department: 'Finance', position: 'Financial Analyst', hireDate: '2023-01-09', status: 'On Leave' },
          { employeeId: '1007', name: 'Carlo Mendoza', department: 'ops', position: 'Warehouse Supervisor', hireDate: '31/12/2020', status: 'Active' },
          { employeeId: '1008', name: 'Grace Lim', department: 'Information Technology', position: 'Data Engineer', hireDate: '2020-11-30', status: 'Active' },
          { employeeId: '1009', name: 'Ramon Bautista', department: 'Lab', position: 'Medical Technologist', hireDate: '2017-05-20', status: 'Inactive' },
          { employeeId: '1010', name: 'Teresa Aquino', department: 'Marketing', position: 'Marketing Specialist', hireDate: '2024-02-05', status: 'Active' },
        ]),
      },
      payroll: {
        id: 'payroll',
        name: 'Payroll Database',
        system: 'Oracle · Payroll ERP',
        owner: 'Finance',
        steward: 'Jose Rizal',
        role: 'Compensation and pay runs',
        fields: ['empId', 'fullName', 'monthlySalary', 'currency', 'payDate'],
        records: withIds('payroll', [
          { empId: '1001', fullName: 'JUAN DELA CRUZ', monthlySalary: '25,000', currency: 'PHP', payDate: '09/30/2026' },
          { empId: '1002', fullName: 'maria santos', monthlySalary: '28000', currency: 'PHP', payDate: '2026-09-30' },
          { empId: '1003', fullName: 'JOSE P. RIZAL', monthlySalary: '₱32,500.00', currency: 'PHP', payDate: '30-Sep-2026' },
          { empId: '1004', fullName: 'Ana Reyes', monthlySalary: '35000', currency: 'PHP', payDate: '2026-09-30' },
          { empId: '1005', fullName: 'Pedro Penduko', monthlySalary: '-500', currency: 'PHP', payDate: '2026-09-30' },
          { empId: '1006', fullName: 'Liza Soberano', monthlySalary: '30000', currency: 'PHP', payDate: '2026-09-30' },
          { empId: '1007', fullName: 'Carlo Mendoza', monthlySalary: '27000', currency: 'PHP', payDate: 'Sep 30, 2026' },
          { empId: '1008', fullName: 'Grace Lim', monthlySalary: '45,000', currency: 'PHP', payDate: '2026-09-30' },
          { empId: '1008', fullName: 'Grace Lim', monthlySalary: '45,000', currency: 'PHP', payDate: '2026-09-30' },
          { empId: '1009', fullName: 'Ramon Bautista', monthlySalary: '31000', currency: 'PHP', payDate: '2026-09-30' },
          { empId: '1099', fullName: 'Mark Tan', monthlySalary: '22000', currency: 'PHP', payDate: '2026-09-30' },
        ]),
      },
      attendance: {
        id: 'attendance',
        name: 'Attendance System',
        system: 'Biometric T&A · REST API',
        owner: 'Operations',
        steward: 'Ana Reyes',
        role: 'Daily time and attendance',
        fields: ['emp_id', 'employee', 'daysPresent', 'month'],
        records: withIds('attendance', [
          { emp_id: '1001', employee: 'Juan D. Cruz', daysPresent: '22', month: '2026-09' },
          { emp_id: '1002', employee: 'Maria Santos', daysPresent: '21', month: 'Sep 2026' },
          { emp_id: '1003', employee: 'Jose Rizal', daysPresent: '20', month: '2026-09' },
          { emp_id: '1004', employee: 'A. Reyes', daysPresent: '22', month: '09/2026' },
          { emp_id: '1005', employee: 'Pedro Penduko', daysPresent: '15', month: '2026-09' },
          { emp_id: '1007', employee: 'Carlo Mendoza', daysPresent: '35', month: '2026-09' },
          { emp_id: '1008', employee: 'Grace Lim', daysPresent: '23', month: '2026-09' },
          { emp_id: '1009', employee: 'Ramon Bautista', daysPresent: '4', month: '2026-09' },
          { emp_id: '1010', employee: 'Teresa Aquino', daysPresent: '19', month: 'September 2026' },
          { emp_id: '1011', employee: '', daysPresent: '20', month: '2026-09' },
        ]),
      },
    },
    warehouse: { employees: [], loadedAt: null, runId: null },
    etlRuns: [],
    auditLog: [],
    users: createDefaultUsers(),
    counters: { run: 1, audit: 1, record: 100, user: DEMO_ACCOUNTS.length + 1 },
  };
}
