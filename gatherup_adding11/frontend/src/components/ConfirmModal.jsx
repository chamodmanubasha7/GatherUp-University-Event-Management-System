/**
 * Confirmation dialog (clay / soft UI).
 */
export default function ConfirmModal({
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  danger,
  busy,
}) {
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-clay-ink/25 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        className="w-full max-w-md rounded-2xl border-2 border-clay-border bg-clay-surface p-6 shadow-clay-lg"
      >
        <h2 id="confirm-modal-title" className="font-display text-lg font-bold text-clay-ink">
          {title}
        </h2>
        {description && <p className="mt-2 text-sm text-clay-muted">{description}</p>}
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button type="button" className="btn-secondary !px-4 !py-2" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={
              danger
                ? 'inline-flex items-center justify-center rounded-full bg-gradient-to-r from-red-500 to-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-clay transition hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50'
                : 'btn-primary'
            }
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? '…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
