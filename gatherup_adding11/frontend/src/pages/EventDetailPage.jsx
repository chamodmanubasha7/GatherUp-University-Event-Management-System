import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import { formatDateRange, isUpcoming, eventNotStartedYet } from '../utils/dates.js';
import StarRating from '../components/StarRating.jsx';
import { Share2, Copy, Calendar, Clock, MapPin, MessageCircle, Send } from 'lucide-react';

export default function EventDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [event, setEvent] = useState(null);
  const [openingCheckout, setOpeningCheckout] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [unregisterOpen, setUnregisterOpen] = useState(false);
  const [unregisterBusy, setUnregisterBusy] = useState(false);
  const [feedback, setFeedback] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [fbForm, setFbForm] = useState({ rating: 5, comment: '' });
  const [editingId, setEditingId] = useState(null);
  const [isBanning, setIsBanning] = useState(null);
  const [shareBusy, setShareBusy] = useState(false);
  const [shareError, setShareError] = useState('');
  const [activeMedia, setActiveMedia] = useState('video');

  const currentMedia = event?.video && activeMedia === 'video' ? 'video' : 'photo';

  async function loadEventAndFeedback() {
    const [{ data }, fbRes] = await Promise.all([
      api.get(`/events/${id}`),
      api.get(`/feedback/event/${id}`).catch(() => ({ data: { feedback: [], averageRating: 0 } })),
    ]);
    setEvent(data);
    setFeedback(fbRes.data?.feedback || []);
    setAverageRating(fbRes.data?.averageRating || 0);
  }

  useEffect(() => {
    (async () => {
      try {
        await loadEventAndFeedback();
      } catch (e) {
        toast.error(e.message);
      }
    })();
  }, [id]);

  useEffect(() => {
    if (!user || !id) {
      setIsRegistered(false);
      return;
    }
    (async () => {
      try {
        const { data } = await api.get('/registrations/mine');
        const yes = data.some(
          (row) => String(row.registration?.event?._id || row.registration?.event) === String(id)
        );
        setIsRegistered(yes);
      } catch {
        setIsRegistered(false);
      }
    })();
  }, [user, id]);

  function openCheckout() {
    if (!user) {
      toast.error('Log in to buy a ticket');
      return;
    }
    setOpeningCheckout(true);
    navigate(`/payments/new?eventId=${id}`);
  }

  async function unregister() {
    setUnregisterBusy(true);
    try {
      await api.delete(`/registrations/event/${id}`);
      toast.success('Registration cancelled');
      setIsRegistered(false);
      setUnregisterOpen(false);
      await loadEventAndFeedback();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setUnregisterBusy(false);
    }
  }

  const [registering, setRegistering] = useState(false);

  async function registerFreeEvent() {
    setRegistering(true);
    try {
      await api.post(`/registrations/event/${id}`);
      toast.success('You are now participating!');
      setIsRegistered(true);
      await loadEventAndFeedback();
    } catch (e) {
      toast.error(e.response?.data?.message || e.message);
    } finally {
      setRegistering(false);
    }
  }

  async function submitFeedback(e) {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/feedback/${editingId}`, fbForm);
        toast.success('Feedback updated!');
      } else {
        await api.post(`/feedback/event/${id}`, fbForm);
        toast.success('Thanks for your feedback!');
      }
      const { data } = await api.get(`/feedback/event/${id}`);
      setFeedback(data.feedback);
      setAverageRating(data.averageRating);
      setFbForm({ rating: 5, comment: '' });
      setEditingId(null);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  }

  async function handleBan(fbId) {
    const reason = prompt('Enter reason for banning this feedback:');
    if (reason === null) return;
    setIsBanning(fbId);
    try {
      await api.post(`/feedback/${fbId}/ban`, { reason });
      toast.success('Feedback banned');
      const { data } = await api.get(`/feedback/event/${id}`);
      setFeedback(data.feedback);
      setAverageRating(data.averageRating);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    } finally {
      setIsBanning(null);
    }
  }

  function startEdit(f) {
    setEditingId(f._id);
    setFbForm({ rating: f.rating, comment: f.comment });
    // Scroll to form? 
    document.getElementById('feedback-form')?.scrollIntoView({ behavior: 'smooth' });
  }

  if (!event) {
    return <div className="py-20 text-center text-clay-muted">Loading...</div>;
  }

  const updatedSet = new Set(event.updatedFields || []);
  const isUpdated = !!event.lastUpdatedAt && (event.updatedFields?.length || 0) > 0;

  const full = (event.registrationCount ?? 0) >= event.capacity;
  const ended = !isUpcoming(event.endDateTime);
  const canUnregister = user && isRegistered && !ended && eventNotStartedYet(event.startDateTime);

  const shareUrl = `${window.location.origin}/events/${id}`;
  const shareText = `*${event.title}*\n\n${event.description}\n\n📍*Venue:* ${event.venue?.name || 'Campus'}\n📅*Date:* ${new Date(event.startDateTime).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}\n🔗*Link:* ${shareUrl}`;
  
  const whatsappLink = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
  const xLink = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
  const fbLink = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
  const linkedinLink = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Event link copied to clipboard!');
    } catch (err) {
      toast.error('Failed to copy link');
    }
  }

  async function shareEvent() {
    setShareError('');
    setShareBusy(true);
    try {
      if (!navigator.share) {
        await copyToClipboard();
        return;
      }

      const payload = { title: event.title, text: shareText, url: shareUrl };

      if (event.image && navigator.canShare?.({ files: [new File([], 'x')] })) {
        try {
          const r = await fetch(event.image);
          const blob = await r.blob();
          const ext = blob.type === 'image/png' ? 'png' : 'jpg';
          const file = new File([blob], `event.${ext}`, { type: blob.type || 'image/jpeg' });
          if (navigator.canShare({ ...payload, files: [file] })) {
            await navigator.share({ ...payload, files: [file] });
            return;
          }
        } catch {
          // fall through
        }
      }

      await navigator.share(payload);
    } catch (e) {
      if (e.name !== 'AbortError') setShareError(e?.message || 'Share failed');
    } finally {
      setShareBusy(false);
    }
  }

  const UpdatedPill = () => (
    <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
      Updated
    </span>
  );

  return (
    <div className="space-y-8">
      {unregisterOpen && (
        <ConfirmModal
          title={event.ticketingType === 'Free' ? 'Opt out of event?' : 'Cancel registration?'}
          description={event.ticketingType === 'Free' ? 'You will no longer be marked as participating in this event.' : 'Your QR ticket will be removed and the slot will be freed. You can buy again later if capacity allows.'}
          confirmLabel={event.ticketingType === 'Free' ? 'Opt out' : 'Unregister'}
          cancelLabel="Keep registration"
          danger
          busy={unregisterBusy}
          onCancel={() => !unregisterBusy && setUnregisterOpen(false)}
          onConfirm={unregister}
        />
      )}
      <Link to="/events" className="text-sm font-medium text-clay-primary hover:underline">
        ← Back to events
      </Link>
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="glass-card overflow-hidden lg:col-span-2">
          <div className="relative flex min-h-[300px] w-full items-center justify-center bg-black overflow-hidden lg:min-h-[400px]">
            <div className="absolute top-4 left-4 z-10 flex flex-wrap gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg backdrop-blur-md ${
                event.ticketingType === 'Free' ? 'bg-emerald-500/90 text-white' : 'bg-clay-lilac/90 text-clay-primary'
              }`}>
                {event.ticketingType === 'Free' ? 'Free Event' : 'Paid Ticket'}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg backdrop-blur-md ${
                event.locationType === 'Outdoor' ? 'bg-clay-peach/90 text-clay-ink' : 'bg-clay-mint/90 text-accent-800'
              }`}>
                {event.locationType || 'Indoor'}
              </span>
            </div>
            {event.video && event.image && (
              <div className="absolute right-4 top-4 z-10 flex overflow-hidden rounded-xl bg-white/20 p-1 shadow-sm backdrop-blur-md">
                <button
                  type="button"
                  onClick={() => setActiveMedia('video')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    currentMedia === 'video' ? 'bg-white text-black shadow' : 'text-white hover:bg-white/20'
                  }`}
                >
                  Video
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMedia('photo')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    currentMedia === 'photo' ? 'bg-white text-black shadow' : 'text-white hover:bg-white/20'
                  }`}
                >
                  Photos
                </button>
              </div>
            )}

            {currentMedia === 'video' && event.video ? (
              <video
                className="max-h-[500px] w-full object-contain"
                src={event.video}
                controls
                playsInline
                preload="metadata"
              />
            ) : event.image ? (
              <img
                src={event.image}
                alt={event.title}
                className="max-h-[500px] w-full object-contain"
              />
            ) : (
              <div
                className="h-full w-full min-h-[300px] bg-cover bg-center"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#10b981)' }}
              />
            )}
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-bold uppercase tracking-widest text-accent-600">{event.category?.name}</p>
              {event.ticketingType === 'Ticket' && (
                <p className="text-lg font-bold text-clay-ink">
                  Rs. {Number(event.ticketPrice || 0).toLocaleString()}
                </p>
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <h1 className="font-display text-4xl font-extrabold text-clay-ink leading-tight">{event.title}</h1>
              {isUpdated && <UpdatedPill />}
            </div>
            <div className="mt-6 flex flex-wrap gap-4 text-sm font-semibold text-clay-subtle uppercase border-y border-clay-border/40 py-4">
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-clay-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                {new Date(event.startDateTime).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
              </div>
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-clay-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {new Date(event.startDateTime).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
              </div>
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-clay-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                {event.venue?.name}
              </div>
            </div>
            
            <p className="mt-6 whitespace-pre-wrap text-clay-muted leading-relaxed text-lg">{event.description}</p>
            
            <div className="mt-10 rounded-3xl border-2 border-clay-border bg-clay-bg/30 p-6">
              <h3 className="font-display text-lg font-bold text-clay-ink mb-4 flex items-center gap-2">
                <svg className="h-5 w-5 text-clay-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                Spread the Word
              </h3>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                <a href={whatsappLink} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white border border-clay-border hover:shadow-md hover:-translate-y-0.5 transition group">
                  <div className="h-10 w-10 flex items-center justify-center rounded-full bg-green-50 text-green-600 group-hover:bg-green-600 group-hover:text-white transition">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                  </div>
                  <span className="text-[10px] font-bold text-clay-muted uppercase">WhatsApp</span>
                </a>
                <a href={fbLink} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white border border-clay-border hover:shadow-md hover:-translate-y-0.5 transition group">
                  <div className="h-10 w-10 flex items-center justify-center rounded-full bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                  </div>
                  <span className="text-[10px] font-bold text-clay-muted uppercase">Facebook</span>
                </a>
                <a href={xLink} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white border border-clay-border hover:shadow-md hover:-translate-y-0.5 transition group">
                  <div className="h-10 w-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-900 group-hover:bg-slate-900 group-hover:text-white transition">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  </div>
                  <span className="text-[10px] font-bold text-clay-muted uppercase">X (Twitter)</span>
                </a>
                <a href={linkedinLink} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white border border-clay-border hover:shadow-md hover:-translate-y-0.5 transition group">
                  <div className="h-10 w-10 flex items-center justify-center rounded-full bg-blue-50 text-blue-700 group-hover:bg-blue-700 group-hover:text-white transition">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554V15.034c0-1.291-.024-2.953-1.8-2.953-1.801 0-2.077 1.408-2.077 2.859v5.512h-3.554V9h3.413v1.561h.046c.476-.9 1.636-1.85 3.366-1.85 3.599 0 4.265 2.368 4.265 5.451v6.29zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451c.98 0 1.771-.773 1.771-1.729V1.729C24 .774 23.205 0 22.225 0z"/></svg>
                  </div>
                  <span className="text-[10px] font-bold text-clay-muted uppercase">LinkedIn</span>
                </a>
                <button onClick={copyToClipboard} className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white border border-clay-border hover:shadow-md hover:-translate-y-0.5 transition group">
                  <div className="h-10 w-10 flex items-center justify-center rounded-full bg-clay-lilac text-clay-primary group-hover:bg-clay-primary group-hover:text-white transition">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                  </div>
                  <span className="text-[10px] font-bold text-clay-muted uppercase">Copy Link</span>
                </button>
              </div>
              
              {shareError && <p className="mt-3 text-xs font-bold text-red-600 text-center">{shareError}</p>}
            </div>
            
            {(event.pdf || event.video) && (
              <div className="mt-4 rounded-2xl border border-clay-border/60 bg-clay-bg/40 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-clay-subtle mb-3">Downloads</p>
                <div className="flex flex-wrap gap-2">
                  {event.pdf && (
                    <a href={event.pdf} download className="btn-secondary !py-2 !text-xs flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                      Download PDF
                    </a>
                  )}
                  {event.video && (
                    <a href={event.video} download className="btn-secondary !py-2 !text-xs flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                      Download Video
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        <aside className="space-y-4">
          <div className="glass-card p-6">
            <h2 className="font-display text-lg font-semibold text-clay-ink">
              {event.ticketingType === 'Free' ? 'Participate' : 'Ticket checkout'}
            </h2>
            {!user && (
              <p className="mt-2 text-sm text-clay-muted">
                {event.ticketingType === 'Free' ? 'Log in to participate.' : 'Log in to buy your ticket and create the QR.'}
              </p>
            )}
            {user && (
              <>
                {ended ? (
                  <p className="mt-2 text-sm font-medium text-amber-700">This event has ended.</p>
                ) : isRegistered ? (
                  <>
                    <p className="mt-2 text-sm text-clay-muted">
                      {event.ticketingType === 'Free' ? 'You are participating in this event.' : 'You already have a ticket for this event.'}
                    </p>
                    {canUnregister && (
                      <button
                        type="button"
                        className="btn-secondary mt-4 w-full border-red-200 text-red-700 hover:bg-red-50"
                        onClick={() => setUnregisterOpen(true)}
                      >
                        {event.ticketingType === 'Free' ? 'Opt out' : 'Unregister'}
                      </button>
                    )}
                    {!eventNotStartedYet(event.startDateTime) && (
                      <p className="mt-2 text-xs text-clay-subtle">
                        Unregistration closes when the event starts.
                      </p>
                    )}
                  </>
                ) : full ? (
                  <p className="mt-2 text-sm font-medium text-amber-700">This event is at capacity.</p>
                ) : event.ticketingType === 'Free' ? (
                  <button
                    type="button"
                    className="btn-primary mt-4 w-full bg-green-600 hover:bg-green-700 border-green-700/20"
                    onClick={registerFreeEvent}
                    disabled={registering}
                  >
                    {registering ? 'Processing...' : 'Participate'}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn-primary mt-4 w-full"
                    onClick={openCheckout}
                    disabled={openingCheckout}
                  >
                    {openingCheckout ? 'Opening checkout...' : 'Buy ticket'}
                  </button>
                )}
                <Link to="/dashboard?tab=tickets" className="btn-secondary mt-3 block w-full text-center">
                  View my tickets
                </Link>
              </>
            )}
            {!user && (
              <Link to="/login" className="btn-primary mt-4 block w-full text-center">
                Log in
              </Link>
            )}
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-lg font-semibold text-clay-ink">Feedback</h2>
              {averageRating > 0 && (
                <div className="flex items-center gap-1 text-amber-500">
                  <span className="text-sm font-bold">{averageRating}</span>
                  <span className="text-xs">★</span>
                </div>
              )}
            </div>
            {feedback.length > 0 && (
              <ul className="mt-3 max-h-60 space-y-3 overflow-y-auto pr-1">
                {feedback.map((f) => (
                  <li key={f._id} className="rounded-2xl border border-clay-border/60 bg-clay-bg/50 p-3 shadow-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-clay-subtle">{f.user?.name || 'User'}</span>
                      <div className="flex items-center gap-2">
                        <div className="flex text-[10px] text-amber-400">
                          {'★'.repeat(f.rating)}{'☆'.repeat(5 - f.rating)}
                        </div>
                        {user?.role === 'admin' && (
                          <button
                            type="button"
                            className="text-[10px] font-bold text-red-600 hover:underline"
                            onClick={() => handleBan(f._id)}
                            disabled={isBanning === f._id}
                          >
                            {isBanning === f._id ? '...' : 'Ban'}
                          </button>
                        )}
                        {user?.id === (f.user?._id || f.user) && (
                          <button
                            type="button"
                            className="text-[10px] font-bold text-clay-primary hover:underline"
                            onClick={() => startEdit(f)}
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="mt-1 text-sm text-clay-ink">{f.comment || '-'}</p>
                  </li>
                ))}
              </ul>
            )}
            {!eventNotStartedYet(event.startDateTime) && feedback.length === 0 && (
              <p className="mt-3 text-sm text-clay-muted">No reviews yet. Be the first to share!</p>
            )}
            {eventNotStartedYet(event.startDateTime) && (
              <p className="mt-3 text-sm text-clay-muted italic">Feedback opens when the event starts.</p>
            )}

            {user && isRegistered && !eventNotStartedYet(event.startDateTime) && (
              <form id="feedback-form" onSubmit={submitFeedback} className="mt-6 space-y-4 border-t border-clay-border pt-6">
                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-clay-subtle uppercase tracking-wider">
                      {editingId ? 'Edit your review' : 'Leave a review'}
                    </p>
                    {editingId && (
                      <button
                        type="button"
                        className="text-xs text-clay-muted hover:underline"
                        onClick={() => {
                          setEditingId(null);
                          setFbForm({ rating: 5, comment: '' });
                        }}
                      >
                        Cancel Edit
                      </button>
                    )}
                  </div>
                  <div className="mt-2">
                    <StarRating 
                      value={fbForm.rating} 
                      onChange={(val) => setFbForm({ ...fbForm, rating: val })} 
                    />
                  </div>
                </div>
                <textarea
                  className="input-field min-h-[100px] text-sm"
                  placeholder="Tell others what you think about this event..."
                  value={fbForm.comment}
                  onChange={(e) => setFbForm({ ...fbForm, comment: e.target.value })}
                  required
                />
                <button type="submit" className="btn-primary w-full text-sm">
                  {editingId ? 'Update Review' : 'Post Review'}
                </button>
              </form>
            )}
            {user && !isRegistered && !eventNotStartedYet(event.startDateTime) && (
              <p className="mt-4 text-center text-xs text-clay-subtle">
                Only ticket holders can leave a review.
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
