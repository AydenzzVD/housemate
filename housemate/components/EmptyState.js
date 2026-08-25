'use client';

/**
 * components/EmptyState.js
 * Reusable empty state component for all pages with no data.
 */

export default function EmptyState({
  icon = '📭',
  title = 'Nothing here yet',
  description = '',
  actionLabel = null,
  onAction = null,
  actionHref = null,
}) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <h3 className="empty-state-title">{title}</h3>
      {description && <p className="empty-state-desc">{description}</p>}
      {actionLabel && actionHref && (
        <a href={actionHref} className="btn btn-primary">
          {actionLabel}
        </a>
      )}
      {actionLabel && onAction && !actionHref && (
        <button onClick={onAction} className="btn btn-primary">
          {actionLabel}
        </button>
      )}

      <style jsx>{`
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem 1.5rem;
          text-align: center;
          gap: 0.75rem;
        }
        .empty-state-icon {
          font-size: 3rem;
          line-height: 1;
          margin-bottom: 0.5rem;
          opacity: 0.7;
        }
        .empty-state-title {
          font-size: 1.1rem;
          font-weight: 600;
          color: var(--text-primary, #1a1a2e);
          margin: 0;
        }
        .empty-state-desc {
          font-size: 0.9rem;
          color: var(--text-secondary, #666);
          margin: 0;
          max-width: 300px;
          line-height: 1.5;
        }
        .btn {
          margin-top: 0.5rem;
          padding: 0.6rem 1.4rem;
          border-radius: 0.75rem;
          font-weight: 600;
          font-size: 0.9rem;
          border: none;
          cursor: pointer;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .btn-primary {
          background: linear-gradient(135deg, #7c3aed, #4f46e5);
          color: white;
        }
      `}</style>
    </div>
  );
}
