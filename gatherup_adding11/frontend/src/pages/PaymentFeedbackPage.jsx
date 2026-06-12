import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api.js';
import StarRating from '../components/StarRating.jsx';

export default function PaymentFeedbackPage() {
  const { state } = useLocation();
  const [completedPayments, setCompletedPayments] = useState([]);
  const [myFeedbacks, setMyFeedbacks] = useState([]);
  const [selectedPayment, setSelectedPayment] = useState(state?.paymentId || '');
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [editingFeedbackId, setEditingFeedbackId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  async function loadData() {
    const [paymentsRes, feedbackRes] = await Promise.all([
      api.get('/payments/me'),
      api.get('/payments/feedback/mine'),
    ]);
    setCompletedPayments((paymentsRes.data.payments || []).filter((payment) => payment.status === 'completed'));
    setMyFeedbacks(feedbackRes.data.feedbacks || []);
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

  function resetForm() {
    setEditingFeedbackId(null);
    setSelectedPayment('');
    setRating(0);
    setComment('');
  }

  function alreadyReviewed(paymentId) {
    return myFeedbacks.some(
      (feedback) =>
        (feedback.paymentId?._id === paymentId || feedback.paymentId === paymentId) &&
        feedback._id !== editingFeedbackId
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selectedPayment || !rating) {
      toast.error('Select a payment and star rating first');
      return;
    }

    setSubmitting(true);
    try {
      if (editingFeedbackId) {
        await api.put(`/payments/feedback/mine/${editingFeedbackId}`, { rating, comment });
        toast.success('Feedback updated');
      } else {
        await api.post('/payments/feedback', { paymentId: selectedPayment, rating, comment });
        toast.success('Feedback submitted');
      }
      resetForm();
      await loadData();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this review?')) return;
    try {
      await api.delete(`/payments/feedback/mine/${id}`);
      if (editingFeedbackId === id) resetForm();
      await loadData();
      toast.success('Feedback deleted');
    } catch (err) {
      toast.error(err.message);
    }
  }

  const eligiblePayments = completedPayments.filter((payment) => !alreadyReviewed(payment._id));
  const selectedEvent = completedPayments.find((payment) => payment._id === selectedPayment);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-clay-ink">Payment Feedback</h1>
        <p className="text-clay-muted">Attendees can review only events with completed payments.</p>
      </div>

      {loading ? (
        <p className="text-sm text-clay-muted">Loading feedback workspace…</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="glass-card p-6">
            <h2 className="font-display text-xl font-semibold text-clay-ink">
              {editingFeedbackId ? 'Edit Review' : 'Leave a Review'}
            </h2>
            {completedPayments.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-clay-border p-6 text-center">
                <p className="text-clay-muted">Complete a payment before leaving feedback.</p>
                <Link to="/payments/new" className="btn-primary mt-4">
                  Make payment
                </Link>
              </div>
            ) : eligiblePayments.length === 0 && !editingFeedbackId ? (
              <p className="mt-4 text-sm text-clay-muted">You have reviewed all completed payments.</p>
            ) : (
              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                <div>
                  <label className="label" htmlFor="payment-feedback-select">
                    Payment / Event
                  </label>
                  <select
                    id="payment-feedback-select"
                    className="input-field"
                    value={selectedPayment}
                    onChange={(e) => setSelectedPayment(e.target.value)}
                    disabled={!!editingFeedbackId}
                    required
                  >
                    <option value="">Choose a completed payment</option>
                    {(editingFeedbackId ? completedPayments : eligiblePayments).map((payment) => (
                      <option key={payment._id} value={payment._id}>
                        {payment.eventName} - Rs. {payment.amount} ({new Date(payment.createdAt).toLocaleDateString()})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedEvent && (
                  <div className="rounded-2xl bg-clay-peach/30 p-4 text-sm text-clay-muted">
                    <span className="font-medium text-clay-ink">{selectedEvent.eventName}</span> · Rs.{' '}
                    {selectedEvent.amount} · completed
                  </div>
                )}

                <div>
                  <label className="label">Rating</label>
                  <StarRating value={rating} onChange={setRating} />
                </div>

                <div>
                  <label className="label" htmlFor="payment-feedback-comment">
                    Comment
                  </label>
                  <textarea
                    id="payment-feedback-comment"
                    className="input-field min-h-28"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Share what worked well and what could improve."
                  />
                </div>

                <div className="flex flex-wrap gap-3">
                  <button type="submit" className="btn-primary" disabled={submitting}>
                    {submitting ? 'Saving…' : editingFeedbackId ? 'Update feedback' : 'Submit feedback'}
                  </button>
                  {editingFeedbackId && (
                    <button type="button" className="btn-secondary" onClick={resetForm}>
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>

          <div className="glass-card p-6">
            <h2 className="font-display text-xl font-semibold text-clay-ink">My Reviews</h2>
            {myFeedbacks.length === 0 ? (
              <p className="mt-5 text-sm text-clay-muted">No reviews submitted yet.</p>
            ) : (
              <div className="mt-5 space-y-4">
                {myFeedbacks.map((feedback) => (
                  <div key={feedback._id} className="rounded-2xl border border-clay-border bg-clay-bg/60 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-clay-ink">{feedback.paymentId?.eventName || 'Event'}</p>
                        <p className="text-xs text-clay-muted">
                          {new Date(feedback.createdAt).toLocaleDateString()}
                          {feedback.createdAt !== feedback.updatedAt ? ' · edited' : ''}
                        </p>
                      </div>
                      <div className="flex gap-3 text-sm">
                        <button
                          type="button"
                          className="font-medium text-clay-primary hover:underline"
                          onClick={() => {
                            setEditingFeedbackId(feedback._id);
                            setSelectedPayment(feedback.paymentId?._id || feedback.paymentId);
                            setRating(feedback.rating);
                            setComment(feedback.comment || '');
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="font-medium text-red-600 hover:underline"
                          onClick={() => handleDelete(feedback._id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <div className="mt-3">
                      <StarRating value={feedback.rating} readOnly />
                    </div>
                    {feedback.comment && <p className="mt-3 text-sm text-clay-muted">{feedback.comment}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
