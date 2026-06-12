import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api.js';

export default function AdminMetaPage() {
  const [categories, setCategories] = useState([]);
  const [venues, setVenues] = useState([]);
  const [catName, setCatName] = useState('');
  const [venueForm, setVenueForm] = useState({ name: '', location: '', capacity: 100 });

  async function refresh() {
    const [c, v] = await Promise.all([api.get('/categories'), api.get('/venues')]);
    setCategories(c.data);
    setVenues(v.data);
  }

  useEffect(() => {
    (async () => {
      try {
        await refresh();
      } catch (e) {
        toast.error(e.message);
      }
    })();
  }, []);

  async function addCategory(e) {
    e.preventDefault();
    try {
      await api.post('/categories', { name: catName });
      setCatName('');
      toast.success('Category added');
      await refresh();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function addVenue(e) {
    e.preventDefault();
    try {
      await api.post('/venues', venueForm);
      toast.success('Venue added');
      setVenueForm({ name: '', location: '', capacity: 100 });
      await refresh();
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold text-clay-ink">Categories &amp; Venues</h1>
        <Link to="/admin" className="btn-secondary">
          ← Admin
        </Link>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass-card p-5">
          <h2 className="font-display text-lg font-semibold text-clay-ink">Categories</h2>
          <form onSubmit={addCategory} className="mt-4 flex gap-2">
            <input
              className="input-field flex-1"
              placeholder="Name"
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              required
            />
            <button type="submit" className="btn-primary">
              Add
            </button>
          </form>
          <ul className="mt-4 space-y-2 text-sm text-clay-ink">
            {categories.map((c) => (
              <li key={c._id} className="flex justify-between rounded-2xl border border-clay-border/60 bg-clay-bg/50 px-3 py-2">
                {c.name}
                <button
                  type="button"
                  className="text-xs font-medium text-red-600 hover:underline"
                  onClick={async () => {
                    if (!confirm('Delete?')) return;
                    try {
                      await api.delete(`/categories/${c._id}`);
                      await refresh();
                    } catch (err) {
                      toast.error(err.message);
                    }
                  }}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="glass-card p-5">
          <h2 className="font-display text-lg font-semibold text-clay-ink">Venues</h2>
          <form onSubmit={addVenue} className="mt-4 space-y-2">
            <input
              className="input-field"
              placeholder="Name"
              value={venueForm.name}
              onChange={(e) => setVenueForm({ ...venueForm, name: e.target.value })}
              required
            />
            <input
              className="input-field"
              placeholder="Location"
              value={venueForm.location}
              onChange={(e) => setVenueForm({ ...venueForm, location: e.target.value })}
              required
            />
            <input
              className="input-field"
              type="number"
              min={1}
              value={venueForm.capacity}
              onChange={(e) => setVenueForm({ ...venueForm, capacity: e.target.value })}
            />
            <button type="submit" className="btn-primary w-full">
              Add venue
            </button>
          </form>
          <ul className="mt-4 space-y-2 text-sm text-clay-ink">
            {venues.map((v) => (
              <li key={v._id} className="flex justify-between rounded-2xl border border-clay-border/60 bg-clay-bg/50 px-3 py-2">
                <span>
                  {v.name} — {v.location} (cap {v.capacity})
                </span>
                <button
                  type="button"
                  className="text-xs font-medium text-red-600 hover:underline"
                  onClick={async () => {
                    if (!confirm('Delete?')) return;
                    try {
                      await api.delete(`/venues/${v._id}`);
                      await refresh();
                    } catch (err) {
                      toast.error(err.message);
                    }
                  }}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
