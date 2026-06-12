import { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function AdminRecordPaymentPage() {
  const { token } = useAuth();
  const [form, setForm] = useState({
    userId: '',
    eventName: '',
    amount: '',
    method: 'card',
    transactionId: '',
    notes: '',
    status: 'completed',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [savedPayment, setSavedPayment] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    try {
      const { data } = await api.post('/payments/admin', {
        ...form,
        amount: Number(form.amount),
      });
      setSavedPayment(data.payment);
      setForm({
        userId: '',
        eventName: '',
        amount: '',
        method: 'card',
        transactionId: '',
        notes: '',
        status: 'completed',
      });
      toast.success('Payment recorded');
    } catch (err) {
      const backendErrors = err.response?.data?.errors;
      if (backendErrors && Array.isArray(backendErrors)) {
        const errorMap = {};
        backendErrors.forEach((error) => { errorMap[error.field] = error.msg; });
        setErrors(errorMap);
        toast.error('Could not record payment. Check the highlighted fields.');
      } else {
        toast.error(err.message || 'Action failed');
      }
    } finally {
      setLoading(false);
    }
  }

  const renderError = (field) => {
    if (!errors[field]) return null;
    return (
      <div className="error-text">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        {errors[field]}
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-clay-ink">Record Payment</h1>
        <p className="text-clay-muted">Admins can manually add a payment for any student account.</p>
      </div>

      {savedPayment && (
        <div className="glass-card border border-emerald-200 p-4">
          <p className="font-medium text-emerald-700">
            Payment saved for {savedPayment.userId?.name || savedPayment.userId}
          </p>
          <a
            href={`/api/payments/admin/${savedPayment._id}/receipt?token=${token}`}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex text-sm font-medium text-clay-primary hover:underline"
          >
            Download receipt
          </a>
        </div>
      )}

      <form onSubmit={handleSubmit} className="glass-card space-y-5 p-6">
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="label" htmlFor="admin-user-id">
              Student User ID
            </label>
            <input
              id="admin-user-id"
              className={`input-field ${errors.userId ? 'input-error' : ''}`}
              value={form.userId}
              onChange={(e) => setForm((prev) => ({ ...prev, userId: e.target.value }))}
              required
            />
            {renderError('userId')}
          </div>
          <div>
            <label className="label" htmlFor="admin-event-name">
              Event Name
            </label>
            <input
              id="admin-event-name"
              className={`input-field ${errors.eventName ? 'input-error' : ''}`}
              value={form.eventName}
              onChange={(e) => setForm((prev) => ({ ...prev, eventName: e.target.value }))}
              required
            />
            {renderError('eventName')}
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="label" htmlFor="admin-amount">
              Amount
            </label>
            <input
              id="admin-amount"
              className={`input-field ${errors.amount ? 'input-error' : ''}`}
              type="number"
              min="1"
              value={form.amount}
              onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
              required
            />
            {renderError('amount')}
          </div>
          <div>
            <label className="label" htmlFor="admin-method">
              Method
            </label>
            <select
              id="admin-method"
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
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="label" htmlFor="admin-transaction-id">
              Transaction ID
            </label>
            <input
              id="admin-transaction-id"
              className={`input-field ${errors.transactionId ? 'input-error' : ''}`}
              value={form.transactionId}
              onChange={(e) => setForm((prev) => ({ ...prev, transactionId: e.target.value }))}
            />
            {renderError('transactionId')}
          </div>
          <div>
            <label className="label" htmlFor="admin-status">
              Status
            </label>
            <select
              id="admin-status"
              className="input-field"
              value={form.status}
              onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
            >
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="admin-notes">
            Notes
          </label>
          <textarea
            id="admin-notes"
            className="input-field min-h-28"
            value={form.notes}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
          />
        </div>

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Recording…' : 'Record payment'}
        </button>
      </form>
    </div>
  );
}
