import { useState } from 'react';
import { api } from '../api.js';
import { useApi, useSession } from '../session.jsx';
import { Async, Badge, Card, Notice, PageHeader } from '../ui.jsx';

export default function Sources() {
  const { can } = useSession();
  const [active, setActive] = useState('hr');
  const list = useApi('/sources');

  return (
    <>
      <PageHeader
        title="Source Systems"
        subtitle="Extract — raw data exactly as each siloed system stores it, problems included."
      />
      <Async state={list}>
        {(sources) => (
          <>
            <div className="tabs">
              {sources.map((s) => (
                <button key={s.id} className={`tab ${active === s.id ? 'active' : ''}`} onClick={() => setActive(s.id)}>
                  {s.name} <span className="count">{s.recordCount}</span>
                </button>
              ))}
            </div>
            <SourceDetail key={active} id={active} canWrite={can('sources:write')} onChange={list.reload} />
          </>
        )}
      </Async>
    </>
  );
}

function SourceDetail({ id, canWrite, onChange }) {
  const state = useApi(`/sources/${id}`);
  const [error, setError] = useState(null);

  const refresh = () => {
    state.reload();
    onChange();
  };

  const remove = async (rid) => {
    setError(null);
    try {
      await api(`/sources/${id}/records/${rid}`, { method: 'DELETE' });
      refresh();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Async state={state}>
      {(src) => (
        <>
          <div className="meta-row">
            <span>
              <small>System</small>
              {src.system}
            </span>
            <span>
              <small>Owner</small>
              {src.owner}
            </span>
            <span>
              <small>Data steward</small>
              {src.steward}
            </span>
            <span>
              <small>Role</small>
              {src.role}
            </span>
          </div>

          {error && <Notice tone="bad">{error}</Notice>}

          <Card title={`${src.records.length} raw records`}>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    {src.fields.map((f) => (
                      <th key={f}>{f}</th>
                    ))}
                    <th>Validation</th>
                    {canWrite && <th />}
                  </tr>
                </thead>
                <tbody>
                  {src.records.map((r) => (
                    <tr key={r._rid} className={r._problems.length ? 'row-warn' : ''}>
                      {src.fields.map((f) => (
                        <td key={f} className={f === src.idField ? 'mono' : ''}>
                          {r[f] === '' || r[f] == null ? <span className="muted">(empty)</span> : r[f]}
                        </td>
                      ))}
                      <td>
                        {r._problems.length === 0 ? (
                          <Badge tone="good">valid</Badge>
                        ) : (
                          <ul className="problems">
                            {r._problems.map((p) => (
                              <li key={p}>{p}</li>
                            ))}
                          </ul>
                        )}
                      </td>
                      {canWrite && (
                        <td>
                          <button className="btn btn-ghost btn-sm" onClick={() => remove(r._rid)}>
                            Delete
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {canWrite ? (
            <AddRecord source={src} onAdded={refresh} />
          ) : (
            <Notice>Only administrators can add or delete source records.</Notice>
          )}
        </>
      )}
    </Async>
  );
}

function AddRecord({ source, onAdded }) {
  const empty = Object.fromEntries(source.fields.map((f) => [f, '']));
  const [form, setForm] = useState(empty);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api(`/sources/${source.id}/records`, { method: 'POST', body: form });
      setForm(empty);
      onAdded();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title={`Add a record to ${source.name}`}>
      <p className="muted">
        Try messy input — e.g. a lowercase name, a date like <code>March 5, 2024</code>, or a department like{' '}
        <code>i.t.</code> — then run the ETL pipeline to see it cleaned.
      </p>
      <form className="form-grid" onSubmit={submit}>
        {source.fields.map((f) => (
          <label key={f}>
            <span>
              {f}
              {f === source.idField && ' *'}
            </span>
            <input value={form[f]} onChange={(e) => setForm({ ...form, [f]: e.target.value })} />
          </label>
        ))}
        <div className="form-actions">
          <button className="btn" disabled={busy}>
            {busy ? 'Adding…' : 'Add record'}
          </button>
        </div>
      </form>
      {error && <Notice tone="bad">{error}</Notice>}
    </Card>
  );
}
