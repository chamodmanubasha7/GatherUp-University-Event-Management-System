import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.jsx';

export default function RegisterPage() {
  const { sendOTP } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    phoneNumber: '',
    idNumber: '',
    address: ''
  });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  // Client-side validation
  const validateForm = () => {
    const newErrors = {};

    // Email validation
    if (!form.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Please enter a valid email address';
    } else if (form.email.length > 255) {
      newErrors.email = 'Email address is too long';
    }

    // Password validation
    if (!form.password) {
      newErrors.password = 'Password is required';
    } else if (form.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (form.password.length > 128) {
      newErrors.password = 'Password is too long';
    } else if (!/(?=.*[a-z])/.test(form.password)) {
      newErrors.password = 'Password must contain at least one lowercase letter';
    } else if (!/(?=.*[A-Z])/.test(form.password)) {
      newErrors.password = 'Password must contain at least one uppercase letter';
    } else if (!/(?=.*\d)/.test(form.password)) {
      newErrors.password = 'Password must contain at least one number';
    }

    // Name validation
    if (!form.name) {
      newErrors.name = 'Full name is required';
    } else if (form.name.length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    } else if (form.name.length > 100) {
      newErrors.name = 'Name is too long';
    } else if (!/^[a-zA-Z\s\-']+$/.test(form.name)) {
      newErrors.name = 'Name can only contain letters, spaces, hyphens, and apostrophes';
    }

    // Username validation
    if (!form.username) {
      newErrors.username = 'Username is required';
    } else if (form.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    } else if (form.username.length > 30) {
      newErrors.username = 'Username is too long';
    } else if (!/^[a-zA-Z0-9_]+$/.test(form.username)) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores';
    }

    // Phone number validation
    if (!form.phoneNumber) {
      newErrors.phoneNumber = 'Phone number is required';
    } else if (form.phoneNumber.length < 10) {
      newErrors.phoneNumber = 'Phone number must be at least 10 characters';
    } else if (form.phoneNumber.length > 20) {
      newErrors.phoneNumber = 'Phone number is too long';
    } else if (!/^\+?[0-9\s\-()]+$/.test(form.phoneNumber)) {
      newErrors.phoneNumber = 'Phone number format is invalid. Use: +1234567890 or 123-456-7890';
    }

    // ID number validation
    if (!form.idNumber) {
      newErrors.idNumber = 'ID number is required';
    } else if (form.idNumber.length < 5) {
      newErrors.idNumber = 'ID number must be at least 5 characters';
    } else if (form.idNumber.length > 50) {
      newErrors.idNumber = 'ID number is too long';
    } else if (!/^[a-zA-Z0-9\-]+$/.test(form.idNumber)) {
      newErrors.idNumber = 'ID number can only contain letters, numbers, and hyphens';
    }

    // Address validation
    if (!form.address) {
      newErrors.address = 'Address is required';
    } else if (form.address.length < 5) {
      newErrors.address = 'Address must be at least 5 characters';
    } else if (form.address.length > 255) {
      newErrors.address = 'Address is too long';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  async function onSubmit(e) {
    e.preventDefault();

    // Run client-side validation first
    if (!validateForm()) {
      toast.error('Please correct the highlighted errors.');
      return;
    }

    setBusy(true);
    setErrors({});
    try {
      // Send OTP first
      await sendOTP(form.email);
      toast.success('OTP sent to your email!');
      // Redirect to OTP verification page with email and user data
      navigate(`/verify-otp?email=${encodeURIComponent(form.email)}&userData=${encodeURIComponent(JSON.stringify(form))}`);
    } catch (err) {
      const backendErrors = err.response?.data?.errors;
      if (backendErrors && Array.isArray(backendErrors)) {
        const errorMap = {};
        backendErrors.forEach((error) => {
          errorMap[error.field] = error.msg;
        });
        setErrors(errorMap);
        toast.error('Please correct the highlighted errors.');
      } else {
        toast.error(err.response?.data?.message || err.message || 'Failed to send OTP. Please check your details.');
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
        <h1 className="font-display text-2xl font-bold text-clay-ink">Join GatherUp</h1>
        <p className="mt-1 text-sm text-clay-muted">Students start here — admins are promoted separately.</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="username">
                Username
              </label>
              <input
                id="username"
                className={`input-field ${errors.username ? 'input-error' : ''}`}
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                required
              />
              {renderError('username')}
            </div>
            <div>
              <label className="label" htmlFor="name">
                Full name
              </label>
              <input
                id="name"
                className={`input-field ${errors.name ? 'input-error' : ''}`}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
              {renderError('name')}
            </div>
          </div>
          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              className={`input-field ${errors.email ? 'input-error' : ''}`}
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              autoComplete="email"
            />
            {renderError('email')}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="phoneNumber">
                Phone Number
              </label>
              <input
                id="phoneNumber"
                className={`input-field ${errors.phoneNumber ? 'input-error' : ''}`}
                type="tel"
                value={form.phoneNumber}
                onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                required
              />
              {renderError('phoneNumber')}
            </div>
            <div>
              <label className="label" htmlFor="idNumber">
                ID Number
              </label>
              <input
                id="idNumber"
                className={`input-field ${errors.idNumber ? 'input-error' : ''}`}
                value={form.idNumber}
                onChange={(e) => setForm({ ...form, idNumber: e.target.value })}
                required
              />
              {renderError('idNumber')}
            </div>
          </div>
          <div>
            <label className="label" htmlFor="address">
              Address
            </label>
            <input
              id="address"
              className={`input-field ${errors.address ? 'input-error' : ''}`}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              required
            />
            {renderError('address')}
          </div>
          <div>
            <label className="label" htmlFor="password">
              Password (min 8, uppercase, lowercase, number)
            </label>
            <input
              id="password"
              className={`input-field ${errors.password ? 'input-error' : ''}`}
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              minLength={8}
              autoComplete="new-password"
            />
            {renderError('password')}
          </div>
          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? 'Creating…' : 'Sign up'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-clay-muted">
          Already registered?{' '}
          <Link to="/login" className="font-medium text-clay-primary hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}

