import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api.js';

export default function AdminTicketUsagePage() {
  const [logs, setLogs] = useState([]);
  const [events, setEvents] = useState([]);
  const [eventId, setEventId] = useState('');
  const [loading, setLoading] = useState(true);

  async function loadEvents() {
    try {
      const { data } = await api.get('/events');
      setEvents(data);
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function loadLogs() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (eventId) params.set('eventId', eventId);
      const { data } = await api.get(`/tickets/usage-logs?${params.toString()}`);
      setLogs(data);
    } catch (e) {
      toast.error(e.message);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-clay-ink">Ticket usage logs</h1>
          <p className="text-clay-muted">
            Successful QR check-ins (newest first). Filter by event if needed.
          </p>
        </div>
        <Link to="/admin" className="btn-secondary">
          ← Admin
        </Link>
      </div>

      <div className="glass-card flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-[200px] flex-1">
          <label className="text-xs text-clay-subtle">Filter by event</label>
          <select
            className="input-field mt-1"
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
          >
            <option value="">All events</option>
            {events.map((ev) => (
              <option key={ev._id} value={ev._id}>
                {ev.title}
              </option>
            ))}
          </select>
        </div>
        <button type="button" className="btn-secondary" onClick={loadLogs} disabled={loading}>
          Refresh
        </button>
      </div>

      <div className="glass-card overflow-x-auto p-0">
        {loading ? (
          <p className="p-6 text-clay-muted">Loading…</p>
        ) : logs.length === 0 ? (
          <p className="p-6 text-clay-muted">No scan records yet.</p>
        ) : (
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-clay-border bg-clay-bg text-xs uppercase text-clay-subtle">
              <tr>
                <th className="px-4 py-3">Scanned at</th>
                <th className="px-4 py-3">Event</th>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Scanned by</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-clay-border/60">
              {logs.map((row) => (
                <tr key={row._id} className="text-clay-ink">
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-clay-muted">
                    {row.scannedAt ? new Date(row.scannedAt).toLocaleString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {row.eventId?.title || '—'}
                  </td>
                  <td className="px-4 py-3">{row.userId?.name || '—'}</td>
                  <td className="px-4 py-3 text-clay-muted">{row.userId?.email || '—'}</td>
                  <td className="px-4 py-3 text-clay-muted">
                    {row.scannedBy?.name || row.scannedBy?.email || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
