import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useTasks } from '../../hooks/useTasks';

export default function Navbar() {
  const { theme, toggle } = useTheme();
  const { activeCount } = useTasks();
  const location = useLocation();

  const links = [
    { to: '/',        label: 'Dashboard', icon: '🏠' },
    { to: '/tasks',   label: 'Tasks',     icon: '✅' },
    { to: '/settings',label: 'Settings',  icon: '⚙️' },
  ];

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span className="navbar-logo">✓</span>
        <span className="navbar-title">TaskFlow</span>
      </div>

      <div className="navbar-links">
        {links.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            className={`navbar-link ${location.pathname === l.to ? 'active' : ''}`}
          >
            <span>{l.icon}</span>
            <span>{l.label}</span>
          </Link>
        ))}
      </div>

      <div className="navbar-right">
        {activeCount > 0 && (
          <span className="navbar-badge">{activeCount} pending</span>
        )}
        <button className="theme-toggle" onClick={toggle} title="Toggle theme">
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        <div className="navbar-avatar">KB</div>
      </div>
    </nav>
  );
}
