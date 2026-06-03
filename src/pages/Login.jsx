import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, token, user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;

    if (user?.role === 'admin') {
      navigate('/admin', { replace: true });
      return;
    }

    if (user?.role === 'user') {
      navigate('/dashboard', { replace: true });
    }
  }, [token, user, navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    try {
      const session = await login(form);
      const destination =
        location.state?.from?.pathname ||
        (session.user?.role === 'admin' ? '/admin' : '/dashboard');
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Login failed.');
    }
  };

  return (
    <div className="auth-screen">
      <motion.form
        className="auth-card card"
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div className="auth-head">
          <div className="auth-logo" aria-hidden>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="6" width="20" height="12" rx="3" fill="#EFE6DD" />
              <circle cx="8" cy="12" r="2" fill="#7A5230" />
            </svg>
          </div>
          <div>
            <p className="eyebrow">Welcome back</p>
            <h2>Sign in</h2>
          </div>
        </div>

        <label className="field">
          <span>Email</span>
          <input
            type="email"
            value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            placeholder="name@example.com"
            required
          />
        </label>

        <label className="field">
          <span>Password</span>
          <input
            type="password"
            value={form.password}
            onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
            placeholder="Password"
            required
          />
        </label>

        <div className="auth-row">
          <label className="inline-checkbox">
            <input type="checkbox" /> <span>Remember me</span>
          </label>
          <Link to="/forgot" className="muted">Forgot password?</Link>
        </div>

        {error ? <p className="form-error">{error}</p> : null}

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Signing in...' : 'Login'}
        </button>

        <p className="auth-footer">
          New here? <Link to="/register">Create an account</Link>
        </p>
      </motion.form>
    </div>
  );
}
