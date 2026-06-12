import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api.js';
import { formatDateRange } from '../utils/dates.js';

export default function AdminEventsPage() {
  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [venues, setVenues] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [editing, setEditing] = useState(null);
  const [notifyStudents, setNotifyStudents] = useState(true);
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    venue: '',
    startDateTime: '',
    endDateTime: '',
    capacity: 50,
    ticketPrice: 0,
    locationType: 'Indoor',
    ticketingType: 'Free',
    ticketTiers: [],
    link: '',
  });
  const [photo, setPhoto] = useState(null);
  const [video, setVideo] = useState(null);
  const [pdf, setPdf] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});

  async function load() {
    const [ev, cat, ven] = await Promise.all([
      api.get('/events'),
      api.get('/categories'),
      api.get('/venues'),
    ]);
    setEvents(ev.data);
    setCategories(cat.data);
    setVenues(ven.data);
  }

  useEffect(() => {
    (async () => {
      try {
        await load();
      } catch (e) {
        toast.error(e.message);
      }
    })();
  }, []);

  function toDatetimeLocalValue(dateLike) {
    const d = new Date(dateLike);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
      d.getMinutes()
    )}`;
  }

  async function loadAttendance(eventId) {
    try {
      const { data } = await api.get(`/tickets/attendance/${eventId}`);
      setAttendance((a) => ({ ...a, [eventId]: data }));
      toast.success(`Rates: ${data.attendanceRatePercent}%`);
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (k !== 'ticketTiers') {
          fd.append(k, v);
        }
      });
      if (editing) fd.append('notifyStudents', String(!!notifyStudents));
      if (photo) fd.append('photo', photo);
      if (video) fd.append('video', video);
      if (pdf) fd.append('pdf', pdf);
      if (form.ticketingType === 'Ticket') {
        fd.append('ticketTiers', JSON.stringify(form.ticketTiers));
      } else {
        fd.append('ticketTiers', JSON.stringify([]));
      }
      
      const config = {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        },
      };

      if (editing) {
        await api.put(`/events/${editing}`, fd, config);
        toast.success('Event updated');
      } else {
        await api.post('/events', fd, config);
        toast.success('Event created');
      }
      setForm({
        title: '',
        description: '',
        category: form.category,
        venue: form.venue,
        startDateTime: '',
        endDateTime: '',
        capacity: form.capacity,
        ticketPrice: form.ticketPrice,
        locationType: form.locationType,
        ticketingType: form.ticketingType,
        ticketTiers: form.ticketTiers,
        link: form.link,
      });
      setPhoto(null);
      setVideo(null);
      setPdf(null);
      setPhotoPreview('');
      setUploadProgress(0);
      setEditing(null);
      setNotifyStudents(true);
      await load();
    } catch (err) {
      const backendErrors = err.response?.data?.errors;
      if (backendErrors && Array.isArray(backendErrors)) {
        const errorMap = {};
        backendErrors.forEach((error) => { errorMap[error.field] = error.msg; });
        setErrors(errorMap);
        toast.error(editing ? 'Event update failed. Please check the fields below.' : 'Event creation failed. Please check the fields below.');
      } else {
        const msg = err.response?.data?.message || err.message || 'Failed to create event';
        if (err.response?.status === 409 && err.response?.data?.code === 'EVENT_LIMIT_WARNING') {
          if (window.confirm(err.response.data.message)) {
            fd.append('forceLimit', 'true');
            try {
              if (editing) {
                await api.put(`/events/${editing}`, fd, config);
                toast.success('Event updated');
              } else {
                await api.post('/events', fd, config);
                toast.success('Event created');
              }
              setForm({
                title: '', description: '', category: form.category, venue: form.venue,
                startDateTime: '', endDateTime: '', capacity: form.capacity, ticketPrice: form.ticketPrice,
                locationType: form.locationType, ticketingType: form.ticketingType, ticketTiers: form.ticketTiers, link: form.link,
              });
              setPhoto(null); setVideo(null); setPdf(null); setPhotoPreview('');
              setUploadProgress(0); setEditing(null); setNotifyStudents(true);
              await load();
              return;
            } catch (retryErr) {
              err = retryErr;
            }
          } else {
            return;
          }
        }
        if (err.response?.status === 409 && err.response?.data?.code === 'EVENT_DUPLICATE_VENUE_DAY_CATEGORY') {
          setErrors((prev) => ({
            ...prev,
            category: prev.category || 'An event already exists for this venue, category, and day.',
            venue: prev.venue || 'An event already exists for this venue, category, and day.',
            startDateTime: prev.startDateTime || 'Pick a different day, venue, or category.',
          }));
        }
        toast.error(msg);
      }
    } finally {
      setBusy(false);
      setUploadProgress(0);
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

  async function remove(id) {
    if (!confirm('Delete this event and related registrations?')) return;
    try {
      await api.delete(`/events/${id}`);
      toast.success('Deleted');
      await load();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function handleIncrementCount(id) {
    try {
      const { data } = await api.patch(`/events/${id}/increment-count`);
      setEvents((prev) => prev.map((ev) => ev._id === id ? { ...ev, manualParticipantCount: data.manualParticipantCount } : ev));
      toast.success('Participant counted!');
    } catch (e) {
      toast.error(e.message);
    }
  }

  function startEdit(ev) {
    setEditing(ev._id);
    setNotifyStudents(true);
    setErrors({});
    setPhoto(null);
    setVideo(null);
    setPdf(null);
    setPhotoPreview(ev.image || '');
    setForm({
      title: ev.title || '',
      description: ev.description || '',
      category: ev.category?._id || ev.category || '',
      venue: ev.venue?._id || ev.venue || '',
      startDateTime: toDatetimeLocalValue(ev.startDateTime),
      endDateTime: toDatetimeLocalValue(ev.endDateTime),
      capacity: ev.capacity ?? 50,
      ticketPrice: ev.ticketPrice ?? 0,
      locationType: ev.locationType || 'Indoor',
      ticketingType: ev.ticketingType || 'Free',
      ticketTiers: ev.ticketTiers || [],
      link: ev.link || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    setEditing(null);
    setNotifyStudents(true);
    setErrors({});
    setPhoto(null);
    setVideo(null);
    setPdf(null);
    setPhotoPreview('');
    setForm({
      title: '',
      description: '',
      category: '',
      venue: '',
      startDateTime: '',
      endDateTime: '',
      capacity: 50,
      ticketPrice: 0,
      locationType: 'Indoor',
      ticketingType: 'Free',
      ticketTiers: [],
      link: '',
    });
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-3xl font-bold text-clay-ink">Manage events</h1>
        <Link to="/admin" className="btn-secondary">
          ← Admin
        </Link>
      </div>

      <div className="glass-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold text-clay-ink">
            {editing ? 'Update event (resubmit)' : 'Create event'}
          </h2>
          {editing && (
            <button type="button" className="btn-secondary !py-2 !text-xs" onClick={cancelEdit} disabled={busy}>
              Cancel edit
            </button>
          )}
        </div>
        <form onSubmit={submit} className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <input
              className={`input-field ${errors.title ? 'input-error' : ''}`}
              placeholder="Title"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            {renderError('title')}
          </div>
          <div className="md:col-span-2">
            <textarea
              className={`input-field min-h-[80px] ${errors.description ? 'input-error' : ''}`}
              placeholder="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            {renderError('description')}
          </div>
          <div className="md:col-span-2">
            <input
              className={`input-field ${errors.link ? 'input-error' : ''}`}
              placeholder="External Link (Optional)"
              type="url"
              value={form.link}
              onChange={(e) => setForm({ ...form, link: e.target.value })}
            />
            {renderError('link')}
          </div>
          <div>
            <select
              className={`input-field ${errors.category ? 'input-error' : ''}`}
              required
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              <option value="">Category</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
            {renderError('category')}
          </div>
          <div>
            <select
              className={`input-field ${errors.venue ? 'input-error' : ''}`}
              required
              value={form.venue}
              onChange={(e) => setForm({ ...form, venue: e.target.value })}
            >
              <option value="">Venue</option>
              {venues.map((v) => (
                <option key={v._id} value={v._id}>
                  {v.name}
                </option>
              ))}
            </select>
            {renderError('venue')}
          </div>
          <div>
            <select
              className={`input-field ${errors.locationType ? 'input-error' : ''}`}
              required
              value={form.locationType}
              onChange={(e) => setForm({ ...form, locationType: e.target.value })}
            >
              <option value="Indoor">Indoor</option>
              <option value="Outdoor">Outdoor</option>
            </select>
            {renderError('locationType')}
          </div>
          <div>
            <select
              className={`input-field ${errors.ticketingType ? 'input-error' : ''}`}
              required
              value={form.ticketingType}
              onChange={(e) => setForm({ ...form, ticketingType: e.target.value })}
            >
              <option value="Free">Free</option>
              <option value="Ticket">Ticket</option>
            </select>
            {renderError('ticketingType')}
          </div>
          <div className="grid gap-1">
            <label className="text-xs text-clay-subtle">Start (date &amp; time)</label>
            <input
              className={`input-field ${errors.startDateTime ? 'input-error' : ''}`}
              type="datetime-local"
              required
              value={form.startDateTime}
              onChange={(e) => setForm({ ...form, startDateTime: e.target.value })}
            />
            {renderError('startDateTime')}
          </div>
          <div className="grid gap-1">
            <label className="text-xs text-clay-subtle">End (date &amp; time)</label>
            <input
              className={`input-field ${errors.endDateTime ? 'input-error' : ''}`}
              type="datetime-local"
              required
              value={form.endDateTime}
              onChange={(e) => setForm({ ...form, endDateTime: e.target.value })}
            />
            {renderError('endDateTime')}
          </div>
          <div className="grid gap-1">
            <label className="text-xs text-clay-subtle">Capacity</label>
            <input
              className={`input-field ${errors.capacity ? 'input-error' : ''}`}
              type="number"
              min={1}
              value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: e.target.value })}
            />
            {renderError('capacity')}
          </div>
          {form.ticketingType === 'Ticket' && (
            <div className="md:col-span-2 space-y-2 rounded-xl border border-clay-border/50 bg-clay-bg/30 p-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-clay-ink">Ticket Tiers</label>
                <button
                  type="button"
                  className="btn-secondary !py-1 !text-xs"
                  onClick={() => setForm({ ...form, ticketTiers: [...form.ticketTiers, { name: '', price: 0 }] })}
                >
                  + Add Tier
                </button>
              </div>
              {form.ticketTiers.map((tier, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input
                    className="input-field"
                    placeholder="Tier Name (e.g. VIP)"
                    value={tier.name}
                    onChange={(e) => {
                      const newTiers = [...form.ticketTiers];
                      newTiers[idx].name = e.target.value;
                      setForm({ ...form, ticketTiers: newTiers });
                    }}
                    required
                  />
                  <input
                    className="input-field"
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="Price"
                    value={tier.price}
                    onChange={(e) => {
                      const newTiers = [...form.ticketTiers];
                      newTiers[idx].price = Number(e.target.value);
                      setForm({ ...form, ticketTiers: newTiers });
                    }}
                    required
                  />
                  <button
                    type="button"
                    className="btn-secondary !px-2 text-red-600 hover:bg-red-50"
                    onClick={() => {
                      const newTiers = form.ticketTiers.filter((_, i) => i !== idx);
                      setForm({ ...form, ticketTiers: newTiers });
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
              {form.ticketTiers.length === 0 && (
                <p className="text-xs text-clay-muted">No ticket tiers added. Click "+ Add Tier" to add one.</p>
              )}
            </div>
          )}
          <div className="grid gap-1">
            <label className="text-xs text-clay-subtle">Event Photo</label>
            {photoPreview && (
              <img src={photoPreview} alt="Preview" className="mb-2 h-32 w-full object-cover rounded-lg border border-clay-border/60" />
            )}
            <input
              className={`input-field ${errors.photo ? 'input-error' : ''}`}
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                setPhoto(file || null);
                if (file) {
                  setPhotoPreview(URL.createObjectURL(file));
                } else {
                  setPhotoPreview('');
                }
              }}
            />
            {renderError('photo')}
          </div>
          <div className="grid gap-1">
            <label className="text-xs text-clay-subtle">Event Video (optional)</label>
            <input
              className={`input-field ${errors.video ? 'input-error' : ''}`}
              type="file"
              accept="video/mp4,video/webm,video/ogg,video/*"
              onChange={(e) => setVideo(e.target.files?.[0] || null)}
            />
            {renderError('video')}
          </div>
          <div className="grid gap-1">
            <label className="text-xs text-clay-subtle">Event PDF (optional)</label>
            <input
              className={`input-field ${errors.pdf ? 'input-error' : ''}`}
              type="file"
              accept="application/pdf"
              onChange={(e) => setPdf(e.target.files?.[0] || null)}
            />
            {renderError('pdf')}
          </div>
          {editing && (
            <label className="md:col-span-2 flex items-center gap-2 rounded-2xl border border-clay-border/60 bg-clay-bg/40 px-4 py-3 text-sm text-clay-ink">
              <input
                type="checkbox"
                checked={notifyStudents}
                onChange={(e) => setNotifyStudents(e.target.checked)}
              />
              Notify registered students about these updates
            </label>
          )}
          <button type="submit" className="btn-primary md:col-span-2" disabled={busy}>
            {busy ? 'Saving…' : editing ? 'Resubmit updates' : 'Create event'}
          </button>
          {busy && uploadProgress > 0 && (
            <div className="md:col-span-2 mt-2">
              <div className="flex items-center justify-between text-xs text-clay-subtle mb-1">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-clay-border/50 overflow-hidden">
                <div 
                  className="h-full bg-accent-500 transition-all duration-300" 
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </form>
      </div>

      <div className="space-y-4">
        <h2 className="font-display text-lg font-semibold text-clay-ink">All events</h2>
        {events.map((ev) => (
          <div key={ev._id} className="glass-card flex flex-wrap items-center justify-between gap-4 p-4">
            <div>
              <p className="font-semibold text-clay-ink">{ev.title}</p>
              <p className="text-sm text-clay-muted">{formatDateRange(ev.startDateTime, ev.endDateTime)}</p>
              <p className="text-sm text-clay-muted">
                {ev.ticketingType === 'Ticket' ? (
                  ev.ticketTiers && ev.ticketTiers.length > 0 ? (
                    `Tickets: ${ev.ticketTiers.map((t) => `Rs. ${t.price} - ${t.name}`).join(' | ')}`
                  ) : (
                    `Ticket: Rs. ${Number(ev.ticketPrice || 0).toLocaleString()}`
                  )
                ) : (
                  'Free Event'
                )}
              </p>
              {ev.ticketingType === 'Free' && (
                <p className="text-sm text-clay-muted">Manual Participants: {ev.manualParticipantCount || 0}</p>
              )}
              {attendance[ev._id] && (
                <p className="mt-1 text-xs text-accent-400">
                  Registrations: {attendance[ev._id].totalRegistrations} · Used:{' '}
                  {attendance[ev._id].ticketsUsed} · {attendance[ev._id].attendanceRatePercent}%
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-secondary !py-2 !text-xs" onClick={() => loadAttendance(ev._id)}>
                Attendance
              </button>
              <button type="button" className="btn-secondary !py-2 !text-xs" onClick={() => startEdit(ev)}>
                Edit
              </button>
              {ev.ticketingType === 'Free' && (
                <button type="button" className="btn-secondary !py-2 !text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100" onClick={() => handleIncrementCount(ev._id)}>
                  + Count Participant
                </button>
              )}
              <button type="button" className="btn-secondary !py-2 !text-xs text-red-700 hover:bg-red-50" onClick={() => remove(ev._id)}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
