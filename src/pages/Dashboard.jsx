import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import api from '../services/api';
import Dialog from '../components/Dialog';
import LoadingSpinner from '../components/LoadingSpinner';

const EMPTY_FORM = {
  title: '',
  description: '',
  image: null,
};

function normalizeList(response) {
  if (Array.isArray(response)) return response;
  return response?.data ?? response?.todos ?? response?.items ?? [];
}

function TodoCard({ todo, onEdit, onDelete, onRestore, onForceDelete, isTrash }) {
  const image = api.imageUrl(todo.image_url || todo.image || todo.photo || todo.media);
  const created = todo.created_at || todo.createdAt || todo.published_at || null;

  const toggleCompleted = async () => {
    const prev = !!todo.completed;
    try {
      todo.completed = !prev;
      await api.updateTodo(todo.id, { completed: todo.completed });
    } catch (err) {
      todo.completed = prev;
    }
  };

  return (
    <motion.article
      className="todo-card"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      layout
    >
      {image ? <img className="todo-image" src={image} alt={todo.title} /> : null}

      <div className="todo-main">
        <div className="todo-header">
          <div>
            <h3 className={`todo-title ${todo.completed ? 'completed' : ''}`}>{todo.title}</h3>
            <p className="todo-desc">{todo.description || 'No description provided.'}</p>
            {created ? <small className="todo-meta">{new Date(created).toLocaleString()}</small> : null}
          </div>

          <div className="todo-meta-right">
            <span
              className={`status-pill ${todo.completed ? 'completed' : (isTrash ? 'trash' : 'active')}`}
              onClick={toggleCompleted}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleCompleted(); }}
              title={todo.completed ? 'Click to mark as not completed' : 'Click to mark completed'}
            >
              {todo.completed ? 'Completed' : isTrash ? 'Trash' : 'Active'}
            </span>
          </div>
        </div>

        <div className="todo-actions">
          {isTrash ? (
            <>
              <button className="btn btn-secondary" onClick={() => onRestore(todo)}>Restore</button>
              <button className="btn btn-danger" onClick={() => onForceDelete(todo)}>Delete forever</button>
            </>
          ) : (
            <>
              <button className="btn btn-secondary" onClick={() => onEdit(todo)}>Edit</button>
              <button className="btn btn-ghost" onClick={() => onDelete(todo)}>Move to trash</button>
            </>
          )}
        </div>
      </div>
    </motion.article>
  );
}

