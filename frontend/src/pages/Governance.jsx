import { useState } from 'react';
import { api } from '../api.js';
import { useApi, useSession } from '../session.jsx';
import { Async, Badge, Card, Notice, PageHeader, fmt } from '../ui.jsx';

const CATEGORY_TONES = { Security: 'bad', Compliance: 'info', Quality: 'good', Ownership: 'warn' };

export default function Governance() {
  const { user, can } = useSession();
  const role = user.role;
  const state = useApi('/governance');

  return (
    <>
      <PageHeader title="Data Governance" subtitle="Policies, ownership, role-based access and a complete audit trail." />
      <Async state={state}>
        {(g) => (
          <>
            <Card title="Policies">
              <div className="policy-grid">
                {g.policies.map((p) => (
                  <div key={p.id} className="policy">
                    <div className="policy-top">
                      <span className="mono muted">{p.id}</span>
                      <Badge tone={CATEGORY_TONES[p.category]}>{p.category}</Badge>
                    </div>
                    <strong>{p.name}</strong>
                    <p className="muted">{p.description}</p>
                  </div>
                ))}
              </div>
            </Card>

            <div className="grid-2">
              <Card title="Role-based access">
                <div className="table-wrap">
                  <table className="matrix">
                    <thead>
                      <tr>
                        <th>Permission</th>
                        {Object.entries(g.roles).map(([key, r]) => (
                          <th key={key} className={key === role ? 'current' : ''}>
                            {r.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(g.permissions).map(([key, p]) => (
                        <tr key={key}>
                          <td>
                            {p.label}
                            <div className="mono muted small">{key}</div>
                          </td>
                          {Object.keys(g.roles).map((r) => (
                            <td key={r} className={`center ${r === role ? 'current' : ''}`}>
                              {p.roles.includes(r) ? <span className="text-good">✔</span> : <span className="muted">—</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              <Card title="Data ownership">
                <div className="stack">
                  {g.owners.map((o) => (
                    <div key={o.id} className="owner">
                      <strong>{o.name}</strong>
                      <span className="muted">{o.role}</span>
                      <div className="owner-meta">
                        <span>
                          <small>Owner</small>
                          {o.owner}
                        </span>
                        <span>
                          <small>Steward</small>
                          {o.steward}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </>
        )}
      </Async>

      {can('users:manage') && <UserManagement />}
      {can('audit:read') ? <AuditLog /> : <Notice>The audit trail is visible to administrators only.</Notice>}
      {can('system:reset') && <ResetPanel />}
    </>
  );
}

function UserManagement() {
  const { user: me } = useSession();
  const state = useApi('/users');
  const roles = useApi('/governance');
  const [error, setError] = useState(null);

  const changeRole = async (id, role) => {
    setError(null);
    try {
      await api(`/users/${id}`, { method: 'PATCH', body: { role } });
      state.reload();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Card title="User accounts">
      <p className="muted">New sign-ups start as Viewer. Promote users here; changes apply on their next request.</p>
      {error && <Notice tone="bad">{error}</Notice>}
      <Async state={state}>
        {(users) => (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th>Last login</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      {u.name} {u.id === me.id && <Badge tone="info">you</Badge>}
                    </td>
                    <td>{u.email}</td>
                    <td>
                      <select
                        value={u.role}
                        disabled={u.id === me.id}
                        title={u.id === me.id ? "You can't change your own role" : undefined}
                        onChange={(e) => changeRole(u.id, e.target.value)}
                      >
                        {Object.entries(roles.data?.roles ?? { [u.role]: { label: u.role } }).map(([key, r]) => (
                          <option key={key} value={key}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="nowrap">{fmt.date(u.createdAt)}</td>
                    <td className="nowrap">{fmt.dateTime(u.lastLoginAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Async>
    </Card>
  );
}

function AuditLog() {
  const state = useApi('/governance/audit');
  const [outcome, setOutcome] = useState('all');

  return (
    <Card
      title="Audit trail"
      actions={
        <div className="filters">
          <select value={outcome} onChange={(e) => setOutcome(e.target.value)}>
            <option value="all">All outcomes</option>
            <option value="allowed">Allowed</option>
            <option value="denied">Denied</option>
          </select>
          <button className="btn btn-ghost btn-sm" onClick={state.reload}>
            ↻ Refresh
          </button>
        </div>
      }
    >
      <Async state={state}>
        {(log) => {
          const rows = outcome === 'all' ? log : log.filter((e) => e.outcome === outcome);
          return rows.length === 0 ? (
            <p className="muted">No audit entries yet.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>When</th>
                    <th>User</th>
                    <th>Action</th>
                    <th>Resource</th>
                    <th>Outcome</th>
                    <th>Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((e) => (
                    <tr key={e.id}>
                      <td className="nowrap">{fmt.dateTime(e.at)}</td>
                      <td>
                        {e.user} <span className="muted">({e.role})</span>
                      </td>
                      <td className="mono">{e.action}</td>
                      <td className="mono">{e.resource}</td>
                      <td>
                        <Badge tone={e.outcome === 'denied' ? 'bad' : 'good'}>{e.outcome}</Badge>
                      </td>
                      <td>{e.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }}
      </Async>
    </Card>
  );
}

function ResetPanel() {
  const [message, setMessage] = useState(null);

  const reset = async () => {
    if (!window.confirm('Restore all source data to the original seed and clear the warehouse, runs and audit log?')) return;
    try {
      await api('/system/reset', { method: 'POST' });
      setMessage({ tone: 'good', text: 'Demo data restored. Reload pages to see the original state.' });
    } catch (err) {
      setMessage({ tone: 'bad', text: err.message });
    }
  };

  return (
    <Card title="Administration">
      <p className="muted">Restore the messy seed data so the integration demo can be run again from scratch.</p>
      <button className="btn btn-danger" onClick={reset}>
        Reset demo data
      </button>
      {message && <Notice tone={message.tone}>{message.text}</Notice>}
    </Card>
  );
}
