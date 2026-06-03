import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

function renderEmail(email) {
  const raw = email || '';
  if (!raw) return 'No email available';

  const MAX = 28;
  if (raw.length > MAX) {
    const short = `${raw.slice(0, MAX - 1)}…`;
    return (
      <>
        <span className="email-short" aria-hidden>
          {short}
        </span>
        <span className="overflow-dot" title={raw} aria-hidden />
      </>
    );
  }

  return raw;
}

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
  const [pendingDelete, setPendingDelete] = useState(null);
  const { user: me } = useAuth();

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

        // If the current user is an admin, hide their own account from the list
        const isAdmin = Boolean(me && (String(me.is_admin) === '1' || me.is_admin === true || (me.role && String(me.role).toLowerCase() === 'admin')));

        const visible = Array.isArray(nextUsers)
          ? nextUsers.filter((u) => {
              if (!isAdmin) return true;
              return String(u.id) !== String(me?.id);
            })
          : nextUsers;

        setUsers(visible);

        if (visible.length) {
          setSelectedUser(visible[0]);
          const todoResponse = await api.listUserTodos(visible[0].id);
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
  }, [me?.id, me?.role, me?.is_admin]);

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

  const performDeleteUser = async (user) => {
    setError('');

    try {
      await api.deleteUser(user.id);

      setUsers((prev) => {
        const remaining = prev.filter((u) => String(u.id) !== String(user.id));

        // if deleted user was selected, pick next or clear
        setSelectedUser((prevSelected) => {
          if (!prevSelected) return null;
          if (String(prevSelected.id) === String(user.id)) {
            const next = remaining.length ? remaining[0] : null;
            if (next) {
              // load todos for next (fire-and-forget)
              selectUser(next);
              return next;
            }
            setTodos([]);
            return null;
          }
          return prevSelected;
        });

        return remaining;
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('admin.deleteUser error:', err);
      const message = err?.response?.data?.message || err?.message || 'Could not delete user.';
      setError(message);
    } finally {
      setPendingDelete(null);
    }
  };

  const openConfirm = (user) => setPendingDelete(user);
  const cancelConfirm = () => setPendingDelete(null);

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
            <div className="stack-list hide-scrollbar">
              {users.map((user) => (
                <div
                  key={user.id}
                  role="button"
                  tabIndex={0}
                  className={`user-row ${selectedUser?.id === user.id ? 'active' : ''}`}
                  onClick={() => selectUser(user)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      selectUser(user);
                    }
                  }}
                >
                  <div>
                    <strong>{user.name ?? user.username ?? 'Unnamed user'}</strong>
                    <p title={user.email ?? 'No email available'}>{renderEmail(user.email)}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {/* <span className="status-pill">{user.role ?? (user.is_admin ? 'admin' : 'user')}</span> */}
                    <span
                      role="button"
                      tabIndex={0}
                      className="btn btn-danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        openConfirm(user);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          e.stopPropagation();
                          openConfirm(user);
                        }
                      }}
                      style={{ padding: '6px 10px', borderRadius: 12 }}
                    >
                      Delete
                    </span>
                  </div>
                </div>
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
      {pendingDelete ? (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal">
            <h3>Confirm delete</h3>
            <p>
              Are you sure you want to permanently delete the account for <strong>{pendingDelete.name || pendingDelete.email || pendingDelete.username}</strong>?
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 12 }}>
              <button type="button" className="btn btn-ghost" onClick={cancelConfirm}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => performDeleteUser(pendingDelete)}
              >
                Delete account
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
