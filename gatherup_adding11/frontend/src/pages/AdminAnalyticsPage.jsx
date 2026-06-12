import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import toast from 'react-hot-toast';
import api from '../services/api.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

export default function AdminAnalyticsPage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { data: d } = await api.get('/analytics');
        setData(d);
      } catch (e) {
        toast.error(e.message);
      }
    })();
  }, []);

  if (!data) {
    return <div className="py-20 text-center text-clay-muted">Loading analytics…</div>;
  }

  const topLabels = data.topEventsByRegistrations?.map((e) => e.title?.slice(0, 18) || 'Event') || [];
  const topCounts = data.topEventsByRegistrations?.map((e) => e.registrations) || [];

  const lostLabels = data.lostByStatus?.map((x) => x._id) || [];
  const lostCounts = data.lostByStatus?.map((x) => x.count) || [];
  const foundLabels = data.foundByStatus?.map((x) => x._id) || [];
  const foundCounts = data.foundByStatus?.map((x) => x.count) || [];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold text-clay-ink">Analytics</h1>
        <Link to="/admin" className="btn-secondary">
          Admin
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          ['Events', data.totalEvents],
          ['Registrations', data.totalRegistrations],
          ['Tickets used', data.totalTicketsUsed],
          ['Avg rating', data.averageRating],
        ].map(([label, val]) => (
          <div key={label} className="glass-card p-4">
            <p className="text-xs uppercase text-clay-subtle">{label}</p>
            <p className="mt-1 font-display text-2xl font-bold text-clay-ink">{val}</p>
          </div>
        ))}
      </div>

      <p className="text-sm text-clay-muted">
        Global attendance rate:{' '}
        <span className="font-semibold text-accent-600">{data.globalAttendanceRatePercent}%</span> · Feedback
        count: {data.feedbackCount}
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass-card p-4">
          <h2 className="mb-4 font-display text-lg font-semibold text-clay-ink">Top events (registrations)</h2>
          {topLabels.length > 0 ? (
            <Bar
              data={{
                labels: topLabels,
                datasets: [
                  {
                    label: 'Registrations',
                    data: topCounts,
                    backgroundColor: 'rgba(124, 58, 237, 0.75)',
                    borderRadius: 8,
                  },
                ],
              }}
              options={{
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                  x: { ticks: { color: '#6b7280' }, grid: { color: 'rgba(232,228,220,0.9)' } },
                  y: { ticks: { color: '#6b7280' }, grid: { color: 'rgba(232,228,220,0.9)' } },
                },
              }}
            />
          ) : (
            <p className="text-clay-muted">No registration data yet.</p>
          )}
        </div>
        <div className="glass-card p-4">
          <h2 className="mb-4 font-display text-lg font-semibold text-clay-ink">Lost &amp; Found mix</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <p className="mb-2 text-center text-xs text-clay-subtle">Lost by status</p>
              {lostLabels.length > 0 ? (
                <Doughnut
                  data={{
                    labels: lostLabels,
                    datasets: [{ data: lostCounts, backgroundColor: ['#7c3aed', '#f59e0b', '#10b981', '#9ca3af'] }],
                  }}
                  options={{ plugins: { legend: { labels: { color: '#4b5563' } } } }}
                />
              ) : (
                <p className="text-center text-clay-muted">No data</p>
              )}
            </div>
            <div>
              <p className="mb-2 text-center text-xs text-clay-subtle">Found by status</p>
              {foundLabels.length > 0 ? (
                <Doughnut
                  data={{
                    labels: foundLabels,
                    datasets: [{ data: foundCounts, backgroundColor: ['#14b8a6', '#a78bfa', '#f472b6', '#38bdf8'] }],
                  }}
                  options={{ plugins: { legend: { labels: { color: '#4b5563' } } } }}
                />
              ) : (
                <p className="text-center text-clay-muted">No data</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
