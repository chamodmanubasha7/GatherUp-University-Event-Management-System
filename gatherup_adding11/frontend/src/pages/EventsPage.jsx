import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { LayoutGrid as GridIcon, List as ListIcon } from 'lucide-react';
import api from '../services/api.js';
import { formatDateRange } from '../utils/dates.js';

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [allEvents, setAllEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ category: '', search: '', from: '', to: '' });
  const [view, setView] = useState(() => localStorage.getItem('eventsView') || 'grid');

  useEffect(() => {
    (async () => {
      try {
        const [ev, cat] = await Promise.all([api.get('/events'), api.get('/categories')]);
        setEvents(ev.data);
        setAllEvents(ev.data);
        setCategories(cat.data);
      } catch (e) {
        toast.error(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        if (filters.category) params.set('category', filters.category);
        if (filters.search) params.set('search', filters.search);
        if (filters.from) params.set('from', filters.from);
        if (filters.to) params.set('to', filters.to);
        const { data } = await api.get(`/events?${params.toString()}`);
        setEvents(data);
      } catch (e) {
        toast.error(e.message);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [filters]);

  const searchTerm = filters.search.trim().toLowerCase();
  const suggestions = searchTerm
    ? [...new Set(allEvents.map((ev) => ev.title).filter((title) => title?.toLowerCase().includes(searchTerm)))].slice(0, 6)
    : [];

  if (loading) {
    return <div className="py-20 text-center text-clay-muted">Loading events…</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-clay-ink">Events</h1>
          <p className="text-clay-muted">Filter by category, date, or keywords.</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className={view === 'grid' ? 'btn-primary !py-2 !text-xs' : 'btn-secondary !py-2 !text-xs'}
            onClick={() => {
              setView('grid');
              localStorage.setItem('eventsView', 'grid');
            }}
          >
            <span className="inline-flex items-center gap-1.5">
              <GridIcon className="h-4 w-4" strokeWidth={2.25} />
              Grid
            </span>
          </button>
          <button
            type="button"
            className={view === 'list' ? 'btn-primary !py-2 !text-xs' : 'btn-secondary !py-2 !text-xs'}
            onClick={() => {
              setView('list');
              localStorage.setItem('eventsView', 'list');
            }}
          >
            <span className="inline-flex items-center gap-1.5">
              <ListIcon className="h-4 w-4" strokeWidth={2.25} />
              List
            </span>
          </button>
        </div>
      </div>

      <div className="glass-card flex flex-wrap gap-4 p-4">
        <div className="relative w-full max-w-xs">
          <input
            className="input-field w-full"
            placeholder="Search title or description"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
          {suggestions.length > 0 && (
            <ul className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-20 overflow-hidden rounded-2xl border border-white/50 bg-white shadow-soft">
              {suggestions.map((title) => (
                <li key={title}>
                  <button
                    type="button"
                    className="w-full px-4 py-2 text-left text-sm text-clay-ink hover:bg-clay-lilac/35"
                    onClick={() => setFilters({ ...filters, search: title })}
                  >
                    {title}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <select
          className="input-field max-w-xs"
          value={filters.category}
          onChange={(e) => setFilters({ ...filters, category: e.target.value })}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <input
            type="date"
            className="input-field max-w-[140px] text-xs py-1.5 px-3"
            value={filters.from}
            onChange={(e) => setFilters({ ...filters, from: e.target.value })}
          />
          <span className="text-sm font-medium text-clay-muted">to</span>
          <input
            type="date"
            className="input-field max-w-[140px] text-xs py-1.5 px-3"
            value={filters.to}
            onChange={(e) => setFilters({ ...filters, to: e.target.value })}
          />
        </div>
      </div>

      <div className={view === 'grid' ? 'grid gap-6 md:grid-cols-2' : 'space-y-4'}>
        {events.length === 0 && (
          <p className="text-clay-muted">No events match your filters.</p>
        )}
        {events.map((ev) => (
          <Link
            key={ev._id}
            to={`/events/${ev._id}`}
            className={
              view === 'grid'
                ? 'glass-card-interactive group flex flex-col overflow-hidden h-full'
                : 'glass-card-interactive group flex items-center overflow-hidden'
            }
          >
            <div
              className={view === 'grid' ? 'h-48 w-full shrink-0 bg-clay-lilac bg-cover bg-center relative' : 'h-24 w-28 shrink-0 bg-clay-lilac bg-cover bg-center relative'}
              style={
                ev.image
                   ? { backgroundImage: `url(${ev.image})` }
                   : { backgroundImage: 'linear-gradient(135deg,#7c3aed,#10b981)' }
              }
            >
              <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm backdrop-blur-md ${
                  ev.ticketingType === 'Free' ? 'bg-emerald-500/90 text-white' : 'bg-clay-lilac/90 text-clay-primary'
                }`}>
                  {ev.ticketingType === 'Free' ? 'Free' : 'Ticketed'}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm backdrop-blur-md ${
                  ev.locationType === 'Outdoor' ? 'bg-clay-peach/90 text-clay-ink' : 'bg-clay-mint/90 text-accent-800'
                }`}>
                  {ev.locationType || 'Indoor'}
                </span>
              </div>
            </div>
            <div className="flex flex-1 flex-col p-5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-accent-600">
                  {ev.category?.name}
                </span>
                {ev.ticketingType === 'Ticket' && (
                  <span className="text-xs font-bold text-clay-ink">
                    Rs. {Number(ev.ticketPrice || 0).toLocaleString()}
                  </span>
                )}
              </div>
              <h2 className="font-display text-xl font-bold text-clay-ink group-hover:text-clay-primary transition-colors line-clamp-1">
                {ev.title}
              </h2>
              <p className={view === 'grid' ? 'mt-2 line-clamp-2 text-sm text-clay-muted leading-relaxed' : 'mt-1 line-clamp-1 text-sm text-clay-muted'}>
                {ev.description}
              </p>
              <div className="mt-auto pt-4 flex flex-col gap-2 border-t border-clay-border/40 mt-4">
                <div className="flex items-center justify-between text-[10px] font-semibold text-clay-subtle uppercase">
                  <span className="flex items-center gap-1">
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    {new Date(ev.startDateTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                  <span className="flex items-center gap-1">
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    {ev.venue?.name}
                  </span>
                </div>
                <div className="w-full bg-clay-bg rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-clay-primary h-full transition-all duration-500" 
                    style={{ width: `${Math.min(100, ((ev.registrationCount || 0) / ev.capacity) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[9px] font-bold text-clay-subtle">
                  <span>{ev.registrationCount ?? 0} REGISTERED</span>
                  <span>{ev.capacity} CAPACITY</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
