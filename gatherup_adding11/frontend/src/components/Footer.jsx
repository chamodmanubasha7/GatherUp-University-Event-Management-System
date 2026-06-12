import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Mail, Phone, MapPin, ExternalLink } from 'lucide-react';
import api from '../services/api.js';
import { isUpcoming, formatDateRange } from '../utils/dates.js';

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function monthGrid(year, month) {
  const first = new Date(year, month, 1);
  const startDow = first.getDay(); // 0..6, Sun..Sat
  const start = new Date(year, month, 1 - startDow);
  const days = [];
  for (let i = 0; i < 42; i++) {
    days.push(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  }
  return days;
}

export default function Footer() {
  const location = useLocation();
  const [events, setEvents] = useState([]);
  const now = new Date();
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [selectedDayEvents, setSelectedDayEvents] = useState(null); // { date: Date, events: [] }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('/events');
        if (!cancelled) setEvents(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setEvents([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const days = useMemo(() => monthGrid(viewYear, viewMonth), [viewYear, viewMonth]);

  const byDay = useMemo(() => {
    const map = new Map(); // key: time, value: [] (events)
    for (const ev of events) {
      const day = startOfDay(ev.startDateTime).getTime();
      const list = map.get(day) || [];
      list.push(ev);
      map.set(day, list);
    }
    return map;
  }, [events]);

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleDayClick = (d, dayEvents) => {
    if (dayEvents && dayEvents.length > 0) {
      setSelectedDayEvents({ date: d, events: dayEvents });
    }
  };

  return (
    <footer className="border-t border-clay-border/70 bg-gradient-to-b from-clay-surface to-clay-bg relative">
      {/* Daily Events Pop-up Modal */}
      {selectedDayEvents && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-clay-ink/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border-2 border-clay-border bg-clay-surface p-6 shadow-clay-lg animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-clay-border pb-3">
              <h3 className="font-display font-bold text-clay-ink">
                Events for {selectedDayEvents.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </h3>
              <button 
                onClick={() => setSelectedDayEvents(null)}
                className="rounded-full p-1 text-clay-subtle hover:bg-clay-bg hover:text-clay-ink transition"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="mt-4 max-h-60 overflow-y-auto space-y-3 pr-1">
              {selectedDayEvents.events.map(ev => (
                <Link 
                  key={ev._id} 
                  to={`/events/${ev._id}`}
                  onClick={() => setSelectedDayEvents(null)}
                  className="block rounded-2xl border border-clay-border bg-clay-bg/40 p-3 hover:bg-clay-lilac/30 transition group"
                >
                  <p className="text-xs font-semibold uppercase tracking-wider text-accent-600">{ev.category?.name}</p>
                  <p className="font-semibold text-clay-ink group-hover:text-clay-primary transition">{ev.title}</p>
                  <p className="text-[10px] text-clay-muted mt-1">{formatDateRange(ev.startDateTime, ev.endDateTime)}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-5 lg:grid-cols-12">
        {/* Brand & Info */}
        <div className="lg:col-span-4 space-y-6">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-hero-gradient font-display text-xl font-bold text-white shadow-clay-glow">
              G
            </span>
            <div>
              <p className="font-display text-xl font-bold text-clay-ink">
                Gather<span className="text-clay-accent">Up</span>
              </p>
              <p className="text-sm text-clay-muted font-medium">Elevating Campus Life.</p>
            </div>
          </div>
          <p className="text-sm text-clay-muted leading-relaxed max-w-xs">
            GatherUp is the premier platform for university events, helping students discover, register, and engage with the campus community seamlessly.
          </p>
          <div className="flex gap-4">
            <a href="#" className="text-clay-subtle hover:text-clay-primary transition">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </a>
            <a href="#" className="text-clay-subtle hover:text-clay-primary transition">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </a>
            <a href="#" className="text-clay-subtle hover:text-clay-primary transition">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554V15.034c0-1.291-.024-2.953-1.8-2.953-1.801 0-2.077 1.408-2.077 2.859v5.512h-3.554V9h3.413v1.561h.046c.476-.9 1.636-1.85 3.366-1.85 3.599 0 4.265 2.368 4.265 5.451v6.29zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451c.98 0 1.771-.773 1.771-1.729V1.729C24 .774 23.205 0 22.225 0z"/></svg>
            </a>
            <a href="#" className="text-clay-subtle hover:text-clay-primary transition">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.332 3.608 1.308.975.975 1.245 2.242 1.308 3.608.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.062 1.366-.332 2.633-1.308 3.608-.975.975-2.242 1.245-3.608 1.308-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.366-.062-2.633-.332-3.608-1.308-.975-.975-1.245-2.242-1.308-3.608-.058-1.266-.07-1.646-.07-4.85s.012-3.584.07-4.85c.062-1.366.332-2.633 1.308-3.608.975-.975 2.242-1.245 3.608-1.308 1.266-.058 1.646-.07 4.85-.07zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.981 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
            </a>
          </div>
        </div>

        {/* Quick Links */}
        <div className="lg:col-span-2 space-y-5">
          <h4 className="font-display font-bold text-clay-ink">Quick Links</h4>
          <ul className="space-y-3 text-sm text-clay-muted">
            <li><Link to="/" className="hover:text-clay-primary transition">Home</Link></li>
            <li><Link to="/events" className="hover:text-clay-primary transition">Events</Link></li>
            <li><Link to="/lost-found" className="hover:text-clay-primary transition">Lost & Found</Link></li>
            <li><Link to="/announcements" className="hover:text-clay-primary transition">Announcements</Link></li>
            <li><Link to="/dashboard" className="hover:text-clay-primary transition">My Dashboard</Link></li>
          </ul>
        </div>

        {/* Resources */}
        <div className="lg:col-span-3 space-y-5">
          <h4 className="font-display font-bold text-clay-ink">Campus Resources</h4>
          <ul className="space-y-3 text-sm text-clay-muted">
            <li><a href="https://www.sliit.lk" target="_blank" rel="noreferrer" className="hover:text-clay-primary transition flex items-center gap-1.5">SLIIT Website <ExternalLink size={12} /></a></li>
            <li><a href="https://courseweb.sliit.lk" target="_blank" rel="noreferrer" className="hover:text-clay-primary transition flex items-center gap-1.5">Courseweb <ExternalLink size={12} /></a></li>
            <li><a href="https://sam.sliit.lk" target="_blank" rel="noreferrer" className="hover:text-clay-primary transition flex items-center gap-1.5">SAM Student Portal <ExternalLink size={12} /></a></li>
            <li><a href="#" className="hover:text-clay-primary transition">Student Union</a></li>
            <li><a href="#" className="hover:text-clay-primary transition">Campus Map</a></li>
          </ul>
        </div>

        {/* Contact & Calendar */}
        <div className="lg:col-span-3 space-y-6">
          <div className="glass-card p-4 shadow-sm border-clay-border/40">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <button 
                  onClick={prevMonth}
                  className="p-1 rounded-lg hover:bg-clay-bg text-clay-subtle hover:text-clay-primary transition"
                  title="Previous Month"
                >
                  <ChevronLeft size={16} />
                </button>
                <p className="text-xs font-bold text-clay-ink min-w-[100px] text-center">{monthLabel}</p>
                <button 
                  onClick={nextMonth}
                  className="p-1 rounded-lg hover:bg-clay-bg text-clay-subtle hover:text-clay-primary transition"
                  title="Next Month"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-[9px] font-bold text-clay-subtle uppercase text-center mb-2">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i}>{d}</div>)}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {days.map((d) => {
                const inMonth = d.getMonth() === viewMonth;
                const key = startOfDay(d).getTime();
                const dayEvents = byDay.get(key) || [];
                const upcoming = dayEvents.filter(ev => isUpcoming(ev.endDateTime));
                const past = dayEvents.filter(ev => !isUpcoming(ev.endDateTime));
                const isToday = sameDay(d, now);
                
                return (
                  <button
                    key={d.toISOString()}
                    onClick={() => handleDayClick(d, dayEvents)}
                    className={[
                      'relative flex h-7 w-7 items-center justify-center rounded-lg text-[10px] transition font-medium',
                      inMonth ? 'text-clay-ink' : 'text-clay-subtle/40',
                      isToday ? 'ring-2 ring-clay-accent/60 bg-clay-accent/5' : 'bg-clay-surface/40 hover:bg-clay-surface hover:shadow-sm',
                      dayEvents.length > 0 ? 'cursor-pointer' : 'cursor-default',
                    ].join(' ')}
                    title={dayEvents.length > 0 ? `${dayEvents.length} events` : ''}
                    disabled={dayEvents.length === 0}
                  >
                    {d.getDate()}
                    {dayEvents.length > 0 && (
                      <span className="absolute bottom-0.5 left-1/2 flex -translate-x-1/2 gap-0.5">
                        {upcoming.length > 0 && <span className="h-1 w-1 rounded-full bg-emerald-500 shadow-sm" />}
                        {past.length > 0 && <span className="h-1 w-1 rounded-full bg-slate-400" />}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex items-center justify-between text-[9px] text-clay-subtle font-semibold px-1">
              <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Upcoming</span>
              <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-slate-400" /> Past</span>
            </div>
          </div>
          
          <div className="space-y-3">
            <h4 className="font-display font-bold text-clay-ink text-sm">Contact Support</h4>
            <div className="space-y-2 text-xs text-clay-muted">
              <p className="flex items-center gap-2"><Mail size={14} className="text-clay-primary" /> support@gatherup.edu</p>
              <p className="flex items-center gap-2"><Phone size={14} className="text-clay-primary" /> +94 11 754 4801</p>
              <p className="flex items-center gap-2"><MapPin size={14} className="text-clay-primary" /> New Academic Building, SLIIT</p>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-clay-border/70 bg-clay-surface/30">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-6 text-[10px] font-medium text-clay-muted sm:px-5">
          <div className="flex flex-wrap gap-4">
            <p>© {new Date().getFullYear()} GatherUp. Built for SLIIT Students.</p>
            <div className="flex gap-4">
              <Link to="#" className="hover:text-clay-primary transition">Privacy Policy</Link>
              <Link to="#" className="hover:text-clay-primary transition">Terms of Service</Link>
              <Link to="#" className="hover:text-clay-primary transition">Cookie Policy</Link>
            </div>
          </div>
          <p className="text-clay-subtle italic">Helping you gather, grow, and go beyond.</p>
        </div>
      </div>
    </footer>
  );
}

