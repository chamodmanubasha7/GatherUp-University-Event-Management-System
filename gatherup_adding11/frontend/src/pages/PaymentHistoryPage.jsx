import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function PaymentHistoryPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-clay-ink">Payment History</h1>
          <p className="text-clay-muted">Every payment, receipt, and review action tied to your account.</p>
        </div>
        <Link to="/payments/new" className="btn-primary">
          New payment
        </Link>
      </div>

      <div className="glass-card p-5">
        {loading ? (
          <p className="text-sm text-clay-muted">Loading payment history…</p>
        ) : payments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-clay-border p-8 text-center">
            <p className="text-clay-muted">No payments recorded yet.</p>
            <Link to="/payments/new" className="btn-primary mt-4">
              Make your first payment
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-clay-border text-clay-muted">
                <tr>
                  <th className="px-3 py-3 font-semibold">Event</th>
                  <th className="px-3 py-3 font-semibold">Amount</th>
                  <th className="px-3 py-3 font-semibold">Method</th>
                  <th className="px-3 py-3 font-semibold">Transaction</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-3 py-3 font-semibold">Date</th>
                  <th className="px-3 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment._id} className="border-b border-clay-border/60">
                    <td className="px-3 py-3 font-medium text-clay-ink">{payment.eventName}</td>
                    <td className="px-3 py-3">Rs. {payment.amount.toLocaleString()}</td>
                    <td className="px-3 py-3 capitalize">{payment.method}</td>
                    <td className="px-3 py-3 font-mono text-xs text-clay-muted">
                      {payment.transactionId || '—'}
                    </td>
                    <td className="px-3 py-3">
                      <span className="rounded-full bg-clay-lilac px-3 py-1 text-xs font-semibold capitalize text-clay-primary">
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-3 py-3">{new Date(payment.createdAt).toLocaleDateString()}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        <a
                          href={`/api/payments/me/${payment._id}/receipt?token=${token}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm font-medium text-clay-primary hover:underline"
                        >
                          Receipt
                        </a>
                        {payment.status === 'completed' && (
                          <button
                            type="button"
                            className="text-sm font-medium text-clay-secondary hover:underline"
                            onClick={() =>
                              navigate('/payments/feedback', {
                                state: { paymentId: payment._id, eventName: payment.eventName },
                              })
                            }
                          >
                            Review
                          </button>
                        )}
                      </div>
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
