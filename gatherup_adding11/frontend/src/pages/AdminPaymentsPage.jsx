import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function AdminPaymentsPage() {
  const { token } = useAuth();
  const [payments, setPayments] = useState([]);
  const [unpaidStudents, setUnpaidStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    const [paymentsRes, unpaidRes] = await Promise.all([
      api.get('/payments/admin'),
      api.get('/payments/admin/unpaid-students'),
    ]);
    setPayments(paymentsRes.data.payments || []);
    setUnpaidStudents(unpaidRes.data.students || []);
  }

  useEffect(() => {
    (async () => {
      try {
        await loadData();
      } catch (err) {
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleRefund(id) {
    const refundReason = prompt('Enter refund reason');
    if (refundReason === null) return;
    try {
      await api.post(`/payments/admin/${id}/refund`, { refundReason });
      await loadData();
      toast.success('Payment refunded');
    } catch (err) {
      toast.error(err.message);
    }
  }

  const stats = useMemo(() => {
    const completed = payments.filter((payment) => payment.status === 'completed');
    return {
      total: payments.length,
      revenue: completed.reduce((sum, payment) => sum + payment.amount, 0),
      pending: payments.filter((payment) => payment.status === 'pending').length,
      refunded: payments.filter((payment) => payment.status === 'refunded').length,
    };
  }, [payments]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-clay-ink">Admin Payments</h1>
          <p className="text-clay-muted">Manage receipts, refunds, unpaid students, and payment records.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/admin/payments/record" className="btn-primary">
            Record payment
          </Link>
          <Link to="/admin/payments/feedback" className="btn-secondary">
            Review feedback
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="glass-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-clay-muted">Total payments</p>
          <p className="mt-2 text-3xl font-bold text-clay-primary">{stats.total}</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-clay-muted">Revenue</p>
          <p className="mt-2 text-3xl font-bold text-emerald-600">Rs. {stats.revenue.toLocaleString()}</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-clay-muted">Pending</p>
          <p className="mt-2 text-3xl font-bold text-amber-500">{stats.pending}</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-clay-muted">Refunded</p>
          <p className="mt-2 text-3xl font-bold text-red-500">{stats.refunded}</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="glass-card p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-xl font-semibold text-clay-ink">All Payments</h2>
            {loading && <span className="text-sm text-clay-muted">Refreshing…</span>}
          </div>
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-clay-border text-clay-muted">
                <tr>
                  <th className="px-3 py-3 font-semibold">Student</th>
                  <th className="px-3 py-3 font-semibold">Event</th>
                  <th className="px-3 py-3 font-semibold">Amount</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-3 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment._id} className="border-b border-clay-border/60">
                    <td className="px-3 py-3">
                      <p className="font-medium text-clay-ink">{payment.userId?.name || 'Unknown'}</p>
                      <p className="text-xs text-clay-muted">{payment.userId?.email || '—'}</p>
                    </td>
                    <td className="px-3 py-3">{payment.eventName}</td>
                    <td className="px-3 py-3">Rs. {payment.amount.toLocaleString()}</td>
                    <td className="px-3 py-3">
                      <span className="rounded-full bg-clay-lilac px-3 py-1 text-xs font-semibold capitalize text-clay-primary">
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-3">
                        <Link
                          to={`/admin/payments/${payment._id}/edit`}
                          className="text-sm font-medium text-clay-primary hover:underline"
                        >
                          Edit
                        </Link>
                        <a
                          href={`/api/payments/admin/${payment._id}/receipt?token=${token}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm font-medium text-clay-secondary hover:underline"
                        >
                          Receipt
                        </a>
                        {payment.status !== 'refunded' && (
                          <button
                            type="button"
                            className="text-sm font-medium text-red-600 hover:underline"
                            onClick={() => handleRefund(payment._id)}
                          >
                            Refund
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && payments.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-3 py-6 text-center text-clay-muted">
                      No payments recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass-card p-5">
          <h2 className="font-display text-xl font-semibold text-clay-ink">Unpaid Students</h2>
          <p className="mt-1 text-sm text-clay-muted">
            Students without any completed payments in the shared database.
          </p>
          <div className="mt-5 space-y-3">
            {unpaidStudents.length === 0 ? (
              <p className="text-sm text-clay-muted">No unpaid students found.</p>
            ) : (
              unpaidStudents.map((student) => (
                <div key={student._id} className="rounded-2xl border border-clay-border bg-clay-bg/60 p-4">
                  <p className="font-medium text-clay-ink">{student.name}</p>
                  <p className="text-sm text-clay-muted">{student.email}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
