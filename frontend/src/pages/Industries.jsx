import { useApi } from '../session.jsx';
import { Async, Card, PageHeader } from '../ui.jsx';

const BEST_PRACTICES = [
  'Start with business outcomes, not just tech.',
  'Bake in governance early (security, compliance).',
  'Automate quality checks (metadata, monitoring).',
  'Design for scale (multi-cloud, mergers, evolving sources).',
  'Measure success by outcomes (improved workflows, compliance), not just data movement.',
];

const HEALTHCARE_EXAMPLE = [
  { name: 'Integration', text: 'EMR (Electronic Medical Records) + LIS (Lab Information System) + Billing.' },
  { name: 'Governance', text: 'HIPAA compliance, role-based access, audit logs.' },
  { name: 'DQM', text: 'Validate patient IDs, cleanse duplicates, ensure timestamp consistency.' },
  { name: 'Outcome', text: 'Trusted, compliant, usable data for lab operations and reporting.' },
];

const HEALTHCARE_SOURCES = ['Electronic Medical Records (EMR)', 'Lab Information System (LIS)', 'Billing System'];
const HUB_METHODS = ['Change Data Capture', 'ETL / ELT', 'API', 'Data Quality & Governance'];
const HEALTHCARE_OUTPUTS = ['Patient Records', 'Lab Results', 'Billing & Invoices', 'Compliance & Reports'];
const HEALTHCARE_CONSUMERS = ['Analytics & BI', 'AI & ML', 'Compliance Reporting'];

function HealthcareFlow() {
  return (
    <div className="hc-flow">
      <div className="hc-col">
        {HEALTHCARE_SOURCES.map((s) => (
          <div key={s} className="flow-box">
            <strong>{s}</strong>
          </div>
        ))}
      </div>
      <div className="hc-link">
        <small>Real-time data sync</small>
        <span>→</span>
      </div>
      <div className="hc-hub">
        <strong>Data Integration Hub</strong>
        <div className="hc-methods">
          {HUB_METHODS.map((m) => (
            <span key={m}>{m}</span>
          ))}
        </div>
        <div className="hc-down">▼</div>
        <div className="hc-consumers">
          {HEALTHCARE_CONSUMERS.map((c) => (
            <span key={c}>{c}</span>
          ))}
        </div>
      </div>
      <div className="hc-link">
        <span>→</span>
      </div>
      <div className="hc-col">
        {HEALTHCARE_OUTPUTS.map((o) => (
          <div key={o} className="flow-box hc-output">
            <strong>{o}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Industries() {
  const state = useApi('/industries');

  return (
    <>
      <PageHeader title="Industry Cases" subtitle="How EDM integration applies across five industries." />
      <Async state={state}>
        {({ industries, methods }) => (
          <>
            <Card title="Healthcare / Lab Example">
              <ul className="point-list">
                {HEALTHCARE_EXAMPLE.map((h) => (
                  <li key={h.name}>
                    <strong>{h.name}:</strong> {h.text}
                  </li>
                ))}
              </ul>
              <h3>Healthcare Data Integration Flow</h3>
              <HealthcareFlow />
            </Card>

            <h2>Five case situations across different industries</h2>
            <div className="industry-grid">
              {industries.map((i) => (
                <Card key={i.id} title={i.name} className="industry">
                  <dl>
                    <dt>Data sources</dt>
                    <dd>{i.dataSources.join(', ')}</dd>
                    <dt>Integration goal</dt>
                    <dd>{i.goal}</dd>
                    <dt>Challenge</dt>
                    <dd>{i.challenge}</dd>
                  </dl>
                </Card>
              ))}
            </div>

            <Card title="Comparison">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Industry</th>
                      <th>Data sources</th>
                      <th>Integration methods</th>
                      <th>Governance needs</th>
                      <th>Outputs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {industries.map((i) => (
                      <tr key={i.id}>
                        <td>
                          <strong>{i.name}</strong>
                        </td>
                        <td>{i.dataSources.join(', ')}</td>
                        <td>
                          <div className="chips">
                            {i.integrationMethods.map((m) => (
                              <span key={m} className="chip">
                                {m}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td>{i.governance.join(', ')}</td>
                        <td>{i.outputs.join(', ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <div className="grid-2">
              <Card title="Integration methods">
                <ul className="method-list">
                  {methods.map((m) => (
                    <li key={m.name}>
                      <strong>{m.name}</strong> <span className="muted">— {m.full}</span>
                      <div>{m.use}</div>
                    </li>
                  ))}
                </ul>
              </Card>
              <Card title="Best practices">
                <ol className="log">
                  {BEST_PRACTICES.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ol>
              </Card>
            </div>
          </>
        )}
      </Async>
    </>
  );
}
