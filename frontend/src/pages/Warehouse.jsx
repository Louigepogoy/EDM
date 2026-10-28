import { Fragment, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../session.jsx';
import { Async, Badge, Card, FlagBadge, Notice, PageHeader, SOURCE_LABELS, fmt } from '../ui.jsx';

const Masked = () => <span className="masked" title="Masked by governance policy GOV-03">••••••</span>;

export default function Warehouse() {
  const state = useApi('/warehouse/employees');

  return (
    <>
      <PageHeader title="Data Warehouse" subtitle="Load — one unified, standardised record per employee." />
      <Async state={state}>{(data) => <EmployeeTable data={data} />}</Async>
    </>
  );
}

function EmployeeTable({ data }) {
  const [query, setQuery] = useState('');
  const [dept, setDept] = useState('all');
  const [expanded, setExpanded] = useState(null);

  const departments = useMemo(
    () => [...new Set(data.employees.map((e) => e.department || 'Unmapped'))].sort(),
    [data.employees]
  );

  const rows = data.employees.filter((e) => {
    const q = query.trim().toLowerCase();
    const matchesQuery = !q || e.name.toLowerCase().includes(q) || e.employeeId.includes(q) || (e.position || '').toLowerCase().includes(q);
    const matchesDept = dept === 'all' || (e.department || 'Unmapped') === dept;
    return matchesQuery && matchesDept;
  });

  if (!data.loadedAt) {
    return (
      <Notice tone="warn">
        The warehouse is empty. Run the <Link to="/pipeline">ETL pipeline</Link> to load it.
      </Notice>
    );
  }

  const money = (n, e) => (data.masked ? <Masked /> : fmt.money(n, e.currency));

  return (
    <>
      <div className="meta-row">
        <span>
          <small>Loaded</small>
          {fmt.dateTime(data.loadedAt)}
        </span>
        <span>
          <small>From run</small>
          <span className="mono">{data.runId}</span>
        </span>
        <span>
          <small>Records</small>
          {data.employees.length}
        </span>
        <span>
          <small>Salary fields</small>
          {data.masked ? <Badge tone="warn">masked for your role</Badge> : <Badge tone="good">visible</Badge>}
        </span>
      </div>

      <Card
        title={`Unified employees (${rows.length})`}
        actions={
          <div className="filters">
            <input placeholder="Search name, ID, position…" value={query} onChange={(e) => setQuery(e.target.value)} />
            <select value={dept} onChange={(e) => setDept(e.target.value)}>
              <option value="all">All departments</option>
              {departments.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </div>
        }
      >
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Department</th>
                <th>Position</th>
                <th>Hire date</th>
                <th>Status</th>
                <th className="num">Monthly salary</th>
                <th className="num">Days present</th>
                <th className="num">Attendance</th>
                <th className="num">Est. pay</th>
                <th>Flags</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <Fragment key={e.employeeId}>
                  <tr className="clickable" onClick={() => setExpanded(expanded === e.employeeId ? null : e.employeeId)}>
                    <td className="mono">{e.employeeId}</td>
                    <td>
                      <strong>{e.name}</strong>
                    </td>
                    <td>{e.department ? `${e.department} (${e.departmentCode})` : <Badge tone="warn">unmapped</Badge>}</td>
                    <td>{e.position || '—'}</td>
                    <td>{e.hireDate || <Badge tone="bad">invalid</Badge>}</td>
                    <td className="capitalize">{e.status || '—'}</td>
                    <td className="num">{money(e.monthlySalary, e)}</td>
                    <td className="num">{e.daysPresent ?? '—'}</td>
                    <td className="num">{fmt.pct(e.attendanceRate)}</td>
                    <td className="num">{money(e.estimatedPay, e)}</td>
                    <td>
                      <div className="badges">
                        {e.flags.map((f) => (
                          <FlagBadge key={f} flag={f} />
                        ))}
                      </div>
                    </td>
                  </tr>
                  {expanded === e.employeeId && (
                    <tr className="row-detail">
                      <td colSpan={11}>
                        <div className="detail-grid">
                          <span>
                            <small>Lineage</small>
                            {e.lineage.map((s) => SOURCE_LABELS[s]).join(' + ')}
                          </span>
                          <span>
                            <small>Daily rate</small>
                            {money(e.dailyRate, e)}
                          </span>
                          <span>
                            <small>Pay date</small>
                            {e.payDate || '—'}
                          </span>
                          <span>
                            <small>Attendance period</small>
                            {e.month || '—'}
                          </span>
                          <span>
                            <small>Analytics-ready</small>
                            {e.complete ? <Badge tone="good">complete</Badge> : <Badge tone="warn">partial</Badge>}
                          </span>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="What the warehouse is used for">
        <div className="chips">
          {['Management reports', 'Business intelligence', 'Dashboards', 'Data analytics', 'Decision support'].map((u) => (
            <span key={u} className="chip">
              {u}
            </span>
          ))}
        </div>
      </Card>
    </>
  );
}
