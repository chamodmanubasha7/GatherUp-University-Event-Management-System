import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { itemPhotoSrc } from '../utils/mediaUrl.js';

const LF_CATEGORIES = ['Electronics', 'Clothing', 'ID & Cards', 'Keys', 'Books', 'Other'];

export default function LostFoundPage() {
  const { user } = useAuth();
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [data, setData] = useState({ lost: [], found: [] });
  const [loading, setLoading] = useState(false);

  async function search() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (category) params.set('category', category);
      if (status) params.set('status', status);
      if (type) params.set('type', type);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const { data: res } = await api.get(`/lost-found/search?${params.toString()}`);
      setData(res);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    search();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-clay-ink">Lost &amp; Found</h1>
          <p className="text-clay-muted">Search campus lost and found listings.</p>
        </div>
        {user && (
          <div className="flex flex-wrap gap-2">
            <Link to="/lost-found/report-lost" className="btn-primary">
              Report lost
            </Link>
            <Link to="/lost-found/report-found" className="btn-secondary">
              Report found
            </Link>
          </div>
        )}
      </div>

      <div className="glass-card space-y-4 p-4">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <input
            className="input-field"
            placeholder="Keywords"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select className="input-field" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Any category</option>
            {LF_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select className="input-field" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Any status</option>
            <option value="Looking">Looking (lost)</option>
            <option value="FoundByOwner">Found by owner (lost)</option>
            <option value="Resolved">Resolved</option>
            <option value="Unclaimed">Unclaimed (found)</option>
            <option value="Claimed">Claimed (found)</option>
          </select>
          <select className="input-field" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">Lost &amp; Found</option>
            <option value="lost">Lost only</option>
            <option value="found">Found only</option>
          </select>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="grid gap-1">
            <label className="text-xs text-clay-subtle">From</label>
            <input
              type="date"
              className="input-field w-auto"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div className="pb-2 text-sm font-medium text-clay-muted">to</div>
          <div className="grid gap-1">
            <label className="text-xs text-clay-subtle">To</label>
            <input
              type="date"
              className="input-field w-auto"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <button type="button" className="btn-primary" onClick={search} disabled={loading}>
            {loading ? 'Searching…' : 'Search'}
          </button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="font-display text-xl font-semibold text-clay-ink">Lost items</h2>
          <div className="mt-4 space-y-4">
            {data.lost.map((item) => (
              <article
                key={item._id}
                className="glass-card-interactive flex gap-3 p-4"
              >
                {itemPhotoSrc(item.photo) && (
                  <Link
                    to={`/lost-found/lost/${item._id}`}
                    className="shrink-0 self-start overflow-hidden rounded-2xl border border-clay-border"
                  >
                    <img
                      src={itemPhotoSrc(item.photo)}
                      alt=""
                      className="h-20 w-20 object-cover"
                      loading="lazy"
                    />
                  </Link>
                )}
                <Link to={`/lost-found/lost/${item._id}`} className="min-w-0 flex-1 block">
                  <div className="flex justify-between gap-2">
                    <span className="text-xs font-mono font-medium text-clay-primary">{item.publicId}</span>
                    <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-300">
                      {item.status}
                    </span>
                  </div>
                  <h3 className="mt-1 font-semibold text-clay-ink">{item.itemName}</h3>
                  <p className="mt-0.5 text-xs text-clay-muted">
                    Posted by{' '}
                    <span className="text-clay-muted">{item.user?.name || item.reporter?.name || '—'}</span>
                  </p>
                  <p className="text-sm text-clay-muted">{item.description}</p>
                  <p className="mt-2 text-xs text-clay-subtle">
                    {item.location} · {item.category} · Lost {new Date(item.dateLost).toLocaleDateString()}
                  </p>
                  {item.event && (
                    <p className="text-xs font-medium text-accent-600">Linked event: {item.event.title}</p>
                  )}
                </Link>
                {user && (
                  <Link
                    to={`/lost-found/lost/${item._id}`}
                    title="Open listing and message the owner"
                    className="shrink-0 self-center rounded-xl border border-indigo-400/30 bg-indigo-500/15 px-3 py-2 text-lg leading-none text-indigo-200 transition hover:bg-indigo-500/30"
                  >
                    💬
                  </Link>
                )}
              </article>
            ))}
            {data.lost.length === 0 && <p className="text-clay-muted">No lost items match.</p>}
          </div>
        </section>
        <section>
          <h2 className="font-display text-xl font-semibold text-clay-ink">Found items</h2>
          <div className="mt-4 space-y-4">
            {data.found.map((item) => (
              <article
                key={item._id}
                className="glass-card-interactive flex gap-3 p-4"
              >
                {itemPhotoSrc(item.photo) && (
                  <Link
                    to={`/lost-found/found/${item._id}`}
                    className="shrink-0 self-start overflow-hidden rounded-2xl border border-clay-border"
                  >
                    <img
                      src={itemPhotoSrc(item.photo)}
                      alt=""
                      className="h-20 w-20 object-cover"
                      loading="lazy"
                    />
                  </Link>
                )}
                <Link to={`/lost-found/found/${item._id}`} className="min-w-0 flex-1 block">
                  <div className="flex justify-between gap-2">
                    <span className="text-xs font-mono font-medium text-accent-600">{item.publicId}</span>
                    <span className="rounded-full bg-teal-500/20 px-2 py-0.5 text-xs text-teal-300">
                      {item.status}
                    </span>
                  </div>
                  <h3 className="mt-1 font-semibold text-clay-ink">{item.itemName}</h3>
                  <p className="mt-0.5 text-xs text-clay-muted">
                    Posted by{' '}
                    <span className="text-clay-muted">{item.user?.name || item.finder?.name || '—'}</span>
                  </p>
                  <p className="text-sm text-clay-muted">{item.description}</p>
                  <p className="mt-2 text-xs text-clay-subtle">
                    {item.location} · {item.category}
                  </p>
                </Link>
                {user && (
                  <Link
                    to={`/lost-found/found/${item._id}`}
                    title="Open listing and message the finder"
                    className="shrink-0 self-center rounded-xl border border-teal-400/30 bg-teal-500/15 px-3 py-2 text-lg leading-none text-teal-200 transition hover:bg-teal-500/30"
                  >
                    💬
                  </Link>
                )}
              </article>
            ))}
            {data.found.length === 0 && <p className="text-clay-muted">No found items match.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
