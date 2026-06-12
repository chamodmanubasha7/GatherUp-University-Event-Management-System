import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import { itemPhotoSrc } from '../utils/mediaUrl.js';

/**
 * Lost item detail. Non-owners can notify the owner (in-app + Messages thread).
 */
export default function LostDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [item, setItem] = useState(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [statusDialog, setStatusDialog] = useState(null);
  const [statusBusy, setStatusBusy] = useState(false);

  async function reload() {
    const { data } = await api.get(`/lost-found/lost/${id}`);
    setItem(data);
  }

  useEffect(() => {
    (async () => {
      try {
        await reload();
      } catch (e) {
        toast.error(e.message);
      }
    })();
  }, [id]);

  async function notifyOwner(e) {
    e.preventDefault();
    if (!user) {
      toast.error('Log in to continue');
      return;
    }
    setBusy(true);
    try {
      await api.post(`/lost-found/lost/${id}/notify-owner`, { message: note || undefined });
      toast.success('The owner was notified — check Messages to follow up');
      setNote('');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function applyStatus() {
    if (!statusDialog) return;
    setStatusBusy(true);
    try {
      await api.patch(`/lost-found/lost/${id}/status`, { status: statusDialog.nextStatus });
      toast.success('Status updated');
      await reload();
      setStatusDialog(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setStatusBusy(false);
    }
  }

  if (!item) {
    return <div className="py-20 text-center text-clay-muted">Loading…</div>;
  }

  const reporterId = (item.reporter?._id ?? item.reporter)?.toString?.() ?? '';
  const isOwner = user && String(user.id) === String(reporterId);
  const canTip = user && !isOwner && item.status === 'Looking';

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {statusDialog && (
        <ConfirmModal
          title={statusDialog.title}
          description={statusDialog.description}
          confirmLabel="Update status"
          cancelLabel="Cancel"
          busy={statusBusy}
          onCancel={() => !statusBusy && setStatusDialog(null)}
          onConfirm={applyStatus}
        />
      )}

      <Link to="/lost-found" className="text-sm font-medium text-clay-primary hover:underline">
        ← Back to search
      </Link>
      <div className="glass-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-mono text-sm font-medium text-clay-primary">{item.publicId}</p>
            <h1 className="font-display text-2xl font-bold text-clay-ink">{item.itemName}</h1>
            <p className="mt-1 text-sm text-clay-muted">
              Posted by{' '}
              <span className="text-clay-ink">{item.user?.name ?? item.reporter?.name ?? '—'}</span>
            </p>
          </div>
          <span className="rounded-full bg-clay-peach px-3 py-1 text-sm font-medium text-amber-800">{item.status}</span>
        </div>
        <p className="mt-4 text-clay-muted">{item.description}</p>
        {itemPhotoSrc(item.photo) && (
          <div className="mt-6">
            <p className="text-xs uppercase tracking-wide text-clay-subtle">Photo</p>
            <img
              src={itemPhotoSrc(item.photo)}
              alt={`${item.itemName} — listing photo`}
              className="mt-2 max-h-80 w-full max-w-lg rounded-2xl border border-clay-border object-contain shadow-sm"
            />
          </div>
        )}
        <dl className="mt-4 grid gap-2 text-sm text-clay-muted">
          <div>
            <dt className="text-clay-subtle">Category</dt>
            <dd>{item.category}</dd>
          </div>
          <div>
            <dt className="text-clay-subtle">Location</dt>
            <dd>{item.location}</dd>
          </div>
          <div>
            <dt className="text-clay-subtle">Lost</dt>
            <dd>{new Date(item.dateLost).toLocaleString()}</dd>
          </div>
        </dl>

        {isOwner && ['Looking', 'FoundByOwner'].includes(item.status) && (
          <div className="mt-8 space-y-3 border-t border-clay-border pt-6">
            <h2 className="font-display text-lg font-semibold text-clay-ink">Your listing</h2>
            <p className="text-sm text-clay-muted">
              Update the status when you recover the item or want to close the report.
            </p>
            <div className="flex flex-wrap gap-2">
              {item.status === 'Looking' && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() =>
                    setStatusDialog({
                      nextStatus: 'FoundByOwner',
                      title: 'Mark as found by you?',
                      description:
                        'Use this when you have recovered your item yourself. Others will no longer see the “I found this” option.',
                    })
                  }
                >
                  Mark as found by me
                </button>
              )}
              {item.status === 'FoundByOwner' && (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() =>
                    setStatusDialog({
                      nextStatus: 'Resolved',
                      title: 'Mark as resolved?',
                      description: 'Close this report once everything is settled.',
                    })
                  }
                >
                  Mark as resolved
                </button>
              )}
            </div>
          </div>
        )}

        {canTip && (
          <form onSubmit={notifyOwner} className="mt-8 space-y-4 border-t border-clay-border pt-6">
            <h2 className="font-display text-lg font-semibold text-clay-ink">I found this item</h2>
            <p className="text-sm text-clay-muted">
              We&apos;ll notify the owner in-app. If you allow it in your profile, your email/phone can be shared with
              them. Coordinate pickup manually — this does not create an official claim.
            </p>
            <div>
              <label className="label">Optional message</label>
              <textarea
                className="input-field min-h-[90px]"
                placeholder="Where you saw it, turning it in, etc."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="submit" className="btn-primary" disabled={busy}>
                {busy ? 'Sending…' : 'Notify owner'}
              </button>
              <Link to="/dashboard/profile" className="btn-secondary">
                Contact sharing settings
              </Link>
            </div>
          </form>
        )}

        {isOwner && (
          <p className="mt-6 text-sm text-clay-muted">
            Others can reach you through{' '}
            <Link to="/messages" className="font-medium text-clay-primary hover:underline">
              Messages
            </Link>
            .
          </p>
        )}

        {!user && (
          <p className="mt-6 text-sm text-clay-muted">
            <Link to="/login" className="font-medium text-clay-primary hover:underline">
              Log in
            </Link>{' '}
            to tell the owner you may have found this item.
          </p>
        )}
      </div>
    </div>
  );
}
