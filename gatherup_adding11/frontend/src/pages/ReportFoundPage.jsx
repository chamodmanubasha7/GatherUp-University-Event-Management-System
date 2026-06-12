import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api.js';
import { maxDatetimeLocalValue } from '../utils/dates.js';
import {
  LF_ITEM_NAME_MAX,
  LF_DESCRIPTION_MAX,
  LF_ALLOWED_IMAGE_TYPES,
  LF_IMAGE_ACCEPT,
} from '../constants/lostFoundForm.js';

const LF_CATEGORIES = ['Electronics', 'Clothing', 'ID & Cards', 'Keys', 'Books', 'Other'];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function photoValidationError(file) {
  if (!file) return null;
  if (!LF_ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return 'Please choose a JPEG or PNG image (other formats are not accepted).';
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return 'Image must be 5 MB or smaller.';
  }
  return null;
}

export default function ReportFoundPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [form, setForm] = useState({
    itemName: '',
    description: '',
    category: 'Electronics',
    dateFound: '',
    location: '',
    event: '',
  });
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/registrations/mine');
        const opts = data
          .filter((r) => r.registration?.event && r.registration.confirmed !== false)
          .map((r) => ({
            id: r.registration.event._id,
            title: r.registration.event.title,
          }));
        setEvents(opts);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  useEffect(() => {
    if (!photo) {
      setPhotoPreview(null);
      return;
    }
    const url = URL.createObjectURL(photo);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  function patchForm(updates) {
    setFormError('');
    setFieldErrors({});
    setForm((prev) => ({ ...prev, ...updates }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setFormError('');
    setFieldErrors({});
    const pErr = photoValidationError(photo);
    if (pErr) {
      setFieldErrors({ photo: pErr });
      toast.error(pErr);
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('itemName', form.itemName.trim());
      fd.append('description', form.description);
      fd.append('category', form.category);
      fd.append('dateFound', form.dateFound);
      fd.append('location', form.location);
      if (form.event) fd.append('event', form.event);
      if (photo) fd.append('photo', photo);
      await api.post('/lost-found/found', fd);
      toast.success('Found item posted — status Unclaimed');
      navigate('/lost-found');
    } catch (err) {
      const backendErrors = err.response?.data?.errors;
      if (backendErrors && Array.isArray(backendErrors)) {
        const errorMap = {};
        backendErrors.forEach((error) => { errorMap[error.field] = error.msg; });
        setFieldErrors(errorMap);
        toast.error('Please correct the highlighted fields.');
      } else {
        setFormError(err.message || 'Failed to submit report');
        toast.error(err.message);
      }
    } finally {
      setBusy(false);
    }
  }

  const renderError = (field) => {
    if (!fieldErrors[field]) return null;
    return (
      <div className="error-text">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        {fieldErrors[field]}
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-lg">
      <div className="glass-card p-6">
        <h1 className="font-display text-2xl font-bold text-clay-ink">Report a found item</h1>
        {formError && (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
            {formError}
          </p>
        )}
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <div className="flex items-baseline justify-between gap-2">
              <label className="label mb-0">Item name</label>
              <span className="text-xs text-clay-subtle">
                {form.itemName.length}/{LF_ITEM_NAME_MAX}
              </span>
            </div>
            <input
              className={`input-field ${fieldErrors.itemName ? 'input-error' : ''}`}
              required
              maxLength={LF_ITEM_NAME_MAX}
              value={form.itemName}
              onChange={(e) => patchForm({ itemName: e.target.value })}
            />
            {renderError('itemName')}
          </div>
          <div>
            <div className="flex items-baseline justify-between gap-2">
              <label className="label mb-0">Description</label>
              <span className="text-xs text-clay-subtle">
                {form.description.length}/{LF_DESCRIPTION_MAX}
              </span>
            </div>
            <textarea
              className={`input-field min-h-[90px] ${fieldErrors.description ? 'input-error' : ''}`}
              maxLength={LF_DESCRIPTION_MAX}
              value={form.description}
              onChange={(e) => patchForm({ description: e.target.value })}
            />
            {renderError('description')}
          </div>
          <div>
            <label className="label">Category</label>
            <select
              className="input-field"
              value={form.category}
              onChange={(e) => patchForm({ category: e.target.value })}
            >
              {LF_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Date found</label>
            <input
              className={`input-field ${fieldErrors.dateFound ? 'input-error' : ''}`}
              type="datetime-local"
              required
              max={maxDatetimeLocalValue()}
              value={form.dateFound}
              onChange={(e) => patchForm({ dateFound: e.target.value })}
            />
            {renderError('dateFound')}
          </div>
          <div>
            <label className="label">Location turned in / found</label>
            <input
              className={`input-field ${fieldErrors.location ? 'input-error' : ''}`}
              required
              value={form.location}
              onChange={(e) => patchForm({ location: e.target.value })}
            />
            {renderError('location')}
          </div>
          <div>
            <label className="label">Event (optional — events you are registered for)</label>
            <select
              className="input-field"
              value={form.event}
              onChange={(e) => patchForm({ event: e.target.value })}
            >
              <option value="">None</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Photo (optional)</label>
            <input
              className={`input-field ${fieldErrors.photo ? 'input-error' : ''}`}
              type="file"
              accept={LF_IMAGE_ACCEPT}
              onChange={(e) => {
                setFormError('');
                setFieldErrors({});
                setPhoto(e.target.files?.[0] || null);
              }}
            />
            {renderError('photo')}
            <p className="mt-1 text-xs text-clay-subtle">JPEG or PNG only, max 5 MB.</p>
            {photoPreview && (
              <div className="mt-3">
                <p className="text-xs text-clay-subtle">Preview</p>
                <img
                  src={photoPreview}
                  alt="Selected"
                  className="mt-2 max-h-56 max-w-full rounded-2xl border border-clay-border object-contain shadow-sm"
                />
              </div>
            )}
          </div>
          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? 'Submitting…' : 'Submit'}
          </button>
        </form>
      </div>
    </div>
  );
}