export default function Dashboard() {
  const [tab, setTab] = useState('todos');
  const [todos, setTodos] = useState([]);
  const [trash, setTrash] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialog, setDialog] = useState({ open: false, title: '', message: '', type: 'info', onConfirm: null });
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingTodo, setEditingTodo] = useState(null);
  const [preview, setPreview] = useState('');
  const previewObjectUrlRef = useRef('');

  const stats = useMemo(
    () => [
      { label: 'Open todos', value: todos.length },
      { label: 'In trash', value: trash.length },
      { label: 'Focus mode', value: 'Cozy' },
    ],
    [todos.length, trash.length]
  );

  const confirmLogout = () => {
    setDialog({
      open: true,
      title: 'Confirm logout',
      message: 'Are you sure you want to log out of your account?',
      type: 'warn',
      onConfirm: async () => {
        try {
          await api.logout();
          api.clearToken();
          window.location.reload();
        } catch (err) {
          setDialog({ open: true, title: 'Logout failed', message: err?.response?.data?.message || 'Could not log out.', type: 'error' });
        }
      },
    });
  };

  const loadTodos = async () => {
    setLoading(true);
    setDialog({ open: false, title: '', message: '', type: 'info', onConfirm: null });
    try {
      const [activeResponse, trashResponse] = await Promise.all([api.listTodos(), api.listTrash()]);
      setTodos(normalizeList(activeResponse));
      setTrash(normalizeList(trashResponse));
    } catch (err) {
      setDialog({ open: true, title: 'Load error', message: err?.response?.data?.message || 'Could not load your todos.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTodos();
  }, []);

  const resetForm = () => {
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = '';
    }
    setForm(EMPTY_FORM);
    setEditingTodo(null);
    setPreview('');
  };

  const openEdit = (todo) => {
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = '';
    }

    setEditingTodo(todo);
    setForm({ title: todo.title ?? '', description: todo.description ?? '', image: null });
    setPreview(api.imageUrl(todo.image_url || todo.image || todo.photo || todo.media));
    setTab('todos');
  };

  const submitTodo = async (event) => {
    event.preventDefault();
    setSaving(true);
    setDialog({ open: false, title: '', message: '', type: 'info', onConfirm: null });

    try {
      const formData = new FormData();
      formData.append('title', form.title);
      formData.append('description', form.description);
      if (form.image instanceof File) formData.append('image', form.image);

      if (editingTodo) {
        // method spoofing — some servers/proxies reject PATCH; Laravel accepts _method
        formData.append('_method', 'PATCH');
        await api.updateTodo(editingTodo.id, formData);
      } else {
        await api.createTodo(formData);
      }

      resetForm();
      await loadTodos();
    } catch (err) {
      setDialog({ open: true, title: 'Save error', message: err?.response?.data?.message || 'Could not save the todo.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const moveToTrash = async (todo) => {
    try {
      await api.deleteTodo(todo.id);
      await loadTodos();
    } catch (err) {
      setDialog({ open: true, title: 'Could not move to trash', message: err?.response?.data?.message || 'Could not move the todo to trash.', type: 'error' });
    }
  };

  const restoreTodo = async (todo) => {
    try {
      await api.restoreTodo(todo.id);
      await loadTodos();
    } catch (err) {
      setDialog({ open: true, title: 'Restore failed', message: err?.response?.data?.message || 'Could not restore the todo.', type: 'error' });
    }
  };

  const forceDelete = async (todo) => {
    try {
      await api.forceDeleteTodo(todo.id);
      await loadTodos();
    } catch (err) {
      setDialog({ open: true, title: 'Delete failed', message: err?.response?.data?.message || 'Could not delete the todo permanently.', type: 'error' });
    }
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0] ?? null;
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = '';
    }
    setForm((current) => ({ ...current, image: file }));
    if (file) {
      const url = URL.createObjectURL(file);
      previewObjectUrlRef.current = url;
      setPreview(url);
    } else {
      setPreview('');
    }
  };

  useEffect(() => () => {
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = '';
    }
  }, []);

  return (
    <div className="page-stack">
      <section className="hero card">
        <div>
          <p className="eyebrow">Good afternoon</p>
          <h1>Keep the list light, warm, and easy to act on.</h1>
          <p className="lede">Add tasks, attach images, edit when plans shift, and sweep completed items into trash instead of losing them.</p>
        </div>

        

        <div className="stats-grid">
          {stats.map((item) => (
            <div key={item.label} className="stat-card">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="layout-grid">
        <motion.form
          className="card form-card"
          onSubmit={submitTodo}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          encType="multipart/form-data"
          aria-label={editingTodo ? 'Update todo form' : 'Create todo form'}
        >
          <div className="section-header">
            <div>
              <p className="eyebrow">{editingTodo ? 'Update' : 'Create'}</p>
              <h2>{editingTodo ? 'Edit item' : 'Create an item'}</h2>
            </div>
          </div>

          <label className="field">
            <span>Title</span>
            <input
              type="text"
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              placeholder="Write the next useful thing"
              required
            />
          </label>

          <label className="field">
            <span>Description</span>
            <textarea
              rows="4"
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              placeholder="A short note for context"
            />
          </label>

          <label className="field">
            <span>Image</span>
            <div className="file-input-wrapper">
              <input id="todo-image" className="file-input-hidden" type="file" accept="image/*" onChange={handleImageChange} aria-label="Todo image" />
              <label htmlFor="todo-image" className="file-choose">Choose file</label>
              <span className="file-name">{form.image ? form.image.name : 'No file selected'}</span>
            </div>
            {preview ? <img className="preview-image" src={preview} alt="Preview" /> : null}
          </label>

          {/* Dialog-driven errors (replaces inline error paragraph) */}
          <Dialog
            open={dialog.open}
            title={dialog.title}
            message={dialog.message}
            type={dialog.type}
            onClose={() => setDialog({ open: false, title: '', message: '', type: 'info', onConfirm: null })}
            onConfirm={dialog.onConfirm}
          />

          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={resetForm} hidden={!editingTodo}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary full-width" disabled={saving}>
              {saving ? 'Saving...' : editingTodo ? 'Update todo' : 'Add todo'}
            </button>
          </div>
        </motion.form>

        <div className="card list-card">
          <div className="section-header">
            <div>
              <p className="eyebrow">Workspace</p>
              <h2>Todos</h2>
            </div>
            <div className="tabs">
              <button type="button" className={`tab ${tab === 'todos' ? 'active' : ''}`} onClick={() => setTab('todos')}>
                Todos
              </button>
              <button type="button" className={`tab ${tab === 'trash' ? 'active' : ''}`} onClick={() => setTab('trash')}>
                Trash
              </button>
            </div>
          </div>

          {loading ? <LoadingSpinner /> : null}

          {!loading && tab === 'todos' ? (
            <AnimatePresence mode="popLayout">
              {todos.length ? (
                todos.map((todo) => (
                  <TodoCard key={todo.id} todo={todo} onEdit={openEdit} onDelete={moveToTrash} />
                ))
              ) : (
                <div className="empty-state">Your list is clear. Add a first task and keep the momentum gentle.</div>
              )}
            </AnimatePresence>
          ) : null}

          {!loading && tab === 'trash' ? (
            <AnimatePresence mode="popLayout">
              {trash.length ? (
                trash.map((todo) => (
                  <TodoCard key={todo.id} todo={todo} isTrash onRestore={restoreTodo} onForceDelete={forceDelete} />
                ))
              ) : (
                <div className="empty-state">Nothing in trash right now.</div>
              )}
            </AnimatePresence>
          ) : null}
        </div>
      </section>
    </div>
  );
}