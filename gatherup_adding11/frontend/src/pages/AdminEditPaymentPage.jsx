import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api.js';

export default function AdminEditPaymentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/payments/admin/${id}`);
        const payment = data.payment;
        setForm({
          eventName: payment.eventName,
          amount: payment.amount,
          method: payment.method,
          transactionId: payment.transactionId || '',
          notes: payment.notes || '',
          status: payment.status,
        });
      } catch (err) {
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/payments/admin/${id}`, {
        ...form,
        amount: Number(form.amount),
      });
      toast.success('Payment updated');
      navigate('/admin/payments');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-clay-muted">Loading payment…</p>;
  if (!form) {
    return (
      <div className="glass-card p-6">
        <p className="text-clay-muted">Payment not found.</p>
        <Link to="/admin/payments" className="btn-secondary mt-4">
          Back to payments
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-clay-ink">Edit Payment</h1>
        <p className="text-clay-muted">Update a payment record without leaving the unified admin area.</p>
      </div>

      <form onSubmit={handleSubmit} className="glass-card space-y-5 p-6">
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="label" htmlFor="edit-event-name">
              Event Name
            </label>
            <input
              id="edit-event-name"
              className="input-field"
              value={form.eventName}
              onChange={(e) => setForm((prev) => ({ ...prev, eventName: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="edit-amount">
              Amount
            </label>
            <input
              id="edit-amount"
              className="input-field"
              type="number"
              min="1"
              value={form.amount}
              onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
              required
            />
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="label" htmlFor="edit-method">
              Method
            </label>
            <select
              id="edit-method"
              className="input-field"
              value={form.method}
              onChange={(e) => setForm((prev) => ({ ...prev, method: e.target.value }))}
            >
              <option value="card">Card</option>
              <option value="upi">UPI</option>
              <option value="netbanking">Net Banking</option>
              <option value="cash">Cash</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="edit-status">
              Status
            </label>
            <select
              id="edit-status"
              className="input-field"
              value={form.status}
              onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
            >
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="edit-transaction">
            Transaction ID
          </label>
          <input
            id="edit-transaction"
            className="input-field"
            value={form.transactionId}
            onChange={(e) => setForm((prev) => ({ ...prev, transactionId: e.target.value }))}
          />
        </div>

        <div>
          <label className="label" htmlFor="edit-notes">
            Notes
          </label>
          <textarea
            id="edit-notes"
            className="input-field min-h-28"
            value={form.notes}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          <Link to="/admin/payments" className="btn-secondary">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
