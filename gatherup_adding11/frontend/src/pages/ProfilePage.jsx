import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { publicFileSrc } from '../utils/mediaUrl.js';
import ProfilePhotoEditorModal from '../components/ProfilePhotoEditorModal.jsx';
import { 
  User, 
  Settings, 
  CreditCard, 
  Lock, 
  ShieldCheck, 
  MapPin, 
  Phone, 
  Mail, 
  IdCard,
  Plus,
  Trash2
} from 'lucide-react';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState('general');
  const [saving, setSaving] = useState(false);
  const [cards, setCards] = useState([]);
  const [showCardForm, setShowCardForm] = useState(false);
  
  const [generalErrors, setGeneralErrors] = useState({});
  const [passwordErrors, setPasswordErrors] = useState({});
  const [cardErrors, setCardErrors] = useState({});
  const [photoEditorOpen, setPhotoEditorOpen] = useState(false);

  const [generalForm, setGeneralForm] = useState({
    name: '',
    username: '',
    phoneNumber: '',
    address: '',
    idNumber: '',
    shareContactInLostFound: false
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [cardForm, setCardForm] = useState({
    cardName: '',
    cardNumber: '',
    expiry: '',
    cvv: ''
  });

  useEffect(() => {
    if (user) {
      setGeneralForm({
        name: user.name || '',
        username: user.username || '',
        phoneNumber: user.phone || user.phoneNumber || '',
        address: user.address || '',
        idNumber: user.idNumber || '',
        shareContactInLostFound: !!user.shareContactInLostFound
      });
      if (user.savedCards) {
        setCards(user.savedCards);
      }
    }
  }, [user]);

  async function handleGeneralUpdate(e) {
    e.preventDefault();
    setSaving(true);
    setGeneralErrors({});
    try {
      await api.put('/auth/profile', generalForm);
      await refreshUser?.();
      toast.success('Profile updated successfully');
    } catch (err) {
      const backendErrors = err.response?.data?.errors;
      if (backendErrors && Array.isArray(backendErrors)) {
        const errorMap = {};
        backendErrors.forEach((error) => { errorMap[error.field] = error.msg; });
        setGeneralErrors(errorMap);
        toast.error('Please fix the errors in your profile info.');
      } else {
        toast.error(err.message || 'Failed to update profile');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setPasswordErrors({});
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordErrors({ confirmPassword: 'Passwords do not match' });
      return toast.error('Passwords do not match');
    }
    setSaving(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      toast.success('Password changed successfully');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      const backendErrors = err.response?.data?.errors;
      if (backendErrors && Array.isArray(backendErrors)) {
        const errorMap = {};
        backendErrors.forEach((error) => { errorMap[error.field] = error.msg; });
        setPasswordErrors(errorMap);
        toast.error('Security update failed. Check the fields below.');
      } else {
        toast.error(err.message || 'Failed to change password');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleAddCard(e) {
    e.preventDefault();
    setCardErrors({});
    setSaving(true);
    try {
      const { data } = await api.post('/payments/me/cards', cardForm);
      setCards(data.cards || []);
      setShowCardForm(false);
      setCardForm({ cardName: '', cardNumber: '', expiry: '', cvv: '' });
      toast.success('Card saved successfully');
    } catch (err) {
      const backendErrors = err.response?.data?.errors;
      if (backendErrors && Array.isArray(backendErrors)) {
        const errorMap = {};
        backendErrors.forEach((error) => { errorMap[error.field] = error.msg; });
        setCardErrors(errorMap);
        toast.error('Could not save card. Check the card details.');
      } else {
        toast.error(err.message || 'Failed to save card');
      }
    } finally {
      setSaving(false);
    }
  }

  async function deleteCard(cardId) {
    if (!confirm('Are you sure you want to remove this card?')) return;
    try {
      await api.delete(`/payments/me/cards/${cardId}`);
      toast.success('Card removed successfully');
      if (refreshUser) await refreshUser();
    } catch (err) {
      toast.error(err.message || 'Failed to delete card');
    }
  }

  const tabs = [
    { id: 'general', label: 'General Info', icon: User },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'preferences', label: 'Preferences', icon: Settings }
  ];

  const renderError = (field, errorSource) => {
    const msg = errorSource[field];
    if (!msg) return null;
    return (
      <div className="error-text">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        {msg}
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-clay-ink">Profile Dashboard</h1>
          <p className="text-clay-muted">Manage your personal information and account settings.</p>
        </div>
        <div className="flex items-center gap-4 bg-clay-surface/50 p-2 rounded-2xl border border-clay-border">
          <button
            type="button"
            className="group relative h-12 w-12 overflow-hidden rounded-xl border border-clay-border bg-hero-gradient"
            title="Update profile photo"
            aria-label="Update profile photo"
            onClick={() => setPhotoEditorOpen(true)}
          >
            {user?.avatar ? (
              <img
                src={publicFileSrc(user.avatar)}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-white font-bold text-xl">
                {user?.name?.[0] || 'U'}
              </div>
            )}
            <span className="absolute inset-0 bg-black/0 transition group-hover:bg-black/10" />
          </button>
          <div>
            <p className="text-sm font-bold text-clay-ink">{user?.name}</p>
            <p className="text-xs text-clay-muted capitalize">{user?.role}</p>
          </div>
        </div>
      </div>
      <ProfilePhotoEditorModal
        open={photoEditorOpen}
        onClose={() => setPhotoEditorOpen(false)}
        onSaved={refreshUser}
      />

      <div className="grid md:grid-cols-[240px_1fr] gap-8">
        {/* Sidebar Tabs */}
        <aside className="space-y-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-clay-primary text-white shadow-clay-glow translate-x-1'
                    : 'text-clay-muted hover:bg-clay-peach/40 hover:text-clay-ink'
                }`}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </aside>

        {/* Content Area */}
        <main className="glass-card p-8 min-h-[500px]">
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-clay-border">
                <ShieldCheck className="text-clay-primary" />
                <h2 className="text-xl font-bold text-clay-ink">Personal Information</h2>
              </div>
              
              <form onSubmit={handleGeneralUpdate} className="grid gap-6 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="label">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 text-clay-muted" size={18} />
                    <input 
                      className={`input-field pl-10 ${generalErrors.name ? 'input-error' : ''}`} 
                      value={generalForm.name} 
                      onChange={e => setGeneralForm({...generalForm, name: e.target.value})}
                      required
                    />
                  </div>
                  {renderError('name', generalErrors)}
                </div>

                <div className="space-y-1">
                  <label className="label">Username</label>
                  <div className="relative">
                    <IdCard className="absolute left-3 top-3 text-clay-muted" size={18} />
                    <input 
                      className={`input-field pl-10 ${generalErrors.username ? 'input-error' : ''}`} 
                      value={generalForm.username} 
                      onChange={e => setGeneralForm({...generalForm, username: e.target.value})}
                    />
                  </div>
                  {renderError('username', generalErrors)}
                </div>

                <div className="space-y-1">
                  <label className="label">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 text-clay-muted" size={18} />
                    <input 
                      className="input-field pl-10 bg-clay-bg/50 cursor-not-allowed" 
                      value={user?.email || ''} 
                      readOnly
                    />
                  </div>
                  <p className="text-[10px] text-clay-muted px-1">Email cannot be changed.</p>
                </div>

                <div className="space-y-1">
                  <label className="label">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 text-clay-muted" size={18} />
                    <input 
                      className={`input-field pl-10 ${generalErrors.phoneNumber ? 'input-error' : ''}`} 
                      value={generalForm.phoneNumber} 
                      onChange={e => setGeneralForm({...generalForm, phoneNumber: e.target.value})}
                    />
                  </div>
                  {renderError('phoneNumber', generalErrors)}
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="label">Residential Address</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 text-clay-muted" size={18} />
                    <input 
                      className={`input-field pl-10 ${generalErrors.address ? 'input-error' : ''}`} 
                      value={generalForm.address} 
                      onChange={e => setGeneralForm({...generalForm, address: e.target.value})}
                    />
                  </div>
                  {renderError('address', generalErrors)}
                </div>

                <div className="space-y-1">
                  <label className="label">ID Number</label>
                  <input 
                    className={`input-field ${generalErrors.idNumber ? 'input-error' : ''}`} 
                    value={generalForm.idNumber} 
                    onChange={e => setGeneralForm({...generalForm, idNumber: e.target.value})}
                  />
                  {renderError('idNumber', generalErrors)}
                </div>

                <div className="md:col-span-2 pt-4">
                  <button type="submit" className="btn-primary w-full md:w-auto px-8" disabled={saving}>
                    {saving ? 'Updating...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6 max-w-md">
              <div className="flex items-center gap-3 pb-4 border-b border-clay-border">
                <Lock className="text-clay-primary" />
                <h2 className="text-xl font-bold text-clay-ink">Change Password</h2>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-1">
                  <label className="label">Current Password</label>
                  <input 
                    type="password" 
                    className={`input-field ${passwordErrors.currentPassword ? 'input-error' : ''}`} 
                    value={passwordForm.currentPassword}
                    onChange={e => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                    required
                  />
                  {renderError('currentPassword', passwordErrors)}
                </div>
                <div className="space-y-1">
                  <label className="label">New Password</label>
                  <input 
                    type="password" 
                    className={`input-field ${passwordErrors.newPassword ? 'input-error' : ''}`} 
                    value={passwordForm.newPassword}
                    onChange={e => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                    required
                  />
                  {renderError('newPassword', passwordErrors)}
                </div>
                <div className="space-y-1">
                  <label className="label">Confirm New Password</label>
                  <input 
                    type="password" 
                    className={`input-field ${passwordErrors.confirmPassword ? 'input-error' : ''}`} 
                    value={passwordForm.confirmPassword}
                    onChange={e => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                    required
                  />
                  {renderError('confirmPassword', passwordErrors)}
                </div>
                <button type="submit" className="btn-primary w-full" disabled={saving}>
                  {saving ? 'Updating Password...' : 'Update Password'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-clay-border">
                <div className="flex items-center gap-3">
                  <CreditCard className="text-clay-primary" />
                  <h2 className="text-xl font-bold text-clay-ink">Payment Methods</h2>
                </div>
                <button 
                  onClick={() => setShowCardForm(!showCardForm)}
                  className="btn-secondary text-xs flex items-center gap-2"
                >
                  <Plus size={14} />
                  {showCardForm ? 'Cancel' : 'Add New Card'}
                </button>
              </div>

              {showCardForm && (
                <form onSubmit={handleAddCard} className="bg-clay-bg/50 p-6 rounded-2xl border border-clay-border space-y-4 animate-in slide-in-from-top-4 duration-300">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1 md:col-span-2">
                      <label className="label">Card Nickname (e.g., My Visa)</label>
                      <input 
                        className={`input-field ${cardErrors.cardName ? 'input-error' : ''}`}
                        value={cardForm.cardName}
                        onChange={e => setCardForm({...cardForm, cardName: e.target.value})}
                        placeholder="Shopping Card"
                      />
                      {renderError('cardName', cardErrors)}
                    </div>
                    <div className="space-y-1">
                      <label className="label">Card Number</label>
                      <input 
                        className={`input-field ${cardErrors.cardNumber ? 'input-error' : ''}`}
                        value={cardForm.cardNumber}
                        onChange={e => setCardForm({...cardForm, cardNumber: e.target.value.replace(/\D/g, '').slice(0, 16)})}
                        placeholder="**** **** **** ****"
                        required
                      />
                      {renderError('cardNumber', cardErrors)}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="label">Expiry</label>
                        <input 
                          className={`input-field ${cardErrors.expiry ? 'input-error' : ''}`}
                          value={cardForm.expiry}
                          onChange={e => setCardForm({...cardForm, expiry: e.target.value})}
                          placeholder="MM/YY"
                          required
                        />
                        {renderError('expiry', cardErrors)}
                      </div>
                      <div className="space-y-1">
                        <label className="label">CVV</label>
                        <input 
                          type="password"
                          className={`input-field ${cardErrors.cvv ? 'input-error' : ''}`}
                          value={cardForm.cvv}
                          onChange={e => setCardForm({...cardForm, cvv: e.target.value.replace(/\D/g, '').slice(0, 3)})}
                          placeholder="***"
                          required
                        />
                        {renderError('cvv', cardErrors)}
                      </div>
                    </div>
                  </div>
                  <button type="submit" className="btn-primary" disabled={saving}>
                    {saving ? 'Saving...' : 'Save Card'}
                  </button>
                </form>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                {cards.map((card) => (
                  <div key={card._id || card.cardNumber} className="relative group bg-clay-surface p-4 rounded-2xl border border-clay-border hover:shadow-clay transition-all">
                    <div className="flex justify-between items-start">
                      <div className="h-10 w-14 bg-clay-ink rounded-lg flex items-center justify-center mb-3">
                        <div className="h-4 w-4 bg-yellow-500 rounded-full -ml-1 opacity-80" />
                        <div className="h-4 w-4 bg-red-500 rounded-full -mr-1 opacity-80" />
                      </div>
                      <button 
                        onClick={() => deleteCard(card._id)}
                        className="p-2 text-clay-muted hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <p className="text-sm font-bold text-clay-ink">{card.cardName || 'Untitled Card'}</p>
                    <p className="text-xs text-clay-muted mt-1 font-mono tracking-wider">
                      **** **** **** {card.cardNumber.slice(-4)}
                    </p>
                    <div className="flex justify-between items-center mt-4">
                      <span className="text-[10px] text-clay-muted uppercase">Expiry: {card.expiry}</span>
                      <ShieldCheck size={14} className="text-clay-primary" />
                    </div>
                  </div>
                ))}
                {cards.length === 0 && !showCardForm && (
                  <div className="sm:col-span-2 py-12 text-center text-clay-muted border-2 border-dashed border-clay-border rounded-2xl">
                    No saved cards yet.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'preferences' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-clay-border">
                <Settings className="text-clay-primary" />
                <h2 className="text-xl font-bold text-clay-ink">System Preferences</h2>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-clay-bg/40 rounded-2xl border border-clay-border space-y-4">
                  <h3 className="font-bold text-clay-ink">Lost & Found Privacy</h3>
                  <p className="text-sm text-clay-muted">
                    When you report a lost item or notify a finder, choose how you want to be contacted.
                  </p>
                  <label className="flex items-start gap-4 cursor-pointer group">
                    <div className="relative flex items-center">
                      <input 
                        type="checkbox"
                        className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-clay-border bg-white transition-all checked:bg-clay-primary checked:border-clay-primary"
                        checked={generalForm.shareContactInLostFound}
                        onChange={e => {
                          const val = e.target.checked;
                          setGeneralForm({...generalForm, shareContactInLostFound: val});
                          // Auto save this one since it's a toggle
                          api.put('/auth/profile', { shareContactInLostFound: val })
                            .then(() => refreshUser?.())
                            .catch(err => toast.error(err.message));
                        }}
                      />
                      <svg className="absolute h-3.5 w-3.5 pointer-events-none hidden peer-checked:block left-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </div>
                    <span className="text-sm text-clay-ink select-none">
                      Share my email and phone number in Lost & Found conversation headers automatically.
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
