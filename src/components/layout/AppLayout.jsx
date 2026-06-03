import React from 'react';
import { motion } from 'framer-motion';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useState } from 'react';
import Dialog from '../Dialog';

export default function AppLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleLogout = () => {
    setDialogOpen(true);
  };

  const doLogout = async () => {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (err) {
      // show an error dialog if needed
      setDialogOpen(false);
    }
  };

  const navClass = ({ isActive }) => `nav-link ${isActive ? 'active' : ''}`;

  return (
    <div className="app-shell">
      <div className="ambient ambient-a" />
      <div className="ambient ambient-b" />
      <header className="topbar">
        <Link to={user?.role === 'admin' ? '/admin' : '/dashboard'} className="brand">
          <span className="brand-mark">B</span>
          <span>
            Brew <strong>Todo</strong>
          </span>
        </Link>
        <nav className="topnav">
          <NavLink to="/dashboard" className={navClass}>
            My Todos
          </NavLink>
          {user?.role === 'admin' ? (
            <NavLink to="/admin" className={navClass}>
              Admin
            </NavLink>
          ) : null}
        </nav>
        <div className="topbar-user">
          <div>
            <p className="eyebrow">Signed in as</p>
            <strong>{user?.name ?? 'Guest'}</strong>
          </div>
          <button type="button" className="btn btn-ghost" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>
      <Dialog
        open={dialogOpen}
        title="Confirm logout"
        message="Are you sure you want to log out?"
        type="warn"
        onClose={() => setDialogOpen(false)}
        onConfirm={doLogout}
        confirmLabel="Logout"
      />
      <main className="main-frame">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
