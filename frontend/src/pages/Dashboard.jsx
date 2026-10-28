import { Link } from 'react-router-dom';
import { useApi } from '../session.jsx';
import { Async, Card, FlagBadge, Notice, PageHeader, ScoreBar, Stat, fmt, scoreTone } from '../ui.jsx';

const LAYERS = [
  { name: 'Data Quality Management', items: ['Cleansing', 'Validation', 'Monitoring'], tone: 'dqm' },
  { name: 'Data Governance', items: ['Policies', 'Security', 'Compliance'], tone: 'gov' },
  { name: 'Data Integration', items: ['ETL / ELT', 'API & CDC', 'Data Virtualization'], tone: 'int' },
];

export default function Dashboard() {
  const state = useApi('/dashboard');

  return (
    <>
      <PageHeader
        title="Enterprise Data Management"
        subtitle="Unifying HR, Payroll and Attendance data for governance, quality and insights."
      />
      <Async state={state}>
        {(d) => (
          <>
            {!d.lastRun && (
              <Notice tone="warn">
                The data warehouse is empty. Open the <Link to="/pipeline">ETL Pipeline</Link> and run it to integrate the
                source systems.
              </Notice>
            )}

            <div className="stats">
              <Stat label="Source systems" value={d.sources.length} hint={`${d.rawRecords} raw records`} />
              <Stat
                label="Warehouse records"
                value={d.warehouse.records}
                hint={`${d.warehouse.complete} complete · loaded ${fmt.dateTime(d.warehouse.loadedAt)}`}
              />
              <Stat
                label="Source data quality"
                value={`${d.quality.overall}%`}
                hint={`${d.quality.issues} open issues`}
                tone={scoreTone(d.quality.overall)}
              />
              <Stat
                label="Last pipeline run"
                value={d.lastRun ? d.lastRun.id : '—'}
                hint={d.lastRun ? `${d.lastRun.status.replaceAll('_', ' ')} · ${fmt.dateTime(d.lastRun.finishedAt)}` : 'Never run'}
              />
            </div>

            <div className="grid-2">
              <Card title="EDM architecture">
                <div className="arch">
                  {LAYERS.map((l) => (
                    <div key={l.name} className={`arch-layer layer-${l.tone}`}>
                      <strong>{l.name}</strong>
                      <span>{l.items.join(' · ')}</span>
                    </div>
                  ))}
                  <div className="arch-arrow">▼</div>
                  <div className="arch-core">Unified &amp; Trusted Data</div>
                  <div className="arch-sources">
                    {d.sources.map((s) => (
                      <div key={s.id} className="arch-source">
                        <strong>{s.name}</strong>
                        <small>{s.system}</small>
                        <small>{s.recordCount} records</small>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

              <Card title="Data quality dimensions" actions={<Link to="/quality">Details →</Link>}>
                <div className="stack">
                  {d.quality.dimensions.map((dim) => (
                    <ScoreBar key={dim.key} label={dim.label} score={dim.score} />
                  ))}
                </div>
              </Card>
            </div>

            <div className="grid-2">
              <Card title="Employees by department">
                {Object.keys(d.departments).length === 0 ? (
                  <p className="muted">No data loaded yet.</p>
                ) : (
                  <div className="stack">
                    {Object.entries(d.departments)
                      .sort((a, b) => b[1] - a[1])
                      .map(([dept, count]) => (
                        <div key={dept} className="hbar">
                          <span>{dept}</span>
                          <div className="bar">
                            <div className="bar-fill fill-accent" style={{ width: `${(count / d.warehouse.records) * 100}%` }} />
                          </div>
                          <strong>{count}</strong>
                        </div>
                      ))}
                  </div>
                )}
              </Card>

              <Card title="Business rule flags" actions={<Link to="/warehouse">Warehouse →</Link>}>
                {Object.keys(d.flags).length === 0 ? (
                  <p className="muted">No flags raised.</p>
                ) : (
                  <ul className="flag-list">
                    {Object.entries(d.flags).map(([flag, count]) => (
                      <li key={flag}>
                        <FlagBadge flag={flag} />
                        <strong>{count}</strong>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          </>
        )}
      </Async>
    </>
  );
}
