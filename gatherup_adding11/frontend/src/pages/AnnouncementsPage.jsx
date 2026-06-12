import { useEffect, useState } from 'react';
import api from '../services/api.js';
import { Megaphone, AlertCircle, Clock } from 'lucide-react';

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnnouncements() {
      try {
        const { data } = await api.get('/announcements');
        setAnnouncements(data.announcements);
      } catch (err) {
        console.error('Failed to fetch announcements', err);
      } finally {
        setLoading(false);
      }
    }
    fetchAnnouncements();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-24 text-sm text-clay-muted">
        Loading announcements…
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-clay-ink flex items-center gap-3">
            <Megaphone className="text-clay-primary" />
            Announcements
          </h1>
          <p className="mt-1 text-sm text-clay-muted">Stay updated with the latest news and campus events.</p>
        </div>
      </header>

      {announcements.length === 0 ? (
        <div className="glass-card py-24 text-center">
          <p className="text-sm text-clay-muted">No active announcements at the moment.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {announcements.map((ann) => (
            <div key={ann._id} className={`glass-card p-6 border-l-4 ${
              ann.priority === 'high' ? 'border-red-500' : 
              ann.priority === 'medium' ? 'border-blue-500' : 'border-emerald-500'
            }`}>
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${
                      ann.priority === 'high' ? 'bg-red-100 text-red-700' : 
                      ann.priority === 'medium' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {ann.priority} Priority
                    </span>
                    <span className="text-xs text-clay-muted flex items-center gap-1">
                      <Clock size={12} />
                      {new Date(ann.publishDate).toLocaleDateString()}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-clay-ink">{ann.title}</h2>
                  <p className="text-clay-muted text-sm leading-relaxed">{ann.content}</p>
                  {ann.tags && ann.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      {ann.tags.map(tag => (
                        <span key={tag} className="text-[10px] bg-clay-muted/10 text-clay-ink px-2 py-0.5 rounded-full">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {ann.category === 'urgent' && (
                  <AlertCircle className="text-red-500 shrink-0" size={24} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
