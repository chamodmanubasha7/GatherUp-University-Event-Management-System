import { useEffect, useState } from 'react';
import api from '../services/api.js';
import toast from 'react-hot-toast';
import { Megaphone, Plus, Trash2, Edit2, X } from 'lucide-react';

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    title: '',
    content: '',
    category: 'announcement',
    priority: 'medium',
    tags: ''
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  async function fetchAnnouncements() {
    try {
      const { data } = await api.get('/announcements');
      setAnnouncements(data.announcements);
    } catch (err) {
      toast.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrors({});
    const payload = {
      ...form,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean)
    };

    try {
      if (editingId) {
        await api.put(`/announcements/${editingId}`, payload);
        toast.success('Announcement updated');
      } else {
        await api.post('/announcements', payload);
        toast.success('Announcement created');
      }
      setShowModal(false);
      setEditingId(null);
      setForm({ title: '', content: '', category: 'announcement', priority: 'medium', tags: '' });
      fetchAnnouncements();
    } catch (err) {
      const backendErrors = err.response?.data?.errors;
      if (backendErrors && Array.isArray(backendErrors)) {
        const errorMap = {};
        backendErrors.forEach((error) => { errorMap[error.field] = error.msg; });
        setErrors(errorMap);
        toast.error('Validation failed. Please check the fields.');
      } else {
        toast.error(err.response?.data?.message || 'Action failed');
      }
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

  async function deleteAnnouncement(id) {
    if (!confirm('Are you sure you want to delete this announcement?')) return;
    try {
      await api.delete(`/announcements/${id}`);
      toast.success('Announcement deleted');
      fetchAnnouncements();
    } catch (err) {
      toast.error('Delete failed');
    }
  }

  function startEdit(ann) {
    setEditingId(ann._id);
    setForm({
      title: ann.title,
      content: ann.content,
      category: ann.category,
      priority: ann.priority,
      tags: ann.tags.join(', ')
    });
    setShowModal(true);
  }

  if (loading) return <div className="p-8 text-center text-sm text-clay-muted">Loading…</div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-clay-ink flex items-center gap-3">
            <Megaphone className="text-clay-primary" />
            Manage Announcements
          </h1>
          <p className="mt-1 text-sm text-clay-muted">Broadcast important news to all users.</p>
        </div>
        <button 
          onClick={() => {
            setEditingId(null);
            setForm({ title: '', content: '', category: 'announcement', priority: 'medium', tags: '' });
            setErrors({});
            setShowModal(true);
          }} 
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} />
          New Announcement
        </button>
      </div>

      <div className="grid gap-4">
        {announcements.map((ann) => (
          <div key={ann._id} className="glass-card p-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${
                  ann.priority === 'high' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {ann.priority}
                </span>
                <span className="text-xs text-clay-muted">{ann.category}</span>
              </div>
              <h3 className="font-bold text-clay-ink">{ann.title}</h3>
              <p className="text-xs text-clay-muted line-clamp-1">{ann.content}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => startEdit(ann)} className="p-2 text-clay-muted hover:text-clay-ink transition-colors">
                <Edit2 size={18} />
              </button>
              <button onClick={() => deleteAnnouncement(ann._id)} className="p-2 text-clay-muted hover:text-red-600 transition-colors">
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-clay-ink/20 backdrop-blur-sm">
          <div className="glass-card w-full max-w-lg p-8 space-y-6 animate-scale-in">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-clay-ink">
                {editingId ? 'Edit Announcement' : 'New Announcement'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-clay-muted hover:text-clay-ink">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="label">Title</label>
                <input 
                  className={`input-field ${errors.title ? 'input-error' : ''}`} 
                  value={form.title} 
                  onChange={e => setForm({...form, title: e.target.value})} 
                  required 
                />
                {renderError('title')}
              </div>

              <div className="space-y-1">
                <label className="label">Content</label>
                <textarea 
                  className={`input-field min-h-[120px] py-2 ${errors.content ? 'input-error' : ''}`} 
                  value={form.content} 
                  onChange={e => setForm({...form, content: e.target.value})} 
                  required 
                />
                {renderError('content')}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="label">Category</label>
                  <select 
                    className="input-field py-2" 
                    value={form.category} 
                    onChange={e => setForm({...form, category: e.target.value})}
                  >
                    <option value="news">News</option>
                    <option value="announcement">Announcement</option>
                    <option value="update">Update</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="label">Priority</label>
                  <select 
                    className="input-field py-2" 
                    value={form.priority} 
                    onChange={e => setForm({...form, priority: e.target.value})}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="label">Tags (comma separated)</label>
                <input 
                  className={`input-field ${errors.tags ? 'input-error' : ''}`} 
                  placeholder="campus, holiday, tech" 
                  value={form.tags} 
                  onChange={e => setForm({...form, tags: e.target.value})} 
                />
                {renderError('tags')}
              </div>

              <button type="submit" className="btn-primary w-full py-3">
                {editingId ? 'Save Changes' : 'Post Announcement'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
