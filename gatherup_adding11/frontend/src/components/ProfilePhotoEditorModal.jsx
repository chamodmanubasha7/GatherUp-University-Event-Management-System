import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api.js';
import { CROP_PRESETS, QUALITY_PRESETS, previewDataUrlFromCrop } from '../utils/imageTools.js';

export default function ProfilePhotoEditorModal({ open, onClose, onSaved }) {
  const [file, setFile] = useState(null);
  const [presetId, setPresetId] = useState('square');
  const [qualityId, setQualityId] = useState('high');
  const [zoom, setZoom] = useState(1.15);
  const [previewUrl, setPreviewUrl] = useState('');
  const [busy, setBusy] = useState(false);

  const preset = useMemo(() => CROP_PRESETS.find((p) => p.id === presetId) || CROP_PRESETS[0], [presetId]);
  const quality = useMemo(
    () => QUALITY_PRESETS.find((q) => q.id === qualityId) || QUALITY_PRESETS[1],
    [qualityId]
  );

  useEffect(() => {
    if (!open) return;
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!open) return;
      if (!file) {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl('');
        return;
      }
      try {
        const { url } = await previewDataUrlFromCrop({
          file,
          aspect: preset.aspect,
          zoom,
          longEdge: quality.longEdge,
          jpegQuality: quality.jpegQuality,
        });
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(url);
      } catch (e) {
        if (!cancelled) toast.error(e.message || 'Could not preview image');
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, file, presetId, qualityId, zoom]);

  if (!open) return null;

  async function save() {
    if (!file) return toast.error('Choose an image first');
    setBusy(true);
    try {
      const { blob } = await previewDataUrlFromCrop({
        file,
        aspect: preset.aspect,
        zoom,
        longEdge: quality.longEdge,
        jpegQuality: quality.jpegQuality,
      });
      const fd = new FormData();
      fd.append('photo', new File([blob], 'avatar.jpg', { type: 'image/jpeg' }));
      await api.put('/auth/profile-photo', fd);
      toast.success('Profile photo updated');
      onSaved?.();
      onClose?.();
    } catch (e) {
      toast.error(e.message || 'Could not upload profile photo');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-clay-border bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-clay-border/70 px-5 py-4">
          <p className="font-display text-lg font-semibold text-clay-ink">Update profile photo</p>
          <button type="button" className="btn-secondary !py-2 !text-xs" onClick={onClose} disabled={busy}>
            Close
          </button>
        </div>

        <div className="grid gap-5 p-5 md:grid-cols-2">
          <div className="space-y-3">
            <div className="rounded-2xl border border-clay-border bg-clay-bg/40 p-3">
              <input
                type="file"
                accept="image/jpeg,image/png"
                className="input-field"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                disabled={busy}
              />
              <p className="mt-2 text-xs text-clay-muted">
                Tip: choose a clear photo. We’ll crop and export as a high-quality JPEG.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-clay-subtle">Crop</p>
              <div className="flex flex-wrap gap-2">
                {CROP_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`rounded-full px-3 py-2 text-xs font-medium transition ${
                      presetId === p.id ? 'bg-clay-lilac text-clay-primary' : 'bg-clay-bg text-clay-muted hover:text-clay-ink'
                    }`}
                    onClick={() => setPresetId(p.id)}
                    disabled={busy}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-clay-subtle">Quality</p>
              <div className="flex flex-wrap gap-2">
                {QUALITY_PRESETS.map((q) => (
                  <button
                    key={q.id}
                    type="button"
                    className={`rounded-full px-3 py-2 text-xs font-medium transition ${
                      qualityId === q.id ? 'bg-clay-lilac text-clay-primary' : 'bg-clay-bg text-clay-muted hover:text-clay-ink'
                    }`}
                    onClick={() => setQualityId(q.id)}
                    disabled={busy}
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-clay-subtle">Zoom</p>
              <input
                type="range"
                min={1}
                max={2.5}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                disabled={!file || busy}
                className="w-full"
              />
              <p className="text-xs text-clay-muted">Zoom: {zoom.toFixed(2)}×</p>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-clay-subtle">Preview</p>
            <div className="flex items-center justify-center rounded-3xl border border-clay-border bg-clay-bg/40 p-6">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Profile preview"
                  className="h-44 w-44 rounded-3xl object-cover ring-1 ring-clay-border"
                />
              ) : (
                <p className="text-sm text-clay-muted">Choose an image to preview.</p>
              )}
            </div>

            <button type="button" className="btn-primary w-full" onClick={save} disabled={!file || busy}>
              {busy ? 'Saving…' : 'Save profile photo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

