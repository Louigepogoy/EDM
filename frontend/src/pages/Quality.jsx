import { useState } from 'react';
import { useApi } from '../session.jsx';
import { Async, Card, PageHeader, ScoreBar, Stat, fmt, scoreTone } from '../ui.jsx';

export default function Quality() {
  const state = useApi('/quality');
  const [source, setSource] = useState('all');

  return (
    <>
      <PageHeader
        title="Data Quality Management"
        subtitle="Accuracy, consistency and reliability — measured on the raw source systems."
        actions={
          <button className="btn btn-ghost" onClick={state.reload}>
            ↻ Re-evaluate
          </button>
        }
      />
      <Async state={state}>
        {(q) => {
          const issues = source === 'all' ? q.issues : q.issues.filter((i) => i.source === source);
          return (
            <>
              <div className="stats">
                <Stat label="Overall source quality" value={`${q.overall}%`} tone={scoreTone(q.overall)} hint="Average of 5 dimensions" />
                <Stat label="Open issues" value={q.issues.length} hint="Across all source systems" />
                <Stat
                  label="Warehouse completeness"
                  value={q.warehouse.records ? `${q.warehouse.completeness}%` : '—'}
                  tone={q.warehouse.records ? scoreTone(q.warehouse.completeness) : undefined}
                  hint={`${q.warehouse.complete} of ${q.warehouse.records} records analytics-ready`}
                />
                <Stat label="Evaluated" value={fmt.dateTime(q.evaluatedAt)} />
              </div>

              <div className="grid-2">
                <Card title="Quality dimensions">
                  <div className="stack">
                    {q.dimensions.map((d) => (
                      <ScoreBar key={d.key} label={d.label} score={d.score} description={d.description} />
                    ))}
                  </div>
                </Card>

                <Card title="By source system">
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Source</th>
                          <th className="num">Records</th>
                          <th className="num">Completeness</th>
                          <th className="num">Validity</th>
                          <th className="num">Uniqueness</th>
                        </tr>
                      </thead>
                      <tbody>
                        {q.sources.map((s) => (
                          <tr key={s.id}>
                            <td>{s.name}</td>
                            <td className="num">{s.records}</td>
                            {['completeness', 'validity', 'uniqueness'].map((k) => (
                              <td key={k} className={`num text-${scoreTone(s[k])}`}>
                                {s[k]}%
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="muted small">
                    Quality checks run automatically: missing fields, unparseable dates, invalid amounts, out-of-range
                    values, unknown codes and duplicate IDs.
                  </p>
                </Card>
              </div>

              <Card
                title={`Issues (${issues.length})`}
                actions={
                  <select value={source} onChange={(e) => setSource(e.target.value)}>
                    <option value="all">All sources</option>
                    {q.sources.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                }
              >
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Source</th>
                        <th>Record</th>
                        <th>Problem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {issues.map((i, idx) => (
                        <tr key={idx}>
                          <td>{i.sourceName}</td>
                          <td className="mono">{i.recordId}</td>
                          <td>{i.problem}</td>
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
