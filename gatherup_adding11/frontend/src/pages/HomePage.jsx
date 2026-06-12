import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="space-y-12 sm:space-y-16">
      <section className="relative overflow-hidden rounded-3xl bg-hero-gradient p-8 shadow-clay-glow sm:p-12 md:p-14">
        <div className="relative z-10 max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/85">
            University Event Management
          </p>
          <h1 className="mt-4 font-display text-4xl font-extrabold leading-tight text-white md:text-5xl">
            Bring your campus together with{' '}
            <span className="text-clay-mint drop-shadow-sm">GatherUp</span>
          </h1>
          <p className="mt-4 text-lg text-white/90">
            Discover events, grab QR tickets in seconds, and reconnect people with Lost &amp; Found — all
            in one friendly place.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/events"
              className="inline-flex items-center justify-center rounded-full border-2 border-white/30 bg-white px-6 py-2.5 text-sm font-semibold text-clay-primary shadow-clay transition hover:-translate-y-0.5 hover:bg-clay-bg hover:shadow-clay-lg"
            >
              Browse events
            </Link>
            <Link
              to="/lost-found"
              className="inline-flex items-center justify-center rounded-full border-2 border-white/50 bg-white/15 px-6 py-2.5 text-sm font-semibold text-white shadow-sm backdrop-blur-sm transition hover:-translate-y-0.5 hover:bg-white/25"
            >
              Lost &amp; Found
            </Link>
            {!user && (
              <Link
                to="/register"
                className="inline-flex items-center justify-center rounded-full border-2 border-white/50 bg-white/15 px-6 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:-translate-y-0.5 hover:bg-white/25"
              >
                Create account
              </Link>
            )}
          </div>
        </div>
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/20 blur-3xl sm:h-64 sm:w-64" />
        <div className="pointer-events-none absolute -bottom-24 right-8 h-72 w-72 rounded-full bg-clay-accent/25 blur-3xl" />
      </section>

      <section className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 md:gap-6">
        {[
          {
            title: 'Smart QR ticketing',
            desc: 'Tamper-resistant QR codes, live admin scanning, and attendance analytics.',
            hue: 'from-clay-lilac/90 to-clay-surface',
          },
          {
            title: 'Lost & Found suite',
            desc: 'Report, search, claim, and verify with full admin workflows and notifications.',
            hue: 'from-clay-mint/80 to-clay-surface',
          },
          {
            title: 'Venue-safe registration',
            desc: 'Capacity limits, overlapping event detection, and double-booking prevention.',
            hue: 'from-clay-peach/90 to-clay-surface',
          },
        ].map((card) => (
          <div
            key={card.title}
            className={`glass-card-interactive bg-gradient-to-br ${card.hue} border-clay-border/50 p-6`}
          >
            <h3 className="font-display text-lg font-semibold text-clay-ink">{card.title}</h3>
            <p className="mt-2 text-sm text-clay-muted">{card.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
