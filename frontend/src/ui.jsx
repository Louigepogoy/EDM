import { useState } from 'react';

export function ThemeToggle({ className = 'btn btn-ghost btn-sm' }) {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'light');

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('edm.theme', next);
    } catch {}
    setTheme(next);
  };

  return (
    <button type="button" className={className} onClick={toggle} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
      {theme === 'dark' ? '☀ Light' : '☾ Dark'}
    </button>
  );
}

export const fmt = {
  money: (n, currency = 'PHP') =>
    n == null ? '—' : new Intl.NumberFormat('en-PH', { style: 'currency', currency, maximumFractionDigits: 2 }).format(n),
  date: (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—'),
  dateTime: (iso) => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—'),
  pct: (n) => (n == null ? '—' : `${n}%`),
};

export const scoreTone = (score) => (score >= 90 ? 'good' : score >= 75 ? 'warn' : 'bad');

export const SOURCE_LABELS = { hr: 'HR', payroll: 'Payroll', attendance: 'Attendance' };

export function PageHeader({ title, subtitle, actions }) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}

export function Card({ title, actions, children, className = '' }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <div className="card-head">
          {title && <h2>{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, hint, tone }) {
  return (
    <div className={`stat ${tone ? `tone-${tone}` : ''}`}>
      <span className="stat-label">{label}</span>
      <strong className="stat-value">{value}</strong>
      {hint && <span className="stat-hint">{hint}</span>}
    </div>
  );
}

export function ScoreBar({ label, score, description }) {
  return (
    <div className="score">
      <div className="score-top">
        <span>{label}</span>
        <strong className={`text-${scoreTone(score)}`}>{score}%</strong>
      </div>
      <div className="bar">
        <div className={`bar-fill fill-${scoreTone(score)}`} style={{ width: `${score}%` }} />
      </div>
      {description && <small className="muted">{description}</small>}
    </div>
  );
}

export function Badge({ tone = 'neutral', children }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

const FLAG_TONES = {
  'Perfect attendance': 'good',
  'Low attendance': 'warn',
  'Missing payroll': 'bad',
  'Missing attendance': 'warn',
  'Invalid salary': 'bad',
  'Invalid attendance': 'bad',
  'Inactive but clocking in': 'bad',
  'Unmapped department': 'warn',
};

export const FlagBadge = ({ flag }) => <Badge tone={FLAG_TONES[flag] || 'neutral'}>{flag}</Badge>;

const SEVERITY_TONES = { error: 'bad', warning: 'warn', info: 'info' };
export const SeverityBadge = ({ severity }) => <Badge tone={SEVERITY_TONES[severity]}>{severity}</Badge>;

export function Async({ state, children }) {
  if (state.error) return <div className="alert alert-bad">{state.error}</div>;
  if (!state.data) return <div className="loading">Loading…</div>;
  return children(state.data);
}

export function Notice({ tone = 'info', children }) {
  return <div className={`alert alert-${tone}`}>{children}</div>;
}
