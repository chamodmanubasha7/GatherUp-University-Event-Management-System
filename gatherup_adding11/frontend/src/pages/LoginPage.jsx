import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.jsx';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      const backendErrors = err.response?.data?.errors;
      if (backendErrors && Array.isArray(backendErrors)) {
        const errorMap = {};
        backendErrors.forEach((error) => { errorMap[error.field] = error.msg; });
        setErrors(errorMap);
        toast.error('Login failed. Please check your credentials.');
      } else {
        toast.error(err.message || 'Login failed.');
      }
    } finally {
      setBusy(false);
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

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="glass-card p-8">
        <h1 className="font-display text-2xl font-bold text-clay-ink">Log in</h1>
        <p className="mt-1 text-sm text-clay-muted">Access your tickets and campus tools.</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              className={`input-field ${errors.email ? 'input-error' : ''}`}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            {renderError('email')}
          </div>
          <div>
            <label className="label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              className={`input-field ${errors.password ? 'input-error' : ''}`}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            {renderError('password')}
          </div>
          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-clay-muted">
          New here?{' '}
          <Link to="/register" className="font-medium text-clay-primary hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
