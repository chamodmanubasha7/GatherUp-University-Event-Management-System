import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api.js';
import { maxDatetimeLocalValue } from '../utils/dates.js';
import { itemPhotoSrc } from '../utils/mediaUrl.js';
import { LF_DESCRIPTION_MAX, LF_ALLOWED_IMAGE_TYPES, LF_IMAGE_ACCEPT } from '../constants/lostFoundForm.js';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const LF_CATEGORIES = ['Electronics', 'Clothing', 'ID & Cards', 'Keys', 'Books', 'Other'];

/**
 * Modal to edit own lost or found report (pre-filled).
 */
export default function EditReportModal({ type, item, onClose, onSaved }) {
  const [form, setForm] = useState({});
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!item) return;
    setPhoto(null);
    if (type === 'lost') {
      setForm({
        description: item.description || '',
        location: item.location || '',
        category: item.category || 'Other',
        dateLost: item.dateLost ? String(item.dateLost).slice(0, 16) : '',
      });
    } else {
      setForm({
        description: item.description || '',
        location: item.location || '',
        category: item.category || 'Other',
        dateFound: item.dateFound ? String(item.dateFound).slice(0, 16) : '',
      });
    }
  }, [item, type]);

  useEffect(() => {
    if (!photo) {
      setPhotoPreview(null);
      return;
    }
    const url = URL.createObjectURL(photo);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  async function submit(e) {
    e.preventDefault();
    if (!item?._id) return;
    if (photo && photo.size > MAX_IMAGE_BYTES) {
      toast.error('Image must be 5 MB or smaller');
      return;
    }
    setBusy(true);
    try {
      const path = type === 'lost' ? `/lost-found/lost/${item._id}` : `/lost-found/found/${item._id}`;
      if (photo) {
        const fd = new FormData();
        fd.append('description', form.description);
        fd.append('location', form.location);
        fd.append('category', form.category);
        if (type === 'lost') fd.append('dateLost', new Date(form.dateLost).toISOString());
        else fd.append('dateFound', new Date(form.dateFound).toISOString());
        fd.append('photo', photo);
        await api.put(path, fd);
      } else {
        const body =
          type === 'lost'
            ? {
                description: form.description,
                location: form.location,
                category: form.category,
                dateLost: new Date(form.dateLost).toISOString(),
              }
            : {
                description: form.description,
                location: form.location,
                category: form.category,
                dateFound: new Date(form.dateFound).toISOString(),
              };
        await api.put(path, body);
      }
      toast.success('Saved');
      setPhoto(null);
      onSaved?.();
      onClose();
    } catch (err) {
      setFormError(err.message);
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!item) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-clay-ink/25 p-4 backdrop-blur-sm">
      <div className="glass-card max-h-[90vh] w-full max-w-lg overflow-y-auto p-6 shadow-clay-lg">
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-display text-xl font-bold text-clay-ink">
            Edit {type === 'lost' ? 'lost' : 'found'} report
          </h2>
          <button type="button" className="text-clay-muted hover:text-clay-ink" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <p className="mt-1 text-sm text-clay-muted">{item.publicId}</p>
        {formError && (
          <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
            {formError}
          </p>
        )}
        <form onSubmit={submit} className="mt-4 space-y-3">
          <div>
            <div className="flex items-baseline justify-between gap-2">
              <label className="label mb-0">Description</label>
              <span className="text-xs text-clay-subtle">
                {(form.description || '').length}/{LF_DESCRIPTION_MAX}
              </span>
            </div>
            <textarea
              className="input-field min-h-[80px]"
              maxLength={LF_DESCRIPTION_MAX}
              value={form.description}
              onChange={(e) => {
                setFormError('');
                setForm({ ...form, description: e.target.value });
              }}
            />
          </div>
          <div>
            <label className="label">Location</label>
            <input
              className="input-field"
              required
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Category</label>
            <select
              className="input-field"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {LF_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          {type === 'lost' ? (
            <div>
              <label className="label">Date lost</label>
              <input
                className="input-field"
                type="datetime-local"
                required
                max={maxDatetimeLocalValue()}
                value={form.dateLost}
                onChange={(e) => setForm({ ...form, dateLost: e.target.value })}
              />
            </div>
          ) : (
            <div>
              <label className="label">Date found</label>
              <input
                className="input-field"
                type="datetime-local"
                required
                max={maxDatetimeLocalValue()}
                value={form.dateFound}
                onChange={(e) => setForm({ ...form, dateFound: e.target.value })}
              />
            </div>
          )}
          <div>
            <label className="label">New photo (optional)</label>
            {item.photo && itemPhotoSrc(item.photo) && !photoPreview && (
              <p className="mb-2 text-xs text-clay-subtle">
                Current:{' '}
                <img
                  src={itemPhotoSrc(item.photo)}
                  alt="Current listing"
                  className="mt-1 max-h-32 max-w-full rounded-2xl border border-clay-border object-contain shadow-sm"
                />
              </p>
            )}
            <input
              className="input-field"
              type="file"
              accept={LF_IMAGE_ACCEPT}
              onChange={(e) => {
                setFormError('');
                setPhoto(e.target.files?.[0] || null);
              }}
            />
            {photoPreview && (
              <div className="mt-2">
                <p className="text-xs text-clay-subtle">New photo preview</p>
                <img
                  src={photoPreview}
                  alt="Preview"
                  className="mt-1 max-h-40 max-w-full rounded-2xl border border-clay-border object-contain shadow-sm"
                />
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
