import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSession } from '../session.jsx';
import { Notice, ThemeToggle } from '../ui.jsx';

function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="auth">
      <div className="auth-theme">
        <ThemeToggle />
      </div>
      <div className="auth-panel">
        <div className="auth-brand">
          <span className="brand-mark">EDM</span>
          <div>
            <strong>Integration Hub</strong>
            <small>Unifying Data for Governance, Quality, and Insights</small>
          </div>
        </div>
        <h1>{title}</h1>
        <p className="muted">{subtitle}</p>
        {children}
        <p className="auth-footer">{footer}</p>
      </div>
    </div>
  );
}

function useSubmit(action) {
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return { error, setError, busy, submit };
}

export function Login() {
  const { login } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { error, busy, submit } = useSubmit(() => login(email, password));

  return (
    <AuthLayout
      title="Log in"
      subtitle="Sign in to access the EDM Integration Hub."
      footer={
        <>
          No account yet? <Link to="/register">Create one</Link>
        </>
      }
    >
      <form className="auth-form" onSubmit={submit}>
        <label>
          <span>Email</span>
          <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </label>
        <label>
          <span>Password</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error && <Notice tone="bad">{error}</Notice>}
        <button className="btn" disabled={busy}>
          {busy ? 'Signing in…' : 'Log in'}
        </button>
      </form>
    </AuthLayout>
  );
}

export function Register() {
  const { register } = useSession();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const { error, busy, submit } = useSubmit(async () => {
    if (form.password !== form.confirm) throw new Error('Passwords do not match');
    await register(form.name, form.email, form.password);
  });

  return (
    <AuthLayout
      title="Sign up"
      subtitle="New accounts start with Viewer access. An administrator can grant more."
      footer={
        <>
          Already have an account? <Link to="/login">Log in</Link>
        </>
      }
    >
      <form className="auth-form" onSubmit={submit}>
        <label>
          <span>Full name</span>
          <input autoComplete="name" value={form.name} onChange={set('name')} required autoFocus />
        </label>
        <label>
          <span>Email</span>
          <input type="email" autoComplete="email" value={form.email} onChange={set('email')} required />
        </label>
        <label>
          <span>Password</span>
          <input type="password" autoComplete="new-password" minLength={8} value={form.password} onChange={set('password')} required />
          <small className="muted">At least 8 characters</small>
        </label>
        <label>
          <span>Confirm password</span>
          <input type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} required />
        </label>
        {error && <Notice tone="bad">{error}</Notice>}
        <button className="btn" disabled={busy}>
          {busy ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </AuthLayout>
  );
}
