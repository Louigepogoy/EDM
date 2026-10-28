import { useState } from 'react';
import { api } from '../api.js';
import { useSession } from '../session.jsx';
import { Badge, Card, Notice, PageHeader, fmt } from '../ui.jsx';

export default function Account() {
  const { user, permissions } = useSession();

  return (
    <>
      <PageHeader title="My Account" subtitle="Your profile, access level and password." />
      <div className="grid-2">
        <Card title="Profile">
          <div className="detail-grid profile">
            <span>
              <small>Name</small>
              {user.name}
            </span>
            <span>
              <small>Email</small>
              {user.email}
            </span>
            <span>
              <small>Role</small>
              <Badge tone="info">{user.role}</Badge>
            </span>
            <span>
              <small>Member since</small>
              {fmt.date(user.createdAt)}
            </span>
          </div>
          <h3>What you can do</h3>
          <div className="chips">
            {permissions.map((p) => (
              <span key={p} className="chip mono">
                {p}
              </span>
            ))}
          </div>
        </Card>
        <ChangePassword />
      </div>
    </>
  );
}

function ChangePassword() {
  const empty = { currentPassword: '', newPassword: '', confirm: '' };
  const [form, setForm] = useState(empty);
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setMessage(null);
    if (form.newPassword !== form.confirm) return setMessage({ tone: 'bad', text: 'New passwords do not match' });
    setBusy(true);
    try {
      await api('/auth/password', { method: 'POST', body: form });
      setForm(empty);
      setMessage({ tone: 'good', text: 'Password changed.' });
    } catch (err) {
      setMessage({ tone: 'bad', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title="Change password">
      <form className="auth-form" onSubmit={submit}>
        <label>
          <span>Current password</span>
          <input type="password" autoComplete="current-password" value={form.currentPassword} onChange={set('currentPassword')} required />
        </label>
        <label>
          <span>New password</span>
          <input type="password" autoComplete="new-password" minLength={8} value={form.newPassword} onChange={set('newPassword')} required />
        </label>
        <label>
          <span>Confirm new password</span>
          <input type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} required />
        </label>
        {message && <Notice tone={message.tone}>{message.text}</Notice>}
        <button className="btn" disabled={busy}>
          {busy ? 'Saving…' : 'Change password'}
        </button>
      </form>
    </Card>
  );
}
