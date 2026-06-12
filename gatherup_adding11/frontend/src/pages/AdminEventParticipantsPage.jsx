import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api.js';
import { formatDateRange, isUpcoming } from '../utils/dates.js';

export default function AdminEventParticipantsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState({});

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/events');
      setEvents(data || []);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const sorted = useMemo(() => {
    const copy = [...events];
    copy.sort((a, b) => new Date(a.startDateTime) - new Date(b.startDateTime));
    return copy;
  }, [events]);

  async function downloadXlsx(ev) {
    setDownloading((d) => ({ ...d, [ev._id]: true }));
    try {
      const res = await api.get(`/events/${ev._id}/participants.xlsx`, { responseType: 'blob' });
      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safe = String(ev.title || 'event')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      a.download = `${safe || 'event'}-participants.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Excel downloaded');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setDownloading((d) => ({ ...d, [ev._id]: false }));
    }
  }

  if (loading) {
    return <div className="py-20 text-center text-clay-muted">Loading…</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-clay-ink">Event participants</h1>
          <p className="text-clay-muted">Participant counts and Excel exports per event.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-secondary !py-2 !text-xs" onClick={load}>
            Refresh
          </button>
          <Link to="/admin" className="btn-secondary !py-2 !text-xs">
            ← Admin
          </Link>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="grid grid-cols-12 gap-2 border-b border-clay-border/70 bg-clay-bg/50 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-clay-subtle">
          <div className="col-span-5">Event</div>
          <div className="col-span-4">When</div>
          <div className="col-span-1 text-right">Participants</div>
          <div className="col-span-2 text-right">Export</div>
        </div>

        {sorted.length === 0 && (
          <div className="px-4 py-10 text-center text-sm text-clay-muted">No events found.</div>
        )}

        {sorted.map((ev) => {
          const upcoming = isUpcoming(ev.endDateTime);
          return (
            <div
              key={ev._id}
              className="grid grid-cols-12 items-center gap-2 border-b border-clay-border/50 px-4 py-3 last:border-b-0"
            >
              <div className="col-span-5">
                <p className="font-semibold text-clay-ink">{ev.title}</p>
                <p className="text-xs text-clay-subtle">
                  <span
                    className={
                      upcoming
                        ? 'inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 font-bold text-emerald-800'
                        : 'inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 font-bold text-slate-700'
                    }
                  >
                    {upcoming ? 'Upcoming' : 'Past'}
                  </span>
                </p>
              </div>
              <div className="col-span-4 text-sm text-clay-muted">
                {formatDateRange(ev.startDateTime, ev.endDateTime)}
              </div>
              <div className="col-span-1 text-right text-sm font-bold text-clay-ink">
                {ev.registrationCount ?? 0}
              </div>
              <div className="col-span-2 flex justify-end">
                <button
                  type="button"
                  className="btn-secondary !py-2 !text-xs"
                  onClick={() => downloadXlsx(ev)}
                  disabled={!!downloading[ev._id]}
                >
                  {downloading[ev._id] ? 'Preparing…' : 'Download Excel'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

