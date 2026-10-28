# EDM Integration Hub

An Enterprise Data Management (EDM) integration system: **Express.js** API + **React** (Vite) UI.

It integrates three siloed, deliberately messy source systems — **HR**, **Payroll** and **Attendance** — through a real
ETL pipeline into a unified data warehouse, with data quality management and role-based governance.

## Run it

```bash
npm run install:all   # installs root, backend and frontend
npm run dev           # API on :4000, UI on http://localhost:5173
```

Production: `npm run build && npm start` — Express serves the built UI at http://localhost:4000.

## Features

| Page | What it shows |
| --- | --- |
| **Dashboard** | EDM architecture (DQM → Governance → Integration → Unified data), KPIs, quality dimensions, business-rule flags |
| **About EDM** | Introduction, core concepts, ETL definition, benefits, challenges |
| **Source Systems** | Raw records per system with live validation; admins can add or delete records |
| **ETL Pipeline** | Run Extract → Transform → Load, stage logs, name before/after resolution, issues, run history |
| **Data Warehouse** | Unified employee records with lineage, calculated values and flags; salary masked for viewers |
| **Data Quality** | Completeness, validity, uniqueness, consistency, referential integrity; issue list |
| **Governance** | Policies, role/permission matrix, data owners & stewards, audit trail, demo reset |
| **Industry Cases** | Healthcare / Lab example + integration flow diagram, five industry cases, comparison table, methods, best practices |

### What the Transform step does
- Maps `employeeId` / `empId` / `emp_id` to one canonical schema
- Removes duplicates, rejects records with no ID or name, quarantines orphans with no HR match
- Standardises names (`JUAN DELA CRUZ`, `Juan D. Cruz` → `Juan Dela Cruz`) with match confidence
- Converts dates (`03/22/2020`, `15-Jun-2018`, `March 1, 2021`) to ISO 8601
- Standardises department codes (`I.T.`, `Information Technology` → `IT`)
- Calculates daily rate, attendance rate and estimated pay
- Applies business rules (perfect/low attendance, inactive but clocking in, missing data)

### Accounts & roles
Sign up at `/register` or log in at `/login`. Passwords are hashed with bcrypt; sessions use JWTs that expire after 8 hours.

Demo accounts are created on first start (they are not shown on the login page — type them in):

| Name | Email | Password | Role |
| --- | --- | --- | --- |
| System Administrator | `admin@edm.local` | `Admin@12345` | Admin |
| Dana Cruz | `analyst@edm.local` | `Analyst@123` | Analyst |
| Maria Santos | `maria.santos@edm.local` | `Maria@1234` | Analyst |
| Vic Ramos | `viewer@edm.local` | `Viewer@123` | Viewer |
| Grace Lim | `grace.lim@edm.local` | `Grace@1234` | Viewer |

These passwords are in the source code — fine for a demo, but remove `DEMO_ACCOUNTS` from `backend/src/seed.js`
before using real data.

New accounts start as **Viewer**. Admins promote users in **Governance → User accounts**.

| | Admin | Analyst | Viewer |
| --- | :-: | :-: | :-: |
| View raw sources | ✔ | ✔ | |
| Edit sources / reset | ✔ | | |
| Run ETL | ✔ | ✔ | |
| Unmasked salaries | ✔ | ✔ | |
| Audit trail | ✔ | | |
| Manage users & roles | ✔ | | |

For production, set a `JWT_SECRET` environment variable (otherwise a random secret is generated and stored in `backend/data/db.json`).

## API

All endpoints except register/login need `Authorization: Bearer <token>`.

| Method | Path | Permission |
| --- | --- | --- |
| POST | `/api/auth/register`, `/api/auth/login` | public |
| POST | `/api/auth/logout`, `/api/auth/password` | signed in |
| GET | `/api/users` · PATCH `/api/users/:id` | `users:manage` |
| GET | `/api/me` | — |
| GET | `/api/dashboard` | — |
| GET | `/api/sources`, `/api/sources/:id` | `sources:read` |
| POST | `/api/sources/:id/records` | `sources:write` |
| DELETE | `/api/sources/:id/records/:rid` | `sources:write` |
| POST | `/api/etl/run` | `etl:run` |
| GET | `/api/etl/runs`, `/api/etl/runs/:id` | `etl:read` |
| GET | `/api/warehouse/employees` | `warehouse:read` |
| GET | `/api/quality` | `quality:read` |
| GET | `/api/governance` | — |
| GET | `/api/governance/audit` | `audit:read` |
| GET | `/api/industries` | — |
| POST | `/api/system/reset` | `system:reset` |

Data persists to `backend/data/db.json` (created from the seed on first start; delete it or use **Reset demo data** to start over).

## Structure

```
backend/src/
  server.js      routes
  auth.js        register, login, password change, JWT authentication
  etl.js         extract → transform → load engine
  rules.js       normalisation + validation rules (shared by ETL and DQM)
  quality.js     data quality scoring
  governance.js  roles, permissions, policies, masking, audit
  seed.js        messy source data
  industries.js  industry case content
frontend/src/
  App.jsx, session.jsx, api.js, ui.jsx, styles.css
  pages/         Auth (login/sign up), Account, Dashboard, About, Sources, Pipeline,
                 Warehouse, Quality, Governance, Industries
```
