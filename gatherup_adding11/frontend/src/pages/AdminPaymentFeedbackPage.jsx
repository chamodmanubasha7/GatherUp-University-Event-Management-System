import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api.js';
import StarRating from '../components/StarRating.jsx';

export default function AdminPaymentFeedbackPage() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    const { data } = await api.get('/payments/feedback/all');
    setFeedbacks(data.feedbacks || []);
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

  async function handleDelete(id) {
    if (!confirm('Delete this feedback entry?')) return;
    try {
      await api.delete(`/payments/feedback/${id}`);
      await loadData();
      toast.success('Feedback deleted');
    } catch (err) {
      toast.error(err.message);
    }
  }

  const average = useMemo(() => {
    if (feedbacks.length === 0) return '0.0';
    return (feedbacks.reduce((sum, feedback) => sum + feedback.rating, 0) / feedbacks.length).toFixed(1);
  }, [feedbacks]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-clay-ink">Payment Feedback Reviews</h1>
        <p className="text-clay-muted">Admin-only review board for attendee payment feedback.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="glass-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-clay-muted">Total reviews</p>
          <p className="mt-2 text-3xl font-bold text-clay-primary">{feedbacks.length}</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-clay-muted">Average rating</p>
          <p className="mt-2 text-3xl font-bold text-amber-500">{average}</p>
        </div>
      </div>

      <div className="glass-card p-6">
        {loading ? (
          <p className="text-sm text-clay-muted">Loading feedback…</p>
        ) : feedbacks.length === 0 ? (
          <p className="text-sm text-clay-muted">No payment feedback submitted yet.</p>
        ) : (
          <div className="space-y-4">
            {feedbacks.map((feedback) => (
              <div key={feedback._id} className="rounded-2xl border border-clay-border bg-clay-bg/60 p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-clay-ink">{feedback.userId?.name || 'Student'}</p>
                    <p className="text-sm text-clay-muted">{feedback.userId?.email}</p>
                    <p className="mt-1 text-sm text-clay-muted">
                      Event: <span className="font-medium text-clay-ink">{feedback.paymentId?.eventName}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-clay-muted">
                      {new Date(feedback.createdAt).toLocaleDateString()}
                    </p>
                    <button
                      type="button"
                      className="mt-2 text-sm font-medium text-red-600 hover:underline"
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
  );
}
