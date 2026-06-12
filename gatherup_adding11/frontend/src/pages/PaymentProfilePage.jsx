import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api.js';

export default function PaymentProfilePage() {
  const [user, setUser] = useState(null);
  const [cards, setCards] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cardForm, setCardForm] = useState({ cardName: '', cardNumber: '', expiry: '', cvv: '' });

  async function loadProfile() {
    const { data } = await api.get('/payments/me/profile');
    setUser(data.user);
    setCards(data.user?.savedCards || []);
  }

  useEffect(() => {
    (async () => {
      try {
        await loadProfile();
      } catch (err) {
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleAddCard(e) {
    e.preventDefault();
    try {
      const { data } = await api.post('/payments/me/cards', cardForm);
      setCards(data.cards || []);
      setShowForm(false);
      setCardForm({ cardName: '', cardNumber: '', expiry: '', cvv: '' });
      toast.success('Card saved');
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function deleteCard(cardId) {
    if (!confirm('Are you sure you want to remove this card?')) return;
    try {
      await api.delete(`/payments/me/cards/${cardId}`);
      toast.success('Card removed');
      await loadProfile();
    } catch (err) {
      toast.error(err.message);
    }
  }

  if (loading) return <p className="text-sm text-clay-muted">Loading profile…</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-clay-ink">Payment Profile</h1>
        <p className="text-clay-muted">Manage saved payment details under the same GatherUp account.</p>
      </div>

      <div className="glass-card p-6">
        <h2 className="font-display text-xl font-semibold text-clay-ink">Account Details</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-clay-muted">Name</p>
            <p className="mt-1 text-clay-ink">{user?.name}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-clay-muted">Email</p>
            <p className="mt-1 text-clay-ink">{user?.email}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-clay-muted">Role</p>
            <p className="mt-1 capitalize text-clay-ink">{user?.role}</p>
          </div>
        </div>
      </div>

      <div className="glass-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold text-clay-ink">Saved Cards</h2>
          <button type="button" className="btn-secondary" onClick={() => setShowForm((value) => !value)}>
            {showForm ? 'Cancel' : 'Add card'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleAddCard} className="mt-5 space-y-4 rounded-2xl bg-clay-bg/70 p-4">
            <div>
              <label className="label" htmlFor="card-name">
                Card Name
              </label>
              <input
                id="card-name"
                className="input-field"
                value={cardForm.cardName}
                onChange={(e) => setCardForm((prev) => ({ ...prev, cardName: e.target.value }))}
                placeholder="My Visa"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="label" htmlFor="card-number">
                  Card Number
                </label>
                <input
                  id="card-number"
                  className="input-field"
                  value={cardForm.cardNumber}
                  onChange={(e) =>
                    setCardForm((prev) => ({ ...prev, cardNumber: e.target.value.replace(/\D/g, '').slice(0, 16) }))
                  }
                  required
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="label" htmlFor="card-expiry">
                    Expiry
                  </label>
                  <input
                    id="card-expiry"
                    className="input-field"
                    value={cardForm.expiry}
                    onChange={(e) => setCardForm((prev) => ({ ...prev, expiry: e.target.value }))}
                    placeholder="12/26"
                    required
                  />
                </div>
                <div>
                  <label className="label" htmlFor="card-cvv">
                    CVV
                  </label>
                  <input
                    id="card-cvv"
                    className="input-field"
                    value={cardForm.cvv}
                    onChange={(e) =>
                      setCardForm((prev) => ({ ...prev, cvv: e.target.value.replace(/\D/g, '').slice(0, 3) }))
                    }
                    required
                  />
                </div>
              </div>
            </div>
            <button type="submit" className="btn-primary">
              Save card
            </button>
          </form>
        )}

        {cards.length === 0 ? (
          <p className="mt-5 text-sm text-clay-muted">No saved cards yet.</p>
        ) : (
          <div className="mt-5 space-y-3">
            {cards.map((card) => (
              <div
                key={card._id || card.cardNumber}
                className="group relative rounded-2xl border border-clay-border bg-clay-bg/60 p-4 transition-all hover:bg-clay-bg/80"
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium text-clay-ink">{card.cardName || 'Card'}</p>
                  <button
                    type="button"
                    onClick={() => deleteCard(card._id)}
                    className="text-clay-muted opacity-0 transition-opacity hover:text-red-600 group-hover:opacity-100"
                    title="Delete card"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 6h18" />
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                    </svg>
                  </button>
                </div>
                <p className="mt-1 text-sm text-clay-muted">
                  **** **** **** {card.cardNumber.slice(-4)} · Expires {card.expiry}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
