import React from 'react';

export default function Dialog({ open, title, message, type = 'info', onClose, onConfirm, confirmLabel = 'OK' }) {
  if (!open) return null;

  return (
    <div className="dialog-backdrop" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
      <div className={`dialog ${type}`}>
        <header className="dialog-header">
          <h3 id="dialog-title">{title}</h3>
        </header>

        <div className="dialog-body">
          <p>{message}</p>
        </div>

        <footer className="dialog-actions">
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
          {onConfirm ? (
            <button
              className="btn btn-primary"
              onClick={() => {
                onConfirm();
                onClose && onClose();
              }}
            >
              {confirmLabel}
            </button>
          ) : null}
        </footer>
      </div>
    </div>
  );
}
