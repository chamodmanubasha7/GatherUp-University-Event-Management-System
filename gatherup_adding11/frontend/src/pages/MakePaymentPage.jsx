import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { formatDateRange } from '../utils/dates.js';

const NET_BANKS = [
  'Bank of Ceylon',
  'Commercial Bank',
  'Hatton National Bank',
  'Nations Trust Bank',
  "People's Bank",
  'Sampath Bank',
  'Seylan Bank',
];

const UPI_PROVIDERS = ['Google Pay', 'PhonePe', 'Paytm', 'BHIM', 'Other'];

function digitsOnly(value) {
  return String(value || '').replace(/\D/g, '');
}

function formatCardNumber(value) {
  return digitsOnly(value)
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, '$1 ')
    .trim();
}

function formatExpiry(value) {
  const digits = digitsOnly(value).slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function maskCard(card) {
  const last4 = digitsOnly(card.cardNumber).slice(-4);
  return `${card.cardName || 'Card'} (**** ${last4 || '0000'})`;
}

function buildSavedCardDetails(card) {
  return {
    cardName: card.cardName || 'Saved card',
    cardLast4: digitsOnly(card.cardNumber).slice(-4),
    cardExpiry: card.expiry || '',
    provider: 'saved-card',
    referenceNote: 'Saved card used for event ticket payment',
  };
}

function buildNewCardDetails(cardForm) {
  return {
    cardName: cardForm.cardName.trim() || 'Card',
    cardNumber: digitsOnly(cardForm.cardNumber),
    cardExpiry: cardForm.expiry.trim(),
    provider: 'new-card',
    referenceNote: 'New card used for event ticket payment',
  };
}

function getMethodSummary(method, paymentDetails) {
  if (method === 'card' && paymentDetails.cardLast4) {
    return `${paymentDetails.cardName || 'Card'} ending in ${paymentDetails.cardLast4}`;
  }
  if (method === 'netbanking') {
    return [paymentDetails.bankName, paymentDetails.accountHolder].filter(Boolean).join(' - ');
  }
  if (method === 'upi') {
    return [paymentDetails.provider, paymentDetails.upiId].filter(Boolean).join(' - ');
  }
  if (method === 'cash') {
    return paymentDetails.referenceNote || 'Cash payment recorded';
  }
  return '';
}

export default function MakePaymentPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, token } = useAuth();
  const eventId = searchParams.get('eventId');

  const [event, setEvent] = useState(null);
  const [savedCards, setSavedCards] = useState([]);
  const [selectedCardId, setSelectedCardId] = useState('new');
  const [form, setForm] = useState({ method: 'card', notes: '', transactionId: '' });
  const [cardForm, setCardForm] = useState({
    cardName: '',
    cardNumber: '',
    expiry: '',
    cvv: '',
    saveCard: true,
  });
  const [netBankingForm, setNetBankingForm] = useState({
    bankName: NET_BANKS[0],
    accountHolder: '',
    accountNumber: '',
    transactionReference: '',
  });
  const [upiForm, setUpiForm] = useState({
    provider: UPI_PROVIDERS[0],
    upiId: '',
    transactionReference: '',
  });
  const [cashForm, setCashForm] = useState({
    receivedFrom: '',
    deskReference: '',
  });
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(null);
  const [selectedTierIndex, setSelectedTierIndex] = useState(0);

  const totalAmount = useMemo(() => {
    if (!event) return 0;
    if (event.ticketingType === 'Ticket' && event.ticketTiers && event.ticketTiers.length > 0) {
      return Number(event.ticketTiers[selectedTierIndex]?.price || 0);
    }
    return Number(event.ticketPrice || 0);
  }, [event, selectedTierIndex]);
  const usingNewCard = form.method === 'card' && (savedCards.length === 0 || selectedCardId === 'new');

  useEffect(() => {
    async function loadCheckout() {
      try {
        if (!eventId) {
          setEvent(null);
          return;
        }

        const requests = [api.get(`/events/${eventId}`)];
        if (user) {
          requests.push(api.get('/payments/me/profile').catch(() => ({ data: { user: { savedCards: [] } } })));
        }

        const [eventRes, profileRes] = await Promise.all(requests);
        setEvent(eventRes.data);

        const cards = profileRes?.data?.user?.savedCards || [];
        setSavedCards(cards);
        setSelectedCardId(cards.length > 0 ? '0' : 'new');
      } catch (err) {
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadCheckout();
  }, [eventId, user]);

  useEffect(() => {
    if (form.method !== 'card') return;
    if (savedCards.length === 0) {
      setSelectedCardId('new');
      return;
    }
    setSelectedCardId((current) => (current === 'new' ? current : current || '0'));
  }, [form.method, savedCards]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!eventId || !event) {
      return;
    }

    setProcessing(true);
    setErrors({});
    try {
      let paymentDetails = {};
      let transactionId = form.transactionId.trim();

      if (form.method === 'card') {
        if (usingNewCard) {
          const cardNumber = digitsOnly(cardForm.cardNumber);
          if (cardNumber.length < 12 || !cardForm.expiry.trim() || digitsOnly(cardForm.cvv).length < 3) {
            throw new Error('Enter valid card number, expiry, and CVV');
          }

          const newCardPayload = {
            cardName: cardForm.cardName.trim() || 'My Card',
            cardNumber,
            expiry: cardForm.expiry.trim(),
            cvv: digitsOnly(cardForm.cvv).slice(0, 4),
          };

          if (cardForm.saveCard) {
            const { data } = await api.post('/payments/me/cards', newCardPayload);
            const cards = data.cards || [];
            setSavedCards(cards);
            setSelectedCardId(String(Math.max(cards.length - 1, 0)));
          }

          paymentDetails = buildNewCardDetails(newCardPayload);
        } else {
          const selected = savedCards[Number(selectedCardId)];
          if (!selected) {
            throw new Error('Choose a saved card or add a new card');
          }
          paymentDetails = buildSavedCardDetails(selected);
        }
      }

      if (form.method === 'netbanking') {
        const accountNumber = digitsOnly(netBankingForm.accountNumber);
        if (!netBankingForm.bankName || !netBankingForm.accountHolder.trim() || accountNumber.length < 6) {
          throw new Error('Enter bank name, account holder, and account number for net banking');
        }
        paymentDetails = {
          bankName: netBankingForm.bankName,
          accountHolder: netBankingForm.accountHolder.trim(),
          accountNumber,
          provider: 'netbanking',
          referenceNote: 'Ticket payment through net banking',
        };
        transactionId ||= netBankingForm.transactionReference.trim();
      }

      if (form.method === 'upi') {
        if (!upiForm.upiId.trim()) {
          throw new Error('Enter a UPI ID to continue');
        }
        paymentDetails = {
          upiId: upiForm.upiId.trim(),
          provider: upiForm.provider,
          accountHolder: user?.name || '',
          referenceNote: 'Ticket payment through UPI',
        };
        transactionId ||= upiForm.transactionReference.trim();
      }

      if (form.method === 'cash') {
        paymentDetails = {
          accountHolder: cashForm.receivedFrom.trim() || user?.name || '',
          provider: 'cash',
          referenceNote: cashForm.deskReference.trim() || 'Cash desk collection',
        };
        transactionId ||= cashForm.deskReference.trim();
      }

      const { data } = await api.post(`/registrations/event/${eventId}/purchase`, {
        method: form.method,
        transactionId,
        notes: form.notes,
        paymentDetails,
        ticketTier: event?.ticketTiers?.[selectedTierIndex]?.name || null,
      });

      setSuccess(data);
      toast.success('Payment completed and unique QR ticket created');
    } catch (err) {
      const backendErrors = err.response?.data?.errors;
      if (backendErrors && Array.isArray(backendErrors)) {
        const errorMap = {};
        backendErrors.forEach((error) => { errorMap[error.field] = error.msg; });
        setErrors(errorMap);
        toast.error('Payment failed. Please correct the highlighted fields.');
      } else {
        toast.error(err.message || 'Payment failed. Please check your details and try again.');
      }
    } finally {
      setProcessing(false);
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

  if (loading) {
    return <div className="py-20 text-center text-clay-muted">Loading checkout...</div>;
  }

  if (!eventId || !event) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="glass-card p-6">
          <h1 className="font-display text-2xl font-bold text-clay-ink">Ticket Payment</h1>
          <p className="mt-3 text-clay-muted">
            This page gets event details automatically from the booking flow. Open an event and click
            <span className="font-medium text-clay-ink"> Buy ticket</span>.
          </p>
          <Link to="/events" className="btn-primary mt-5">
            Browse events
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link to={`/events/${eventId}`} className="text-sm font-medium text-clay-primary hover:underline">
          Back to event
        </Link>
        <Link to="/dashboard?tab=tickets" className="btn-secondary">
          My tickets
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.15fr_.85fr]">
        <div className="glass-card overflow-hidden">
          <div
            className="h-56 w-full bg-cover bg-center"
            style={
              event.image
                ? { backgroundImage: `url(${event.image})` }
                : { background: 'linear-gradient(135deg,#7c3aed,#10b981)' }
            }
          />
          <div className="space-y-4 p-6">
            <p className="text-sm font-medium text-accent-600">{event.category?.name}</p>
            <h1 className="font-display text-3xl font-bold text-clay-ink">{event.title}</h1>
            <p className="text-clay-muted">{event.description}</p>
            <div className="grid gap-3 text-sm text-clay-muted md:grid-cols-2">
              <div>
                <p className="font-medium text-clay-subtle">When</p>
                <p>{formatDateRange(event.startDateTime, event.endDateTime)}</p>
              </div>
              <div>
                <p className="font-medium text-clay-subtle">Where</p>
                <p>
                  {event.venue?.name} - {event.venue?.location}
                </p>
              </div>
              <div>
                <p className="font-medium text-clay-subtle">Capacity</p>
                <p>
                  {event.registrationCount ?? 0} / {event.capacity}
                </p>
              </div>
              <div>
                <p className="font-medium text-clay-subtle">Ticket Price</p>
                <p className="font-semibold text-clay-ink">Rs. {totalAmount.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card p-6">
            <h2 className="font-display text-xl font-semibold text-clay-ink">Complete payment</h2>
            <p className="mt-2 text-sm text-clay-muted">
              The same ticket checkout now supports cards, net banking, UPI, and cash. Once it succeeds, the
              registration and unique QR ticket are created automatically.
            </p>

            {!user ? (
              <Link to="/login" className="btn-primary mt-4 block w-full text-center">
                Log in to continue
              </Link>
            ) : (
              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                <div className="rounded-2xl border border-clay-border bg-clay-bg/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-clay-muted">Booking Event</p>
                  <p className="mt-1 font-medium text-clay-ink">{event.title}</p>
                  <p className="mt-1 text-sm text-clay-muted">
                    {formatDateRange(event.startDateTime, event.endDateTime)}
                  </p>
                </div>

                {event.ticketTiers && event.ticketTiers.length > 0 && (
                  <div>
                    <label className="label" htmlFor="ticket-tier">
                      Ticket Tier
                    </label>
                    <select
                      id="ticket-tier"
                      className="input-field"
                      value={selectedTierIndex}
                      onChange={(e) => setSelectedTierIndex(Number(e.target.value))}
                    >
                      {event.ticketTiers.map((tier, idx) => (
                        <option key={idx} value={idx}>
                          {tier.name} - Rs. {tier.price.toLocaleString()}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="label" htmlFor="payment-method">
                    Payment Method
                  </label>
                  <select
                    id="payment-method"
                    className="input-field"
                    value={form.method}
                    onChange={(e) => setForm((prev) => ({ ...prev, method: e.target.value }))}
                  >
                    <option value="card">Card</option>
                    <option value="netbanking">Net Banking</option>
                    <option value="upi">UPI</option>
                    <option value="cash">Cash</option>
                  </select>
                </div>

                {form.method === 'card' && (
                  <div className="space-y-4 rounded-2xl border border-clay-border bg-clay-bg/60 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-clay-ink">Card payment</p>
                        <p className="text-xs text-clay-muted">Use a saved card or add one during checkout.</p>
                      </div>
                      <Link to="/payments/profile" className="text-sm font-medium text-clay-primary hover:underline">
                        Manage saved cards
                      </Link>
                    </div>

                    {savedCards.length > 0 && (
                      <div>
                        <label className="label" htmlFor="payment-card">
                          Choose Card
                        </label>
                        <select
                          id="payment-card"
                          className="input-field"
                          value={selectedCardId}
                          onChange={(e) => setSelectedCardId(e.target.value)}
                        >
                          {savedCards.map((card, index) => (
                            <option key={`${card.cardNumber}-${index}`} value={String(index)}>
                              {maskCard(card)}
                            </option>
                          ))}
                          <option value="new">Add a new card</option>
                        </select>
                      </div>
                    )}

                    {usingNewCard ? (
                      <>
                        <div>
                          <label className="label" htmlFor="card-name">
                            Card Name
                          </label>
                          <input
                            id="card-name"
                            className={`input-field ${errors.cardName ? 'input-error' : ''}`}
                            value={cardForm.cardName}
                            onChange={(e) => setCardForm((prev) => ({ ...prev, cardName: e.target.value }))}
                            placeholder="Campus Visa"
                          />
                          {renderError('cardName')}
                        </div>
                        <div>
                          <label className="label" htmlFor="card-number">
                            Card Number
                          </label>
                          <input
                            id="card-number"
                            className={`input-field ${errors.cardNumber ? 'input-error' : ''}`}
                            inputMode="numeric"
                            value={cardForm.cardNumber}
                            onChange={(e) =>
                              setCardForm((prev) => ({ ...prev, cardNumber: formatCardNumber(e.target.value) }))
                            }
                            placeholder="4242 4242 4242 4242"
                            required
                          />
                          {renderError('cardNumber')}
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <label className="label" htmlFor="card-expiry">
                              Expiry
                            </label>
                            <input
                              id="card-expiry"
                              className={`input-field ${errors.expiry ? 'input-error' : ''}`}
                              inputMode="numeric"
                              value={cardForm.expiry}
                              onChange={(e) =>
                                setCardForm((prev) => ({ ...prev, expiry: formatExpiry(e.target.value) }))
                              }
                              placeholder="12/28"
                              required
                            />
                            {renderError('expiry')}
                          </div>
                          <div>
                            <label className="label" htmlFor="card-cvv">
                              CVV
                            </label>
                            <input
                              id="card-cvv"
                              className={`input-field ${errors.cvv ? 'input-error' : ''}`}
                              inputMode="numeric"
                              value={cardForm.cvv}
                              onChange={(e) =>
                                setCardForm((prev) => ({
                                  ...prev,
                                  cvv: digitsOnly(e.target.value).slice(0, 4),
                                }))
                              }
                              placeholder="123"
                              required
                            />
                            {renderError('cvv')}
                          </div>
                        </div>
                        <label className="flex items-center gap-2 text-sm text-clay-muted">
                          <input
                            type="checkbox"
                            checked={cardForm.saveCard}
                            onChange={(e) => setCardForm((prev) => ({ ...prev, saveCard: e.target.checked }))}
                          />
                          Save this card to my payment profile
                        </label>
                      </>
                    ) : (
                      <div className="rounded-2xl bg-clay-peach/30 p-4 text-sm text-clay-muted">
                        {maskCard(savedCards[Number(selectedCardId)] || {})} will be used for this ticket purchase.
                      </div>
                    )}
                  </div>
                )}

                {form.method === 'netbanking' && (
                  <div className="space-y-4 rounded-2xl border border-clay-border bg-clay-bg/60 p-4">
                    <p className="text-sm font-semibold text-clay-ink">Net banking details</p>
                    <div>
                      <label className="label" htmlFor="bank-name">
                        Bank
                      </label>
                      <select
                        id="bank-name"
                        className="input-field"
                        value={netBankingForm.bankName}
                        onChange={(e) =>
                          setNetBankingForm((prev) => ({ ...prev, bankName: e.target.value }))
                        }
                      >
                        {NET_BANKS.map((bank) => (
                          <option key={bank} value={bank}>
                            {bank}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label" htmlFor="account-holder">
                        Account Holder
                      </label>
                      <input
                        id="account-holder"
                        className={`input-field ${errors.accountHolder ? 'input-error' : ''}`}
                        value={netBankingForm.accountHolder}
                        onChange={(e) =>
                          setNetBankingForm((prev) => ({ ...prev, accountHolder: e.target.value }))
                        }
                        placeholder="Student account name"
                        required
                      />
                      {renderError('accountHolder')}
                    </div>
                    <div>
                      <label className="label" htmlFor="account-number">
                        Account Number
                      </label>
                      <input
                        id="account-number"
                        className={`input-field ${errors.accountNumber ? 'input-error' : ''}`}
                        inputMode="numeric"
                        value={netBankingForm.accountNumber}
                        onChange={(e) =>
                          setNetBankingForm((prev) => ({
                            ...prev,
                            accountNumber: digitsOnly(e.target.value).slice(0, 18),
                          }))
                        }
                        placeholder="Enter account number"
                        required
                      />
                      {renderError('accountNumber')}
                    </div>
                    <div>
                      <label className="label" htmlFor="netbanking-reference">
                        Bank Reference (optional)
                      </label>
                      <input
                        id="netbanking-reference"
                        className="input-field"
                        value={netBankingForm.transactionReference}
                        onChange={(e) =>
                          setNetBankingForm((prev) => ({
                            ...prev,
                            transactionReference: e.target.value,
                          }))
                        }
                        placeholder="NEFT / transfer reference"
                      />
                    </div>
                  </div>
                )}

                {form.method === 'upi' && (
                  <div className="space-y-4 rounded-2xl border border-clay-border bg-clay-bg/60 p-4">
                    <p className="text-sm font-semibold text-clay-ink">UPI details</p>
                    <div>
                      <label className="label" htmlFor="upi-provider">
                        App
                      </label>
                      <select
                        id="upi-provider"
                        className="input-field"
                        value={upiForm.provider}
                        onChange={(e) => setUpiForm((prev) => ({ ...prev, provider: e.target.value }))}
                      >
                        {UPI_PROVIDERS.map((provider) => (
                          <option key={provider} value={provider}>
                            {provider}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label" htmlFor="upi-id">
                        UPI ID
                      </label>
                      <input
                        id="upi-id"
                        className={`input-field ${errors.upiId ? 'input-error' : ''}`}
                        value={upiForm.upiId}
                        onChange={(e) => setUpiForm((prev) => ({ ...prev, upiId: e.target.value }))}
                        placeholder="student@upi"
                        required
                      />
                      {renderError('upiId')}
                    </div>
                    <div>
                      <label className="label" htmlFor="upi-reference">
                        UPI Reference (optional)
                      </label>
                      <input
                        id="upi-reference"
                        className="input-field"
                        value={upiForm.transactionReference}
                        onChange={(e) =>
                          setUpiForm((prev) => ({ ...prev, transactionReference: e.target.value }))
                        }
                        placeholder="UPI transaction reference"
                      />
                    </div>
                  </div>
                )}

                {form.method === 'cash' && (
                  <div className="space-y-4 rounded-2xl border border-clay-border bg-clay-bg/60 p-4">
                    <p className="text-sm font-semibold text-clay-ink">Cash collection details</p>
                    <div>
                      <label className="label" htmlFor="cash-from">
                        Received From
                      </label>
                      <input
                        id="cash-from"
                        className="input-field"
                        value={cashForm.receivedFrom}
                        onChange={(e) => setCashForm((prev) => ({ ...prev, receivedFrom: e.target.value }))}
                        placeholder="Student name"
                      />
                    </div>
                    <div>
                      <label className="label" htmlFor="cash-reference">
                        Desk Reference
                      </label>
                      <input
                        id="cash-reference"
                        className="input-field"
                        value={cashForm.deskReference}
                        onChange={(e) => setCashForm((prev) => ({ ...prev, deskReference: e.target.value }))}
                        placeholder="Counter receipt or desk note"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="label" htmlFor="payment-transaction-id">
                    Transaction ID (optional)
                  </label>
                  <input
                    id="payment-transaction-id"
                    className="input-field"
                    value={form.transactionId}
                    onChange={(e) => setForm((prev) => ({ ...prev, transactionId: e.target.value }))}
                    placeholder="Leave blank to auto-generate"
                  />
                </div>

                <div>
                  <label className="label" htmlFor="payment-notes">
                    Notes (optional)
                  </label>
                  <textarea
                    id="payment-notes"
                    className="input-field min-h-24"
                    value={form.notes}
                    onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder="Anything the payments team should know about this booking"
                  />
                </div>

                <div className="rounded-2xl bg-clay-peach/30 p-4">
                  <p className="text-sm text-clay-muted">Total</p>
                  <p className="mt-1 text-3xl font-bold text-clay-primary">Rs. {totalAmount.toLocaleString()}</p>
                </div>

                <button type="submit" className="btn-primary w-full" disabled={processing}>
                  {processing ? 'Processing payment...' : 'Pay and generate QR ticket'}
                </button>
              </form>
            )}
          </div>

          {success?.ticket && (
            <div className="glass-card p-6">
              <h2 className="font-display text-xl font-semibold text-clay-ink">Ticket generated</h2>
              <p className="mt-2 text-sm text-clay-muted">
                The event details came from the booking event and a unique QR was generated as soon as payment
                finished.
              </p>
              <div className="mt-4 rounded-2xl bg-clay-bg/60 p-4 text-sm text-clay-muted">
                <p>
                  <span className="font-medium text-clay-ink">Event:</span> {success.event.title}
                </p>
                <p>
                  <span className="font-medium text-clay-ink">Payment ID:</span> {success.payment._id}
                </p>
                <p>
                  <span className="font-medium text-clay-ink">Transaction:</span> {success.payment.transactionId}
                </p>
                <p>
                  <span className="font-medium text-clay-ink">Method:</span>{' '}
                  {getMethodSummary(success.payment.method, success.payment.paymentDetails)}
                </p>
              </div>
              <div className="mt-4 flex justify-center rounded-2xl bg-white p-4">
                <img src={success.ticket.qrCode} alt="Generated ticket QR" className="h-56 w-56" />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  href={`/api/payments/me/${success.payment._id}/receipt?token=${token}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary"
                >
                  Open receipt
                </a>
                <button type="button" className="btn-primary" onClick={() => navigate('/dashboard?tab=tickets')}>
                  Go to my tickets
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
