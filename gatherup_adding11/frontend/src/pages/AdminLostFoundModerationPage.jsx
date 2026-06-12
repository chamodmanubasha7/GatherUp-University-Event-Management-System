import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api.js';

function isRowHidden(row) {
  return Boolean(row.hidden || row.moderationHidden);
}

export default function AdminLostFoundModerationPage() {
  const [data, setData] = useState({ lost: [], found: [] });
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data: d } = await api.get('/lost-found/admin/moderation');
    setData(d);
  }

  useEffect(() => {
    (async () => {
      try {
        await load();
      } catch (e) {
        toast.error(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function toggleLost(row, hidden) {
    try {
      await api.patch(`/lost-found/admin/moderate/lost/${row._id}`, { hidden });
      toast.success(hidden ? 'Listing hidden from public' : 'Listing visible again');
      await load();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function toggleFound(row, hidden) {
    try {
      await api.patch(`/lost-found/admin/moderate/found/${row._id}`, { hidden });
      toast.success(hidden ? 'Listing hidden from public' : 'Listing visible again');
      await load();
    } catch (e) {
      toast.error(e.message);
    }
  }

  if (loading) {
    return <div className="py-20 text-center text-clay-muted">Loading…</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-clay-ink">Moderate listings</h1>
          <p className="text-sm text-clay-muted">
            Hide inappropriate posts from public search. Owners keep access from their dashboards.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/admin/lost-found/hidden" className="btn-secondary">
            Hidden listings
          </Link>
          <Link to="/admin" className="btn-secondary">
            Admin home
          </Link>
        </div>
      </div>

      <section>
        <h2 className="font-display text-lg font-semibold text-clay-ink">Lost reports</h2>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-clay-border glass-card p-0">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-clay-bg text-clay-muted">
              <tr>
                <th className="p-2">ID</th>
                <th className="p-2">Item</th>
                <th className="p-2">Reporter</th>
                <th className="p-2">Hidden</th>
                <th className="p-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {data.lost.map((row) => (
                <tr key={row._id} className="border-t border-clay-border/60">
                  <td className="p-2 font-mono text-xs font-medium text-clay-primary">{row.publicId}</td>
                  <td className="p-2 text-clay-ink">{row.itemName}</td>
                  <td className="p-2 text-clay-subtle">
                    <span className="text-clay-ink">{row.user?.name || row.reporter?.name || '—'}</span>
                    <br />
                    <span className="text-xs">{row.reporter?.email}</span>
                  </td>
                  <td className="p-2">{isRowHidden(row) ? 'yes' : '—'}</td>
                  <td className="p-2">
                    <button
                      type="button"
                      className="text-xs font-medium text-clay-secondary hover:underline"
                      onClick={() => toggleLost(row, !isRowHidden(row))}
                    >
                      {isRowHidden(row) ? 'Unhide' : 'Hide from public'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold text-clay-ink">Found listings</h2>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-clay-border glass-card p-0">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-clay-bg text-clay-muted">
              <tr>
                <th className="p-2">ID</th>
                <th className="p-2">Item</th>
                <th className="p-2">Finder</th>
                <th className="p-2">Hidden</th>
                <th className="p-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {data.found.map((row) => (
                <tr key={row._id} className="border-t border-clay-border/60">
                  <td className="p-2 font-mono text-xs font-medium text-accent-600">{row.publicId}</td>
                  <td className="p-2 text-clay-ink">{row.itemName}</td>
                  <td className="p-2 text-clay-subtle">
                    <span className="text-clay-ink">{row.user?.name || row.finder?.name || '—'}</span>
                    <br />
                    <span className="text-xs">{row.finder?.email}</span>
                  </td>
                  <td className="p-2">{isRowHidden(row) ? 'yes' : '—'}</td>
                  <td className="p-2">
                    <button
                      type="button"
                      className="text-xs font-medium text-clay-secondary hover:underline"
                      onClick={() => toggleFound(row, !isRowHidden(row))}
                    >
                      {isRowHidden(row) ? 'Unhide' : 'Hide from public'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
