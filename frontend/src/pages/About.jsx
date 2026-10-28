import { Card, PageHeader } from '../ui.jsx';

const WHY_IT_MATTERS = ['Reliable analytics', 'Compliance with regulations', 'AI readiness', 'Better customer/patient experience'];

const CORE_CONCEPTS = [
  { name: 'Integration', text: 'Technical pipelines (ETL, APIs, CDC) unify data.', tone: 'int' },
  { name: 'Governance', text: 'Policies, ownership, and compliance frameworks.', tone: 'gov' },
  { name: 'DQM (Data Quality Management)', text: 'Ensures accuracy, consistency, and reliability.', tone: 'dqm' },
  { name: 'Together', text: 'Create a trusted enterprise data ecosystem.', tone: 'core' },
];

const BENEFITS = [
  { name: 'Improved Analytics', text: 'Consistent, cross-department insights.' },
  { name: 'Operational Efficiency', text: 'Less duplication, faster workflows.' },
  { name: 'Compliance & Security', text: 'Role-based access, encryption, audit trails.' },
  { name: 'AI Readiness', text: 'Reliable inputs for machine learning.' },
  { name: 'Customer/Patient 360° View', text: 'Unified records across systems.' },
];

const CHALLENGES = [
  { name: 'Fragmentation', text: 'Enterprises average ~897 apps.' },
  { name: 'Governance Gaps', text: 'Integration without rules = unreliable data.' },
  { name: 'Latency vs. Scale', text: 'Real-time vs. batch trade-offs.' },
  { name: 'AI Reliability Risks', text: 'Poor integration → untrustworthy outputs.' },
];

export default function About() {
  return (
    <>
      <PageHeader
        title="Enterprise Data Management (EDM) Integration"
        subtitle="Unifying Data for Governance, Quality, and Insights"
      />

      <Card title="Introduction">
        <ul className="bullets">
          <li>Enterprises run hundreds to thousands of apps → data silos.</li>
          <li>EDM integration: connects, consolidates, and governs data across systems.</li>
        </ul>
        <h3>Why it matters</h3>
        <div className="chips">
          {WHY_IT_MATTERS.map((w) => (
            <span key={w} className="chip">
              {w}
            </span>
          ))}
        </div>
      </Card>

      <Card title="Core Concepts">
        <div className="concept-grid">
          {CORE_CONCEPTS.map((c) => (
            <div key={c.name} className={`concept layer-${c.tone}`}>
              <strong>{c.name}</strong>
              <span>{c.text}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card title="ETL – Extract Transform Load">
        <p>
          It is a process of taking data from different sources, cleaning and converting it into a consistent format, and
          then putting it into a target system such as a <strong>data warehouse</strong>.
        </p>
        <div className="concept-grid">
          <div className="concept">
            <strong>Extract</strong>
            <span>Collecting data from different sources.</span>
          </div>
          <div className="concept">
            <strong>Transform</strong>
            <span>The extracted data is cleaned, standardized, and converted.</span>
          </div>
          <div className="concept">
            <strong>Load</strong>
            <span>The transformed data is loaded into a target system.</span>
          </div>
        </div>
      </Card>

      <div className="grid-2">
        <Card title="Benefits of EDM Integration" className="card-good">
          <ul className="point-list">
            {BENEFITS.map((b) => (
              <li key={b.name}>
                <strong>{b.name}:</strong> {b.text}
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Challenges" className="card-bad">
          <ul className="point-list">
            {CHALLENGES.map((c) => (
              <li key={c.name}>
                <strong>{c.name}:</strong> {c.text}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
