import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal.jsx';
import { listHiddenLostFound, adminDeleteHiddenListing } from '../services/lostFoundAdmin.js';

function truncate(s, n = 80) {
  if (!s || typeof s !== 'string') return '—';
  const t = s.trim();
  return t.length <= n ? t : `${t.slice(0, n)}…`;
}

export default function AdminHiddenLostFoundPage() {
  const [data, setData] = useState({ items: [], total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listHiddenLostFound({ page, limit: 20, sort: 'updatedAt' });
      setData(res);
    } catch (e) {
      toast.error(e.message);
      setData({ items: [], total: 0, page: 1, limit: 20, totalPages: 1 });
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      await adminDeleteHiddenListing(deleteTarget.kind, deleteTarget._id);
      toast.success('Listing permanently deleted');
      setDeleteTarget(null);
      await load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      {deleteTarget && (
        <ConfirmModal
          title="Permanently delete this listing?"
          description={`This removes the hidden ${deleteTarget.kind} item “${deleteTarget.itemName}” (${deleteTarget.publicId}), related messages, and linked notifications. This cannot be undone.`}
          confirmLabel="Delete permanently"
          cancelLabel="Cancel"
          danger
          busy={deleteBusy}
          onCancel={() => !deleteBusy && setDeleteTarget(null)}
          onConfirm={confirmDelete}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-clay-ink">Hidden Lost &amp; Found</h1>
          <p className="text-sm text-clay-muted">
            Listings removed from public search. Delete to purge them and related messages from the database.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/admin/lost-found/moderation" className="btn-secondary">
            Moderation
          </Link>
          <Link to="/admin" className="btn-secondary">
            Admin home
          </Link>
        </div>
      </div>

      {loading ? (
        <p className="text-clay-muted">Loading…</p>
      ) : data.items.length === 0 ? (
        <p className="glass-card p-6 text-clay-muted">No hidden listings.</p>
      ) : (
        <>
          <div className="glass-card overflow-x-auto p-0">
            <table className="min-w-[720px] w-full text-left text-sm">
              <thead className="border-b border-clay-border bg-clay-bg text-xs uppercase text-clay-subtle">
                <tr>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Posted by</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Public ID</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-clay-border/60">
                {data.items.map((row) => (
                  <tr key={`${row.kind}-${row._id}`} className="text-clay-ink">
                    <td className="px-4 py-3">
                      <span
                        className={
                          row.kind === 'lost'
                            ? 'rounded-full bg-clay-peach px-2 py-0.5 text-xs font-medium text-amber-800'
                            : 'rounded-full bg-clay-mint px-2 py-0.5 text-xs font-medium text-accent-700'
                        }
                      >
                        {row.kind === 'lost' ? 'Lost' : 'Found'}
                      </span>
                    </td>
                    <td className="max-w-[180px] px-4 py-3 font-medium text-clay-ink">{row.itemName}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-clay-muted">
                      {row.user?.name || '—'}
                    </td>
                    <td className="max-w-[240px] px-4 py-3 text-clay-muted">{truncate(row.description)}</td>
                    <td className="whitespace-nowrap px-4 py-3">{row.status}</td>
                    <td className="px-4 py-3 font-mono text-xs font-medium text-clay-primary">{row.publicId}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        className="rounded-xl border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                        onClick={() => setDeleteTarget({ ...row, kind: row.kind })}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.totalPages > 1 && (
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="btn-secondary !py-2 !text-sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <span className="text-sm text-clay-muted">
                Page {data.page} of {data.totalPages} ({data.total} total)
              </span>
              <button
                type="button"
                className="btn-secondary !py-2 !text-sm"
                disabled={page >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
