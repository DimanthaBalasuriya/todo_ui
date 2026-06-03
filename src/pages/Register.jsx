import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
  });
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    try {
      const session = await register(form);
      const destination = session.user?.role === 'admin' ? '/admin' : '/dashboard';
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Registration failed.');
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
            <p className="eyebrow">Create account</p>
            <h2>Register</h2>
          </div>
        </div>

        <label className="field">
          <span>Name</span>
          <input
            type="text"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="Your name"
            required
          />
        </label>

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

        <label className="field">
          <span>Confirm password</span>
          <input
            type="password"
            value={form.password_confirmation}
            onChange={(event) =>
              setForm((current) => ({ ...current, password_confirmation: event.target.value }))
            }
            placeholder="Password"
            required
          />
        </label>

        {error ? <p className="form-error">{error}</p> : null}

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Creating account...' : 'Register'}
        </button>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </motion.form>
    </div>
  );
}
