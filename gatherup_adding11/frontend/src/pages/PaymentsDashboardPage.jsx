import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function PaymentsDashboardPage() {
  const { user, token } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/payments/me');
        setPayments(data.payments || []);
      } catch (err) {
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const completed = payments.filter((payment) => payment.status === 'completed');
  const totalSpent = completed.reduce((sum, payment) => sum + payment.amount, 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-clay-ink">Payments</h1>
          <p className="text-clay-muted">Track your receipts, reviews, and payment activity in one place.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/payments/new" className="btn-primary">
            Make payment
          </Link>
          <Link to="/payments/feedback" className="btn-secondary">
            Leave feedback
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="glass-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-clay-muted">Total payments</p>
          <p className="mt-2 text-3xl font-bold text-clay-primary">{payments.length}</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-clay-muted">Completed spend</p>
          <p className="mt-2 text-3xl font-bold text-emerald-600">Rs. {totalSpent.toLocaleString()}</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-clay-muted">Completed events</p>
          <p className="mt-2 text-3xl font-bold text-clay-secondary">{completed.length}</p>
        </div>
      </div>

      <div className="glass-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-semibold text-clay-ink">Recent payments</h2>
            <p className="text-sm text-clay-muted">Signed in as {user?.name}</p>
          </div>
          <Link to="/payments/history" className="text-sm font-medium text-clay-primary hover:underline">
            View full history
          </Link>
        </div>
        {loading ? (
          <p className="mt-6 text-sm text-clay-muted">Loading payments…</p>
        ) : payments.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-clay-border p-8 text-center">
            <p className="text-clay-muted">No payments yet. Your first receipt will appear here.</p>
            <Link to="/payments/new" className="btn-primary mt-4">
              Pay now
            </Link>
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-clay-border text-clay-muted">
                <tr>
                  <th className="px-3 py-3 font-semibold">Event</th>
                  <th className="px-3 py-3 font-semibold">Amount</th>
                  <th className="px-3 py-3 font-semibold">Method</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-3 py-3 font-semibold">Receipt</th>
                </tr>
              </thead>
              <tbody>
                {payments.slice(0, 5).map((payment) => (
                  <tr key={payment._id} className="border-b border-clay-border/60">
                    <td className="px-3 py-3 font-medium text-clay-ink">{payment.eventName}</td>
                    <td className="px-3 py-3">Rs. {payment.amount.toLocaleString()}</td>
                    <td className="px-3 py-3 capitalize">{payment.method}</td>
                    <td className="px-3 py-3">
                      <span className="rounded-full bg-clay-lilac px-3 py-1 text-xs font-semibold capitalize text-clay-primary">
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <a
                        href={`/api/payments/me/${payment._id}/receipt?token=${token}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-medium text-clay-primary hover:underline"
                      >
                        Download
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
