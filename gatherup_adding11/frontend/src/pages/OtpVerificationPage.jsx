import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.jsx';

export default function OtpVerificationPage() {
  const { verifyOTP, resendOTP } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [timer, setTimer] = useState(600); // 10 minutes in seconds

  // Get email and userData from URL params
  const email = searchParams.get('email');
  const userData = JSON.parse(searchParams.get('userData') || '{}');

  // Countdown timer
  useState(() => {
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 0) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  });

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  async function onSubmit(e) {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error('Please enter a 6-digit OTP');
      return;
    }
    setBusy(true);
    try {
      await verifyOTP(email, otp, userData);
      toast.success('Account verified successfully!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function onResend() {
    setResending(true);
    try {
      await resendOTP(email);
      toast.success('OTP resent successfully!');
      setTimer(600); // Reset timer
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resend OTP');
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="glass-card p-8">
        <h1 className="font-display text-2xl font-bold text-clay-ink">Verify Your Email</h1>
        <p className="mt-1 text-sm text-clay-muted">
          We've sent a 6-digit code to <span className="font-medium">{email}</span>
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="label" htmlFor="otp">
              Enter OTP
            </label>
            <input
              id="otp"
              className="input-field text-center text-2xl tracking-widest"
              type="text"
              value={otp}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                setOtp(value);
              }}
              placeholder="000000"
              maxLength={6}
              required
              autoFocus
            />
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className={`text-clay-muted ${timer === 0 ? 'text-red-500' : ''}`}>
              Expires in: {formatTime(timer)}
            </span>
            <button
              type="button"
              onClick={onResend}
              disabled={resending || timer > 540}
              className="text-clay-primary hover:underline disabled:text-clay-muted disabled:no-underline"
            >
              {resending ? 'Resending...' : 'Resend OTP'}
            </button>
          </div>

          <button type="submit" className="btn-primary w-full" disabled={busy || otp.length !== 6}>
            {busy ? 'Verifying...' : 'Verify & Create Account'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-clay-muted">
          Wrong email?{' '}
          <button
            onClick={() => navigate('/register')}
            className="font-medium text-clay-primary hover:underline"
          >
            Go back to registration
          </button>
        </p>
      </div>
    </div>
  );
}
