import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api.js';
import { deleteMyExpiredTicket, deleteMyExpiredTickets } from '../services/ticketCleanup.js';
import { formatDateRange, isUpcoming, eventNotStartedYet } from '../utils/dates.js';
import EditReportModal from '../components/EditReportModal.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';

export default function DashboardPage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [regs, setRegs] = useState([]);
  const [dash, setDash] = useState(null);
  const [notifs, setNotifs] = useState([]);
  const [rec, setRec] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editTarget, setEditTarget] = useState(null); // { type: 'lost'|'found', item }
  const [panel, setPanel] = useState('overview'); // overview | tickets | reports
  const [myTickets, setMyTickets] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [unregisterTarget, setUnregisterTarget] = useState(null);
  const [unregisterBusy, setUnregisterBusy] = useState(false);
  /** null | 'bulk' | { ticketId, title } */
  const [expiredTicketDialog, setExpiredTicketDialog] = useState(null);
  const [expiredTicketBusy, setExpiredTicketBusy] = useState(false);
  const [clearNotifsOpen, setClearNotifsOpen] = useState(false);
  const [clearNotifsBusy, setClearNotifsBusy] = useState(false);
  const [notifDeleteBusy, setNotifDeleteBusy] = useState(null);

  const refreshDash = useCallback(async () => {
    const { data } = await api.get('/lost-found/dashboard/mine');
    setDash(data);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [r, d, n] = await Promise.all([
          api.get('/registrations/mine'),
          api.get('/lost-found/dashboard/mine'),
          api.get('/notifications').catch(() => ({ data: [] })),
        ]);
        setRegs(r.data);
        setDash(d.data);
        setNotifs(n.data);
        try {
          const rc = await api.get('/recommendations');
          setRec(rc.data);
        } catch {
          setRec({ events: [] });
        }
      } catch (e) {
        toast.error(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'tickets') setPanel('tickets');
  }, [searchParams]);

  useEffect(() => {
    if (panel !== 'overview') return;
    if (location.hash !== '#notifications') return;
    // Let the DOM paint first, then scroll.
    const t = setTimeout(() => {
      const el = document.getElementById('notifications');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
    return () => clearTimeout(t);
  }, [location.hash, panel]);

  useEffect(() => {
    if (panel !== 'tickets') return;
    (async () => {
      setTicketsLoading(true);
      try {
        const { data } = await api.get('/tickets/mine');
        setMyTickets(data);
      } catch (e) {
        toast.error(e.message);
        setMyTickets([]);
      } finally {
        setTicketsLoading(false);
      }
    })();
  }, [panel]);

  async function markNotifsRead() {
    try {
      await api.post('/notifications/read-all');
      setNotifs((list) => list.map((x) => ({ ...x, read: true })));
    } catch {
      /* ignore */
    }
  }

  async function deleteNotification(notifId) {
    setNotifDeleteBusy(notifId);
    try {
      await api.delete(`/notifications/${notifId}`);
      setNotifs((list) => list.filter((x) => x._id !== notifId));
      toast.success('Notification removed');
    } catch (e) {
      toast.error(e.message || 'Could not delete notification');
    } finally {
      setNotifDeleteBusy(null);
    }
  }

  async function confirmClearAllNotifications() {
    setClearNotifsBusy(true);
    try {
      await api.delete('/notifications');
      setNotifs([]);
      setClearNotifsOpen(false);
      toast.success('All notifications cleared');
    } catch (e) {
      toast.error(e.message || 'Could not clear notifications');
    } finally {
      setClearNotifsBusy(false);
    }
  }

  function downloadQr(dataUrl, title) {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${title.replace(/\s+/g, '-')}-ticket.png`;
    a.click();
  }

  function printTicket(title, dataUrl) {
    if (!dataUrl) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<title>${title}</title><img src="${dataUrl}" style="max-width:100%" onload="window.print();window.close()" />`);
    w.document.close();
  }

  async function deleteLost(item) {
    if (!confirm(`Remove lost report ${item.publicId} from public view?`)) return;
    try {
      await api.delete(`/lost-found/lost/${item._id}`);
      toast.success('Report removed');
      await refreshDash();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function deleteFound(item) {
    if (!confirm(`Remove found listing ${item.publicId}?`)) return;
    try {
      await api.delete(`/lost-found/found/${item._id}`);
      toast.success('Listing removed');
      await refreshDash();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function refreshRegistrations() {
    try {
      const { data } = await api.get('/registrations/mine');
      setRegs(data);
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function confirmUnregister() {
    if (!unregisterTarget) return;
    setUnregisterBusy(true);
    try {
      await api.delete(`/registrations/event/${unregisterTarget.eventId}`);
      toast.success('Registration cancelled');
      setUnregisterTarget(null);
      await refreshRegistrations();
      if (panel === 'tickets') {
        try {
          const { data } = await api.get('/tickets/mine');
          setMyTickets(data);
        } catch {
          /* ignore */
        }
      }
    } catch (e) {
      toast.error(e.message);
    } finally {
      setUnregisterBusy(false);
    }
  }

  async function confirmExpiredTicketRemoval() {
    if (!expiredTicketDialog) return;
    setExpiredTicketBusy(true);
    try {
      if (expiredTicketDialog === 'bulk') {
        const data = await deleteMyExpiredTickets();
        toast.success(
          data.message ||
            `Removed ${data.deletedTickets} ticket(s) and ${data.deletedRegistrations} registration(s).`
        );
      } else {
        await deleteMyExpiredTicket(expiredTicketDialog.ticketId);
        toast.success('Ticket removed from your dashboard.');
      }
      setExpiredTicketDialog(null);
      await refreshRegistrations();
      if (panel === 'tickets') {
        try {
          const { data } = await api.get('/tickets/mine');
          setMyTickets(data);
        } catch {
          /* ignore */
        }
      }
    } catch (e) {
      toast.error(e.message);
    } finally {
      setExpiredTicketBusy(false);
    }
  }

  if (loading) {
    return <div className="py-20 text-center text-clay-muted">Loading dashboard…</div>;
  }

  const upcoming = regs.filter((x) => x.registration?.event && isUpcoming(x.registration.event.endDateTime));

  const hasExpiredTickets =
    !ticketsLoading && myTickets.some((t) => t.eventId && !isUpcoming(t.eventId.endDateTime));

  return (
    <div className="space-y-10">
      {expiredTicketDialog && (
        <ConfirmModal
          title={expiredTicketDialog === 'bulk' ? 'Remove expired tickets?' : 'Remove this ticket?'}
          description={
            expiredTicketDialog === 'bulk'
              ? 'This removes tickets for events that have already ended (and their registrations) from your account. Upcoming events are not affected.'
              : `Remove “${expiredTicketDialog.title}” from your dashboard? The event has ended.`
          }
          confirmLabel="Remove"
          cancelLabel="Cancel"
          danger
          busy={expiredTicketBusy}
          onCancel={() => !expiredTicketBusy && setExpiredTicketDialog(null)}
          onConfirm={confirmExpiredTicketRemoval}
        />
      )}
      {unregisterTarget && (
        <ConfirmModal
          title="Cancel registration?"
          description={`Remove your ticket for "${unregisterTarget.title}"? The slot will be freed on the event.`}
          confirmLabel="Unregister"
          cancelLabel="Keep registration"
          danger
          busy={unregisterBusy}
          onCancel={() => !unregisterBusy && setUnregisterTarget(null)}
          onConfirm={confirmUnregister}
        />
      )}
      {editTarget && (
        <EditReportModal
          type={editTarget.type}
          item={editTarget.item}
          onClose={() => setEditTarget(null)}
          onSaved={refreshDash}
        />
      )}
      {clearNotifsOpen && (
        <ConfirmModal
          title="Clear all notifications?"
          description="This permanently removes every notification in your list. This cannot be undone."
          confirmLabel="Clear all"
          cancelLabel="Cancel"
          danger
          busy={clearNotifsBusy}
          onCancel={() => !clearNotifsBusy && setClearNotifsOpen(false)}
          onConfirm={confirmClearAllNotifications}
        />
      )}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-clay-ink">Dashboard</h1>
          <p className="text-clay-muted">Tickets, recommendations, and Lost &amp; Found activity.</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 border-b border-clay-border pb-3">
        <button
          type="button"
          onClick={() => setPanel('overview')}
          className={`rounded-full px-4 py-2 text-sm font-medium shadow-sm transition ${
            panel === 'overview'
              ? 'bg-clay-lilac text-clay-primary'
              : 'text-clay-muted hover:bg-clay-peach/40 hover:text-clay-ink'
          }`}
        >
          Overview
        </button>
        <button
          type="button"
          onClick={() => setPanel('tickets')}
          className={`rounded-full px-4 py-2 text-sm font-medium shadow-sm transition ${
            panel === 'tickets'
              ? 'bg-clay-lilac text-clay-primary'
              : 'text-clay-muted hover:bg-clay-peach/40 hover:text-clay-ink'
          }`}
        >
          My tickets
        </button>
        <button
          type="button"
          onClick={() => setPanel('reports')}
          className={`rounded-full px-4 py-2 text-sm font-medium shadow-sm transition ${
            panel === 'reports'
              ? 'bg-clay-lilac text-clay-primary'
              : 'text-clay-muted hover:bg-clay-peach/40 hover:text-clay-ink'
          }`}
        >
          My reports
        </button>
        <Link
          to="/messages"
          className="rounded-full px-4 py-2 text-sm font-medium text-clay-muted transition hover:bg-clay-peach/40 hover:text-clay-ink"
        >
          Messages →
        </Link>
      </div>

      {panel === 'overview' && (
        <section id="notifications" className="glass-card p-4 scroll-mt-24">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-lg font-semibold text-clay-ink">Notifications</h2>
            {notifs.length > 0 && (
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className="text-sm font-medium text-red-700 hover:underline"
                  onClick={() => setClearNotifsOpen(true)}
                >
                  Clear all
                </button>
                <button
                  type="button"
                  className="text-sm font-medium text-clay-primary hover:underline"
                  onClick={markNotifsRead}
                >
                  Mark all read
                </button>
              </div>
            )}
          </div>
          {notifs.length === 0 ? (
            <p className="mt-3 text-sm text-clay-muted">No notifications yet. Event reminders appear here.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {notifs.slice(0, 12).map((n) => (
                <li
                  key={n._id}
                  className={`flex gap-2 rounded-2xl border-2 px-3 py-2 text-sm ${
                    n.read
                      ? 'border-clay-border/60 text-clay-muted'
                      : 'border-clay-primary/25 bg-clay-lilac text-clay-ink'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p>
                      <span className="font-medium">{n.title}</span> — {n.message}
                    </p>
                    {(n.relatedItemType || n.relatedItemId) && (
                      <p className="mt-1 text-xs text-clay-subtle">
                        Reference: {n.relatedItemType || '—'}
                        {n.relatedItemId ? ` · ID ${n.relatedItemId}` : ''}
                      </p>
                    )}
                    {n.link && (
                      <Link
                        to={n.link}
                        className="mt-1 inline-block text-xs font-medium text-clay-primary hover:underline"
                      >
                        {n.meta?.kind === 'event_started' || n.link.startsWith('/events/')
                          ? 'Open event →'
                          : 'Open link →'}
                      </Link>
                    )}
                  </div>
                  <button
                    type="button"
                    className="shrink-0 rounded-xl p-2 text-clay-muted transition hover:bg-red-100 hover:text-red-700"
                    title="Delete notification"
                    aria-label="Delete notification"
                    disabled={notifDeleteBusy === n._id}
                    onClick={() => deleteNotification(n._id)}
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={2} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {panel === 'overview' && rec?.events?.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-bold text-clay-ink">Recommended for you</h2>
            <Link to="/events" className="text-sm font-semibold text-clay-primary hover:underline">View all →</Link>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {rec.events.map((ev) => (
              <Link key={ev._id} to={`/events/${ev._id}`} className="glass-card-interactive group block overflow-hidden">
                <div className="flex h-32">
                  <div 
                    className="w-32 shrink-0 bg-clay-lilac bg-cover bg-center relative"
                    style={
                      ev.image
                        ? { backgroundImage: `url(${ev.image})` }
                        : { backgroundImage: 'linear-gradient(135deg,#7c3aed,#10b981)' }
                    }
                  >
                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                      <span className={`px-1.5 py-0.5 rounded-lg text-[8px] font-bold uppercase tracking-wider shadow-sm backdrop-blur-md ${
                        ev.ticketingType === 'Free' ? 'bg-emerald-500/90 text-white' : 'bg-clay-lilac/90 text-clay-primary'
                      }`}>
                        {ev.ticketingType === 'Free' ? 'Free' : 'Paid'}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 p-4 flex flex-col">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-accent-600 mb-1">
                      {ev.category?.name}
                    </span>
                    <h3 className="font-display font-bold text-clay-ink group-hover:text-clay-primary transition-colors line-clamp-1">
                      {ev.title}
                    </h3>
                    <div className="mt-auto flex items-center justify-between text-[9px] font-semibold text-clay-subtle uppercase">
                      <span>{new Date(ev.startDateTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                      <span className="px-1.5 py-0.5 rounded bg-clay-bg text-clay-muted">
                        {ev.locationType || 'Indoor'}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {panel === 'overview' && (
      <section>
        <h2 className="font-display text-xl font-semibold text-clay-ink">Upcoming tickets</h2>
        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          {upcoming.length === 0 && (
            <p className="text-clay-muted">
              No upcoming events.{' '}
              <Link to="/events" className="font-medium text-clay-primary hover:underline">
                Browse events
              </Link>
            </p>
          )}
          {upcoming.map((row) => {
            const ev = row.registration.event;
            const t = row.ticket;
            return (
              <div key={row.registration._id} className="glass-card overflow-hidden">
                <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center">
                  <div className="flex-1">
                    <p className="text-xs uppercase text-accent-600">QR ticket</p>
                    <h3 className="font-display text-lg font-semibold text-clay-ink">{ev.title}</h3>
                    <p className="text-sm text-clay-muted">{formatDateRange(ev.startDateTime, ev.endDateTime)}</p>
                    <p className="mt-1 text-xs text-clay-subtle">
                      Status: <span className="font-medium text-clay-ink">{t?.status || '—'}</span>
                      {t?.usedAt && ` · Used at ${new Date(t.usedAt).toLocaleString()}`}
                    </p>
                  </div>
                  {t?.qrCode && (
                    <div className="shrink-0 rounded-xl bg-white p-3">
                      <img src={t.qrCode} alt="Ticket QR" className="h-40 w-40 md:h-44 md:w-44" />
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 border-t border-clay-border bg-clay-bg/80 px-5 py-3">
                  <button
                    type="button"
                    className="btn-secondary !py-2 !text-xs"
                    onClick={() => downloadQr(t?.qrCode, ev.title)}
                    disabled={!t?.qrCode}
                  >
                    Download PNG
                  </button>
                  <button
                    type="button"
                    className="btn-secondary !py-2 !text-xs"
                    onClick={() => printTicket(ev.title, t?.qrCode)}
                    disabled={!t?.qrCode}
                  >
                    Print
                  </button>
                  <Link to={`/events/${ev._id}`} className="btn-secondary !py-2 !text-xs">
                    Event details
                  </Link>
                  {eventNotStartedYet(ev.startDateTime) && (
                    <button
                      type="button"
                      className="btn-secondary !py-2 !text-xs text-red-700 hover:bg-red-50"
                      onClick={() =>
                        setUnregisterTarget({ eventId: ev._id, title: ev.title })
                      }
                    >
                      Cancel registration
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
      )}

      {panel === 'tickets' && (
        <section>
          <h2 className="font-display text-xl font-semibold text-clay-ink">My tickets</h2>
          <p className="mt-1 text-sm text-clay-muted">
            Signed QR codes for your registrations. Show this at check-in; admins scan with the{' '}
            <Link to="/admin/scanner" className="font-medium text-clay-primary hover:underline">
              QR scanner
            </Link>
            . You can clear ended events from this list without affecting your feedback.
          </p>
          {hasExpiredTickets && (
            <button
              type="button"
              className="btn-secondary mt-4 border-red-200 text-sm text-red-700 hover:bg-red-50"
              onClick={() => setExpiredTicketDialog('bulk')}
            >
              Clean up expired tickets
            </button>
          )}
          {ticketsLoading && <p className="mt-4 text-clay-muted">Loading tickets…</p>}
          {!ticketsLoading && myTickets.length === 0 && (
            <p className="mt-4 text-clay-muted">
              No tickets yet.{' '}
              <Link to="/events" className="font-medium text-clay-primary hover:underline">
                Browse events
              </Link>{' '}
              and register.
            </p>
          )}
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {!ticketsLoading &&
              myTickets.map((ticket) => {
                const ev = ticket.eventId;
                const title = ev?.title || 'Event';
                const venueName = ev?.venue?.name || ev?.venue?.location || '—';
                const isExpired = ev && !isUpcoming(ev.endDateTime);
                return (
                  <div key={ticket._id} className="glass-card overflow-hidden">
                    <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-start">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs uppercase text-accent-600">QR ticket</p>
                        <h3 className="font-display text-lg font-semibold text-clay-ink">{title}</h3>
                        {ev && (
                          <p className="text-sm text-clay-muted">
                            {formatDateRange(ev.startDateTime, ev.endDateTime)}
                            {isExpired && (
                              <span className="ml-2 rounded-full bg-clay-border px-2 py-0.5 text-xs text-clay-muted">
                                Ended
                              </span>
                            )}
                          </p>
                        )}
                        <p className="mt-2 text-sm text-clay-muted">
                          Venue: <span className="text-clay-ink">{venueName}</span>
                        </p>
                        <p className="mt-1 text-xs text-clay-subtle">
                          Status: <span className="font-medium text-clay-ink">{ticket.status}</span>
                          {ticket.usedAt && ` · Used at ${new Date(ticket.usedAt).toLocaleString()}`}
                        </p>
                      </div>
                      {ticket.qrCode && (
                        <div className="mx-auto shrink-0 rounded-xl bg-white p-4 lg:mx-0">
                          <img
                            src={ticket.qrCode}
                            alt={`QR for ${title}`}
                            className="h-52 w-52 min-h-[13rem] min-w-[13rem] object-contain md:h-56 md:w-56"
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 border-t border-clay-border bg-clay-bg/80 px-5 py-3">
                      <button
                        type="button"
                        className="btn-secondary !py-2 !text-xs"
                        onClick={() => downloadQr(ticket.qrCode, title)}
                        disabled={!ticket.qrCode}
                      >
                        Download PNG
                      </button>
                      <button
                        type="button"
                        className="btn-secondary !py-2 !text-xs"
                        onClick={() => printTicket(title, ticket.qrCode)}
                        disabled={!ticket.qrCode}
                      >
                        Print
                      </button>
                      {ev?._id && (
                        <Link to={`/events/${ev._id}`} className="btn-secondary !py-2 !text-xs">
                          Event details
                        </Link>
                      )}
                      {ev && eventNotStartedYet(ev.startDateTime) && (
                        <button
                          type="button"
                          className="btn-secondary !py-2 !text-xs text-red-700 hover:bg-red-50"
                          onClick={() =>
                            setUnregisterTarget({
                              eventId: ev._id,
                              title,
                            })
                          }
                        >
                          Cancel registration
                        </button>
                      )}
                      {isExpired && (
                        <button
                          type="button"
                          className="btn-secondary !py-2 !text-xs text-clay-muted hover:bg-clay-peach/30"
                          onClick={() =>
                            setExpiredTicketDialog({ ticketId: ticket._id, title })
                          }
                        >
                          Remove from list
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </section>
      )}

      {panel === 'reports' && (
      <section>
        <h2 className="font-display text-xl font-semibold text-clay-ink">My reports</h2>
        <p className="mt-1 text-sm text-clay-muted">
          Edit or remove open listings. Others can reach you via{' '}
          <Link to="/messages" className="font-medium text-clay-primary hover:underline">
            Messages
          </Link>{' '}
          when they respond to your posts.
        </p>
        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          <div className="glass-card p-5">
            <h3 className="font-display text-lg font-semibold text-clay-ink">Lost</h3>
            <ul className="mt-3 space-y-3 text-sm">
              {(dash?.lost || []).map((l) => {
                const canEdit = l.status === 'Looking';
                const canDelete = l.status === 'Looking' && !l.matchedFoundItem;
                return (
                  <li key={l._id} className="rounded-2xl border border-clay-border/60 bg-clay-bg/50 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <Link
                          to={`/lost-found/lost/${l._id}`}
                          className="font-mono font-medium text-clay-primary hover:underline"
                        >
                          {l.publicId}
                        </Link>
                        <span className="text-clay-muted"> · {l.itemName}</span>
                        <p className="text-xs text-clay-subtle">{l.status}</p>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {canEdit && (
                          <button
                            type="button"
                            className="rounded-xl bg-clay-lilac px-2 py-1 text-xs font-medium text-clay-primary hover:bg-clay-lilac/80"
                            onClick={() => setEditTarget({ type: 'lost', item: l })}
                          >
                            Edit
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            className="rounded-xl bg-red-100 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-200"
                            onClick={() => deleteLost(l)}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
              {(!dash?.lost || dash.lost.length === 0) && (
                <li className="text-clay-muted">No lost reports yet.</li>
              )}
            </ul>
          </div>
          <div className="glass-card p-5">
            <h3 className="font-display text-lg font-semibold text-clay-ink">Found (posted by you)</h3>
            <ul className="mt-3 space-y-3 text-sm">
              {(dash?.foundPosted || []).map((f) => {
                const canEdit = f.status === 'Unclaimed';
                const canDelete = f.status === 'Unclaimed';
                return (
                  <li key={f._id} className="rounded-2xl border border-clay-border/60 bg-clay-bg/50 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <Link
                          to={`/lost-found/found/${f._id}`}
                          className="font-mono font-medium text-accent-600 hover:underline"
                        >
                          {f.publicId}
                        </Link>
                        <span className="text-clay-muted"> · {f.itemName}</span>
                        <p className="text-xs text-clay-subtle">{f.status}</p>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {canEdit && (
                          <button
                            type="button"
                            className="rounded-xl bg-clay-mint px-2 py-1 text-xs font-medium text-accent-700 hover:bg-clay-mint/80"
                            onClick={() => setEditTarget({ type: 'found', item: f })}
                          >
                            Edit
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            className="rounded-xl bg-red-100 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-200"
                            onClick={() => deleteFound(f)}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
              {(!dash?.foundPosted || dash.foundPosted.length === 0) && (
                <li className="text-clay-muted">No found posts yet.</li>
              )}
            </ul>
          </div>
        </div>
      </section>
      )}
    </div>
  );
}
