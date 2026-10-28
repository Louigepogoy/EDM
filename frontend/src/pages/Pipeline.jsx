import { useState } from 'react';
import { api } from '../api.js';
import { useApi, useSession } from '../session.jsx';
import { Async, Badge, Card, Notice, PageHeader, SeverityBadge, SOURCE_LABELS, fmt } from '../ui.jsx';

const STAGES = [
  { key: 'extract', title: 'Extract', blurb: 'Collect data from different sources.' },
  { key: 'transform', title: 'Transform', blurb: 'Clean, standardise and convert.' },
  { key: 'load', title: 'Load', blurb: 'Write into the data warehouse.' },
];

const STATUS_TONES = { success: 'good', completed_with_warnings: 'warn', completed_with_errors: 'bad' };
const RunStatus = ({ status }) => <Badge tone={STATUS_TONES[status]}>{status.replaceAll('_', ' ')}</Badge>;

export default function Pipeline() {
  const { can } = useSession();
  const runs = useApi('/etl/runs');
  const [selected, setSelected] = useState(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);

  const run = async () => {
    setRunning(true);
    setError(null);
    try {
      const result = await api('/etl/run', { method: 'POST' });
      setSelected(result.id);
      await runs.reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setRunning(false);
    }
  };

  const runButton = can('etl:run') ? (
    <button className="btn" onClick={run} disabled={running}>
      {running ? 'Running…' : '▶ Run ETL pipeline'}
    </button>
  ) : (
    <Badge>Your role cannot run pipelines</Badge>
  );

  return (
    <>
      <PageHeader
        title="ETL Pipeline"
        subtitle="Extract → Transform → Load: turning siloed records into one trusted employee view."
        actions={runButton}
      />
      {error && <Notice tone="bad">{error}</Notice>}
      <Async state={runs}>
        {(list) => {
          const currentId = selected ?? list[0]?.id;
          return list.length === 0 ? (
            <>
              <Flow stats={null} />
              <Notice>No pipeline runs yet. {can('etl:run') ? 'Click “Run ETL pipeline” to start.' : ''}</Notice>
            </>
          ) : (
            <>
              <RunDetail key={currentId} id={currentId} />
              <Card title="Run history">
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Run</th>
                        <th>Finished</th>
                        <th>Triggered by</th>
                        <th>Status</th>
                        <th>Loaded</th>
                        <th>Complete</th>
                        <th>Errors / warnings</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((r) => (
                        <tr
                          key={r.id}
                          className={`clickable ${r.id === currentId ? 'row-selected' : ''}`}
                          onClick={() => setSelected(r.id)}
                        >
                          <td className="mono">{r.id}</td>
                          <td>{fmt.dateTime(r.finishedAt)}</td>
                          <td>
                            {r.triggeredBy} <span className="muted">({r.role})</span>
                          </td>
                          <td>
                            <RunStatus status={r.status} />
                          </td>
                          <td>{r.stats.loaded}</td>
                          <td>{r.stats.complete}</td>
                          <td>
                            {r.stats.errors} / {r.stats.warnings}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          );
        }}
      </Async>
    </>
  );
}

function Flow({ stats }) {
  return (
    <div className="flow">
      <div className="flow-sources">
        {Object.entries(SOURCE_LABELS).map(([key, label]) => (
          <div key={key} className="flow-box">
            <strong>{label}</strong>
            <small>{stats ? `${stats.extracted[key]} extracted` : 'source'}</small>
          </div>
        ))}
      </div>
      <div className="flow-arrow">→</div>
      <div className="flow-box flow-etl">
        <strong>ETL</strong>
        <small>{stats ? `${stats.duplicatesRemoved} dupes · ${stats.rejected} rejected · ${stats.orphans} orphans` : 'extract · transform · load'}</small>
      </div>
      <div className="flow-arrow">→</div>
      <div className="flow-box flow-dw">
        <strong>Data Warehouse</strong>
        <small>{stats ? `${stats.loaded} loaded · ${stats.complete} complete` : 'target'}</small>
      </div>
    </div>
  );
}

function RunDetail({ id }) {
  const state = useApi(`/etl/runs/${id}`);
  const [severity, setSeverity] = useState('all');

  return (
    <Async state={state}>
      {(run) => {
        const issues = severity === 'all' ? run.issues : run.issues.filter((i) => i.severity === severity);
        return (
          <>
            <Flow stats={run.stats} />

            <div className="meta-row">
              <span>
                <small>Run</small>
                <span className="mono">{run.id}</span>
              </span>
              <span>
                <small>Status</small>
                <RunStatus status={run.status} />
              </span>
              <span>
                <small>Finished</small>
                {fmt.dateTime(run.finishedAt)}
              </span>
              <span>
                <small>Duration</small>
                {run.durationMs} ms
              </span>
              <span>
                <small>Triggered by</small>
                {run.triggeredBy}
              </span>
            </div>

            <div className="grid-3">
              {STAGES.map((s) => (
                <Card key={s.key} title={s.title} className={`stage stage-${s.key}`}>
                  <p className="muted">{s.blurb}</p>
                  <ol className="log">
                    {run.logs
                      .filter((l) => l.stage === s.key)
                      .map((l, i) => (
                        <li key={i}>{l.message}</li>
                      ))}
                  </ol>
                </Card>
              ))}
            </div>

            <Card title="Name standardisation (matched by employee ID)">
              <p className="muted">
                The same person is spelled differently in each system. HR is the system of record, so its standardised
                name wins; other spellings are matched with a confidence score.
              </p>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Employee ID</th>
                      <th>Before (per system)</th>
                      <th>After</th>
                    </tr>
                  </thead>
                  <tbody>
                    {run.nameResolutions.map((n) => (
                      <tr key={n.employeeId}>
                        <td className="mono">{n.employeeId}</td>
                        <td>
                          <ul className="variants">
                            {n.variants.map((v) => (
                              <li key={v.source}>
                                <span className="muted">{SOURCE_LABELS[v.source]}:</span> {v.value}{' '}
                                {v.source !== 'hr' && (
                                  <Badge tone={v.confidence >= 0.9 ? 'good' : v.confidence >= 0.6 ? 'warn' : 'bad'}>
                                    {Math.round(v.confidence * 100)}% match
                                  </Badge>
                                )}
                              </li>
                            ))}
                          </ul>
                        </td>
                        <td>
                          <strong>{n.resolvedName}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card
              title={`Issues found (${run.issues.length})`}
              actions={
                <select value={severity} onChange={(e) => setSeverity(e.target.value)}>
                  <option value="all">All severities</option>
                  <option value="error">Errors</option>
                  <option value="warning">Warnings</option>
                  <option value="info">Info</option>
                </select>
              }
            >
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Severity</th>
                      <th>Source</th>
                      <th>Record</th>
                      <th>Issue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {issues.map((i, idx) => (
                      <tr key={idx}>
                        <td>
                          <SeverityBadge severity={i.severity} />
                        </td>
                        <td>{SOURCE_LABELS[i.source]}</td>
                        <td className="mono">{i.recordId}</td>
                        <td>{i.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        );
      }}
    </Async>
  );
}
