import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal.jsx';
import { adminCleanupTickets } from '../services/ticketCleanup.js';

const cards = [
  { to: '/admin/ticket-logs', title: 'Ticket usage', desc: 'Scan log & check-in history', color: 'from-emerald-500/30' },
  { to: '/admin/events', title: 'Events', desc: 'Create & edit campus events', color: 'from-brand-500/30' },
  { to: '/admin/event-participants', title: 'Participants', desc: 'Counts + Excel downloads per event', color: 'from-indigo-500/30' },
  { to: '/admin/meta', title: 'Categories & Venues', desc: 'Manage taxonomy and spaces', color: 'from-purple-500/30' },
  { to: '/admin/lost-found/moderation', title: 'L&F moderation', desc: 'Hide inappropriate listings from public search', color: 'from-cyan-500/30' },
  { to: '/admin/lost-found/hidden', title: 'Hidden L&F', desc: 'Review and permanently delete hidden listings', color: 'from-slate-600/40' },
  { to: '/admin/scanner', title: 'QR check-in', desc: 'Live ticket scanner', color: 'from-amber-500/30' },
  { to: '/admin/analytics', title: 'Analytics', desc: 'Attendance, ratings, L&F stats', color: 'from-pink-500/30' },
];

export default function AdminOverviewPage() {
  const [cleanupOpen, setCleanupOpen] = useState(false);
  const [cleanupBusy, setCleanupBusy] = useState(false);

  async function runTicketCleanup() {
    setCleanupBusy(true);
    try {
      const data = await adminCleanupTickets();
      toast.success(
        data.message ||
          `Deleted ${data.deletedTickets} ticket(s) and ${data.deletedRegistrations} registration(s).`
      );
      setCleanupOpen(false);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setCleanupBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      {cleanupOpen && (
        <ConfirmModal
          title="Delete used and expired tickets?"
          description="This permanently removes tickets that are already marked “used” or belong to events whose end time has passed, along with their registration rows. Event feedback is unchanged. Capacity counts for active events are unaffected."
          confirmLabel="Run cleanup"
          cancelLabel="Cancel"
          danger
          busy={cleanupBusy}
          onCancel={() => !cleanupBusy && setCleanupOpen(false)}
          onConfirm={runTicketCleanup}
        />
      )}

      <div>
        <h1 className="font-display text-3xl font-bold text-clay-ink">Admin</h1>
        <p className="text-clay-muted">Operate GatherUp modules from one hub.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.to}
            to={c.to}
            className={`glass-card-interactive bg-gradient-to-br ${c.color} to-clay-surface p-6`}
          >
            <h2 className="font-display text-lg font-semibold text-clay-ink">{c.title}</h2>
            <p className="mt-2 text-sm text-clay-muted">{c.desc}</p>
          </Link>
        ))}
      </div>

      <section className="glass-card p-6">
        <h2 className="font-display text-lg font-semibold text-clay-ink">System maintenance</h2>
        <p className="mt-2 max-w-2xl text-sm text-clay-muted">
          Remove old ticket and registration records from the database (used check-ins or events that have ended).
          This does not delete events or user-submitted feedback.
        </p>
        <button
          type="button"
          className="btn-secondary mt-4 border-red-200 text-red-700 hover:bg-red-50"
          onClick={() => setCleanupOpen(true)}
        >
          Delete used/expired tickets
        </button>
      </section>
    </div>
  );
}
