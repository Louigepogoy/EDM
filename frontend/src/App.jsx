import { Link, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useSession } from './session.jsx';
import { ThemeToggle } from './ui.jsx';
import { Login, Register } from './pages/Auth.jsx';
import Account from './pages/Account.jsx';
import Dashboard from './pages/Dashboard.jsx';
import About from './pages/About.jsx';
import Sources from './pages/Sources.jsx';
import Pipeline from './pages/Pipeline.jsx';
import Warehouse from './pages/Warehouse.jsx';
import Quality from './pages/Quality.jsx';
import Governance from './pages/Governance.jsx';
import Industries from './pages/Industries.jsx';

const NAV = [
  { to: '/', label: 'Dashboard', icon: '◧', end: true },
  { to: '/about', label: 'About EDM', icon: 'ℹ' },
  { to: '/sources', label: 'Source Systems', icon: '⛁' },
  { to: '/pipeline', label: 'ETL Pipeline', icon: '⇉' },
  { to: '/warehouse', label: 'Data Warehouse', icon: '▦' },
  { to: '/quality', label: 'Data Quality', icon: '✓' },
  { to: '/governance', label: 'Governance', icon: '⚖' },
  { to: '/industries', label: 'Industry Cases', icon: '◎' },
];

export default function App() {
  const { status } = useSession();
  const location = useLocation();

  if (status === 'loading') return <div className="splash">Loading…</div>;

  if (status !== 'authenticated') {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Navigate to="/login" replace state={{ from: location.pathname }} />} />
      </Routes>
    );
  }

  return <Shell />;
}

function Shell() {
  const { user, logout } = useSession();
  const location = useLocation();
  // After signing in, return to the page the user originally asked for.
  const afterAuth = <Navigate to={location.state?.from || '/'} replace />;

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">EDM</span>
          <div>
            <strong>Integration Hub</strong>
            <small>Governance · Quality · Insights</small>
          </div>
        </div>
        <nav>
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className="nav-link">
              <span className="nav-icon" aria-hidden>
                {item.icon}
              </span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <small>Signed in as</small>
          <Link to="/account" className="user-link">
            <strong>{user.name}</strong>
            <small>{user.email}</small>
          </Link>
          <span className="role-pill">{user.role}</span>
          <div className="sidebar-actions">
            <ThemeToggle />
            <button className="btn btn-ghost btn-sm" onClick={logout}>
              Log out
            </button>
          </div>
        </div>
      </aside>

      <main className="content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/about" element={<About />} />
          <Route path="/sources" element={<Sources />} />
          <Route path="/pipeline" element={<Pipeline />} />
          <Route path="/warehouse" element={<Warehouse />} />
          <Route path="/quality" element={<Quality />} />
          <Route path="/governance" element={<Governance />} />
          <Route path="/industries" element={<Industries />} />
          <Route path="/account" element={<Account />} />
          <Route path="/login" element={afterAuth} />
          <Route path="/register" element={afterAuth} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
