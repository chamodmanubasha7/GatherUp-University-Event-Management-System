import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';
import Footer from './Footer.jsx';
import { publicFileSrc } from '../utils/mediaUrl.js';

const navClass = ({ isActive }) =>
  `rounded-full px-3 py-2 text-sm font-medium transition duration-200 ${
    isActive
      ? 'bg-clay-lilac text-clay-primary shadow-sm'
      : 'text-clay-muted hover:bg-clay-peach/40 hover:text-clay-ink'
  }`;

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();
  const [unreadMsgs, setUnreadMsgs] = useState(0);
  const [notifs, setNotifs] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);

  useEffect(() => {
    if (!user) {
      setUnreadMsgs(0);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('/lost-found/messages/unread-count');
        if (!cancelled) setUnreadMsgs(data.count ?? 0);
      } catch {
        if (!cancelled) setUnreadMsgs(0);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, location.pathname]);

  useEffect(() => {
    if (!user) {
      setNotifs([]);
      setNotifOpen(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('/notifications');
        if (!cancelled) setNotifs(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setNotifs([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, location.pathname]);

  const unreadNotifs = useMemo(
    () => notifs.reduce((acc, n) => acc + (n?.read ? 0 : 1), 0),
    [notifs]
  );

  useEffect(() => {
    function onDown(e) {
      if (!notifOpen) return;
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    }
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [notifOpen]);

  async function markAllNotificationsRead() {
    if (!user || unreadNotifs <= 0) return;
    try {
      await api.post('/notifications/read-all');
      setNotifs((list) => list.map((x) => ({ ...x, read: true })));
    } catch {
      /* ignore */
    }
  }

  function MsgBadge() {
    if (unreadMsgs <= 0) return null;
    return (
      <span className="ml-1.5 inline-flex min-w-[1.25rem] justify-center rounded-full bg-clay-accent px-1 text-[10px] font-bold text-white shadow-sm">
        {unreadMsgs > 99 ? '99+' : unreadMsgs}
      </span>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 rounded-b-3xl bg-nav-gradient shadow-clay">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-5">
          <Link to="/" className="group flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-hero-gradient font-display text-lg font-bold text-white shadow-clay-glow transition group-hover:-translate-y-0.5">
              G
            </span>
            <span className="font-display text-xl font-bold tracking-tight text-clay-ink">
              Gather<span className="text-clay-accent">Up</span>
            </span>
          </Link>
          <nav className="hidden flex-wrap items-center gap-1 md:flex">
            <NavLink to="/events" className={navClass}>
              Events
            </NavLink>
            <NavLink to="/lost-found" className={navClass}>
              Lost &amp; Found
            </NavLink>
            <NavLink to="/announcements" className={navClass}>
              News
            </NavLink>
            {user && (
              <>
                <NavLink to="/dashboard" className={navClass}>
                  Dashboard
                </NavLink>
                <NavLink to="/messages" className={navClass}>
                  Messages
                  <MsgBadge />
                </NavLink>
                {isAdmin && (
                  <>
                    <NavLink to="/admin" className={navClass}>
                      Admin
                    </NavLink>
                    <NavLink to="/admin/payments" className={navClass}>
                      Admin Payments
                    </NavLink>
                    <NavLink to="/admin/scanner" className={navClass}>
                      QR Scanner
                    </NavLink>
                    <NavLink to="/admin/announcements" className={navClass}>
                      Admin News
                    </NavLink>
                  </>
                )}
              </>
            )}
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <div className="relative" ref={notifRef}>
                  <button
                    type="button"
                    className="relative inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-clay-border/70 bg-clay-surface/70 text-clay-ink transition hover:bg-clay-surface"
                    aria-label="Notifications"
                    title="Notifications"
                    onClick={async () => {
                      const next = !notifOpen;
                      setNotifOpen(next);
                      if (next) await markAllNotificationsRead();
                    }}
                  >
                    <Bell className="h-5 w-5" strokeWidth={2} />
                    {unreadNotifs > 0 && (
                      <span className="absolute -right-1 -top-1 inline-flex min-w-[1.25rem] justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                        {unreadNotifs > 99 ? '99+' : unreadNotifs}
                      </span>
                    )}
                  </button>

                  {notifOpen && (
                    <div className="absolute right-0 mt-2 w-[22rem] max-w-[90vw] overflow-hidden rounded-2xl border border-clay-border/70 bg-white shadow-xl">
                      <div className="flex items-center justify-between gap-2 border-b border-clay-border/70 px-4 py-3">
                        <p className="text-sm font-semibold text-clay-ink">Notifications</p>
                        <Link
                          to="/dashboard#notifications"
                          className="text-xs font-medium text-clay-primary hover:underline"
                          onClick={() => setNotifOpen(false)}
                        >
                          View all →
                        </Link>
                      </div>
                      <div className="max-h-80 overflow-auto">
                        {notifs.length === 0 ? (
                          <p className="px-4 py-4 text-sm text-clay-muted">No notifications yet.</p>
                        ) : (
                          <ul className="divide-y divide-clay-border/60">
                            {notifs.slice(0, 6).map((n) => (
                              <li key={n._id} className="px-4 py-3">
                                <p className="text-sm text-clay-ink">
                                  <span className="font-semibold">{n.title}</span>
                                  {n.message ? <span className="text-clay-muted"> — {n.message}</span> : null}
                                </p>
                                {n.link && (
                                  <Link
                                    to={n.link}
                                    className="mt-1 inline-block text-xs font-medium text-clay-primary hover:underline"
                                    onClick={() => setNotifOpen(false)}
                                  >
                                    Open →
                                  </Link>
                                )}
                                {!n.link && (
                                  <p className="mt-1 text-xs text-clay-subtle">
                                    {new Date(n.createdAt).toLocaleString()}
                                  </p>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <Link
                  to="/dashboard/profile"
                  className="relative hidden h-10 w-10 overflow-hidden rounded-2xl border border-clay-border/70 bg-clay-surface/70 transition hover:bg-clay-surface sm:inline-flex"
                  title="Profile"
                  aria-label="Profile"
                >
                  {user.avatar ? (
                    <img src={publicFileSrc(user.avatar)} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center font-display text-sm font-bold text-clay-ink">
                      {(user.name || 'U').slice(0, 1).toUpperCase()}
                    </span>
                  )}
                </Link>
                <button type="button" className="btn-secondary !px-4 !py-2" onClick={logout}>
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-secondary !px-4 !py-2">
                  Log in
                </Link>
                <Link to="/register" className="btn-primary !px-4 !py-2">
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-1 border-t border-clay-border/60 px-4 py-2 sm:px-5 md:hidden">
          <NavLink to="/events" className={navClass}>
            Events
          </NavLink>
          <NavLink to="/lost-found" className={navClass}>
            L&amp;F
          </NavLink>
          <NavLink to="/announcements" className={navClass}>
            News
          </NavLink>
          {user && (
            <>
              <NavLink to="/dashboard" className={navClass}>
                Home
              </NavLink>
              <NavLink to="/messages" className={navClass}>
                Msg
                <MsgBadge />
              </NavLink>
              {isAdmin && (
                <>
                  <NavLink to="/admin/payments" className={navClass}>
                    Admin Pay
                  </NavLink>
                  <NavLink to="/admin/scanner" className={navClass}>
                    Scan
                  </NavLink>
                </>
              )}
            </>
          )}
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-8 sm:px-5">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
