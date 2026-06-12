import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import { itemPhotoSrc } from '../utils/mediaUrl.js';

export default function FoundDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [item, setItem] = useState(null);
  const [notifyNote, setNotifyNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [statusDialog, setStatusDialog] = useState(null);
  const [statusBusy, setStatusBusy] = useState(false);

  async function reload() {
    const { data } = await api.get(`/lost-found/found/${id}`);
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

  async function notifyFinder(e) {
    e.preventDefault();
    if (!user) {
      toast.error('Log in to continue');
      return;
    }
    setBusy(true);
    try {
      await api.post('/claims', { foundItemId: id, message: notifyNote || undefined });
      toast.success('The finder was notified');
      setNotifyNote('');
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
      await api.patch(`/lost-found/found/${id}/status`, { status: statusDialog.nextStatus });
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

  const finderId = (item.finder?._id ?? item.finder)?.toString?.() ?? '';
  const isFinder = user && String(user.id) === String(finderId);
  const canNotifyFinder = user && !isFinder && item.status === 'Unclaimed';

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
            <p className="font-mono text-sm font-medium text-accent-600">{item.publicId}</p>
            <h1 className="font-display text-2xl font-bold text-clay-ink">{item.itemName}</h1>
            <p className="mt-1 text-sm text-clay-muted">
              Posted by{' '}
              <span className="text-clay-ink">{item.user?.name ?? item.finder?.name ?? '—'}</span>
            </p>
          </div>
          <span className="rounded-full bg-clay-mint px-3 py-1 text-sm font-medium text-accent-700">{item.status}</span>
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
            <dt className="text-clay-subtle">Found</dt>
            <dd>{new Date(item.dateFound).toLocaleString()}</dd>
          </div>
        </dl>

        {isFinder && ['Unclaimed', 'Claimed'].includes(item.status) && (
          <div className="mt-8 space-y-3 border-t border-clay-border pt-6">
            <h2 className="font-display text-lg font-semibold text-clay-ink">Your listing</h2>
            <p className="text-sm text-clay-muted">
              Mark when someone has collected the item, then resolve when the handover is complete.
            </p>
            <div className="flex flex-wrap gap-2">
              {item.status === 'Unclaimed' && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() =>
                    setStatusDialog({
                      nextStatus: 'Claimed',
                      title: 'Mark as claimed?',
                      description:
                        'Use this after you have handed the item to its owner (or their representative).',
                    })
                  }
                >
                  Mark as claimed
                </button>
              )}
              {item.status === 'Claimed' && (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() =>
                    setStatusDialog({
                      nextStatus: 'Resolved',
                      title: 'Mark as resolved?',
                      description: 'Close this listing once pickup is fully complete.',
                    })
                  }
                >
                  Mark as resolved
                </button>
              )}
            </div>
          </div>
        )}

        {canNotifyFinder && (
          <form onSubmit={notifyFinder} className="mt-8 space-y-4 border-t border-clay-border pt-6">
            <h2 className="font-display text-lg font-semibold text-clay-ink">This is my item</h2>
            <p className="text-sm text-clay-muted">
              Send a message to the finder. You can continue the conversation in Messages.
            </p>
            <textarea
              className="input-field min-h-[80px]"
              placeholder="Optional message (identifying details, where you lost it, …)"
              value={notifyNote}
              onChange={(e) => setNotifyNote(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <button type="submit" className="btn-primary" disabled={busy}>
                {busy ? 'Sending…' : 'Notify finder'}
              </button>
              <Link to="/dashboard/profile" className="btn-secondary">
                Contact sharing
              </Link>
            </div>
          </form>
        )}

        {!user && (
          <p className="mt-6 text-sm text-clay-muted">
            <Link to="/login" className="font-medium text-clay-primary hover:underline">
              Log in
            </Link>{' '}
            to contact the finder.
          </p>
        )}
      </div>
    </div>
  );
}
