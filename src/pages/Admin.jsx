import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import api from '../services/api';

function normalizeList(response) {
  if (Array.isArray(response)) return response;
  return response?.data ?? response?.users ?? response?.items ?? [];
}

function normalizeTodos(response) {
  if (Array.isArray(response)) return response;
  return response?.data ?? response?.todos ?? response?.items ?? [];
}

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadUsers = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await api.listUsers();
        // debug: log raw response
        // eslint-disable-next-line no-console
        console.debug('admin.listUsers response:', response);
        const nextUsers = normalizeList(response);
        setUsers(nextUsers);

        if (nextUsers.length) {
          setSelectedUser(nextUsers[0]);
          const todoResponse = await api.listUserTodos(nextUsers[0].id);
          setTodos(normalizeTodos(todoResponse));
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('admin.loadUsers error:', err);
        const message =
          err?.response?.data?.message || err?.message || (err?.response && `HTTP ${err.response.status}`) || 'Could not load admin data.';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, []);

  const selectUser = async (user) => {
    setSelectedUser(user);
    setError('');

    try {
      const response = await api.listUserTodos(user.id);
      // eslint-disable-next-line no-console
      console.debug('admin.listUserTodos response:', response);
      setTodos(normalizeTodos(response));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('admin.listUserTodos error:', err);
      const message = err?.response?.data?.message || err?.message || 'Could not load user todos.';
      setError(message);
    }
  };

  return (
    <div className="page-stack">
      <section className="hero card">
        <div>
          <p className="eyebrow">Admin dashboard</p>
          <h1>See the whole cafe at a glance.</h1>
          <p className="lede">
            Review registered users and open each person&apos;s todo list without losing the minimal, calm feel.
          </p>
        </div>
      </section>

      <section className="layout-grid admin-grid">
        <motion.div className="card list-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="section-header">
            <div>
              <p className="eyebrow">Registered users</p>
              <h2>Accounts</h2>
            </div>
          </div>

          {loading ? <p className="empty-state">Loading users...</p> : null}
          {error ? <p className="form-error">{error}</p> : null}

          {!loading && users.length ? (
            <div className="stack-list">
              {users.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  className={`user-row ${selectedUser?.id === user.id ? 'active' : ''}`}
                  onClick={() => selectUser(user)}
                >
                  <div>
                    <strong>{user.name ?? user.username ?? 'Unnamed user'}</strong>
                    <p>{user.email ?? 'No email available'}</p>
                  </div>
                  <span className="status-pill">{user.role ?? (user.is_admin ? 'admin' : 'user')}</span>
                </button>
              ))}
            </div>
          ) : null}
        </motion.div>

        <motion.div className="card list-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="section-header">
            <div>
              <p className="eyebrow">User todos</p>
              <h2>{selectedUser ? selectedUser.name ?? selectedUser.username ?? 'Selected user' : 'Pick a user'}</h2>
            </div>
          </div>

          {!selectedUser && !loading ? (
            <div className="empty-state">Choose a user to inspect their todos.</div>
          ) : null}

          {selectedUser && todos.length ? (
            <div className="stack-list">
              {todos.map((todo) => (
                <article key={todo.id} className="mini-card">
                  <strong>{todo.title}</strong>
                  <p>{todo.description || 'No description provided.'}</p>
                </article>
              ))}
            </div>
          ) : null}

          {selectedUser && !loading && !todos.length ? (
            <div className="empty-state">This user has no todos right now.</div>
          ) : null}
        </motion.div>
      </section>
    </div>
  );
}
