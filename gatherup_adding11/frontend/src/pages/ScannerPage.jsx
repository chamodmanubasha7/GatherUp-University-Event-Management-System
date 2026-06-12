import { useCallback, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { QrReader } from 'react-qr-reader';
import toast from 'react-hot-toast';
import api from '../services/api.js';

/**
 * Live QR scan for admins. Validates ticket on server (signature, event window, unused).
 * Manual paste works without camera (testing, permission issues, or debugging).
 */
export default function ScannerPage() {
  const [lastResult, setLastResult] = useState(null);
  const [scanning, setScanning] = useState(true);
  const [manualRaw, setManualRaw] = useState('');
  const [validating, setValidating] = useState(false);

  /** Prevents duplicate submissions while the same QR frame streams */
  const lastSentRef = useRef('');
  const busyRef = useRef(false);

  const runScan = useCallback(async (raw, { fromCamera = false } = {}) => {
    const text = typeof raw === 'string' ? raw.trim() : '';
    if (!text) {
      toast.error('No QR payload to validate');
      return;
    }
    if (fromCamera) {
      if (text === lastSentRef.current || busyRef.current) return;
      lastSentRef.current = text;
    } else if (busyRef.current) {
      return;
    }

    busyRef.current = true;
    setValidating(true);
    setLastResult({ raw: text, pending: true });
    try {
      const { data } = await api.post('/tickets/scan', { raw: text });
      toast.success(data.message || 'Valid ticket');
      setLastResult({ raw: text, ok: true, data });
    } catch (e) {
      toast.error(e.message);
      setLastResult({ raw: text, ok: false, error: e.message });
    } finally {
      busyRef.current = false;
      setValidating(false);
    }
  }, []);

  const onResult = useCallback(
    async (result, scanError) => {
      if (scanError) {
        /* noisy in dev — ignore routine "NotFoundException" frames */
        return;
      }
      if (!result) return;
      const text = typeof result.getText === 'function' ? result.getText() : result.text || String(result);
      await runScan(text, { fromCamera: true });
    },
    [runScan]
  );

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold text-clay-ink">QR check-in</h1>
        <Link to="/admin" className="btn-secondary">
          Admin
        </Link>
      </div>
      <p className="text-sm text-clay-muted">
        Allow camera access to scan student tickets during the event window, or paste the raw QR string below
        if the camera is unavailable. Used tickets are rejected.
      </p>

      <div className="glass-card overflow-hidden p-2">
        {scanning ? (
          <QrReader
            constraints={{ facingMode: 'environment' }}
            onResult={onResult}
            containerStyle={{ width: '100%', borderRadius: '1rem' }}
            videoStyle={{ borderRadius: '1rem' }}
          />
        ) : (
          <div className="py-12 text-center text-clay-muted">Camera paused</div>
        )}
      </div>

      <div className="glass-card space-y-3 p-4">
        <h2 className="font-display text-lg font-semibold text-clay-ink">Manual validation</h2>
        <p className="text-xs text-clay-subtle">
          Paste the exact string encoded in the QR (JSON). Example shape:{' '}
          <code className="break-all rounded-lg border border-clay-border bg-clay-bg px-1.5 py-0.5 text-[10px] text-clay-ink">
            {`{"ticketId":"…","eventId":"…","userId":"…","issuedAt":"…","sig":"…"}`}
          </code>
        </p>
        <textarea
          className="input-field min-h-[100px] font-mono text-xs"
          placeholder="Paste raw QR payload (JSON string)…"
          value={manualRaw}
          onChange={(e) => setManualRaw(e.target.value)}
          disabled={validating}
          aria-label="Raw QR payload for manual validation"
        />
        <button
          type="button"
          className="btn-primary w-full sm:w-auto"
          disabled={validating || !manualRaw.trim()}
          onClick={() => runScan(manualRaw, { fromCamera: false })}
        >
          {validating ? 'Validating…' : 'Validate manually'}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-secondary" onClick={() => setScanning((s) => !s)}>
          {scanning ? 'Pause camera' : 'Resume'}
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            lastSentRef.current = '';
            setLastResult(null);
          }}
        >
          Clear result
        </button>
      </div>

      {lastResult?.ok === true && (
        <div className="rounded-2xl border-2 border-accent-200 bg-clay-mint/50 p-4 text-sm text-accent-700">
          <p className="font-semibold text-clay-ink">Check-in successful</p>
          <p className="mt-1">{lastResult.data?.attendee?.name}</p>
          <p className="text-clay-muted">{lastResult.data?.event?.title}</p>
        </div>
      )}
      {lastResult?.ok === false && (
        <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {lastResult.error}
        </div>
      )}
    </div>
  );
}
