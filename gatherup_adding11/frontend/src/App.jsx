import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import HomePage from './pages/HomePage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import OtpVerificationPage from './pages/OtpVerificationPage.jsx';
import EventsPage from './pages/EventsPage.jsx';
import EventDetailPage from './pages/EventDetailPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import AdminOverviewPage from './pages/AdminOverviewPage.jsx';
import AdminEventsPage from './pages/AdminEventsPage.jsx';
import AdminEventParticipantsPage from './pages/AdminEventParticipantsPage.jsx';
import AdminMetaPage from './pages/AdminMetaPage.jsx';
import LostFoundPage from './pages/LostFoundPage.jsx';
import ReportLostPage from './pages/ReportLostPage.jsx';
import ReportFoundPage from './pages/ReportFoundPage.jsx';
import FoundDetailPage from './pages/FoundDetailPage.jsx';
import LostDetailPage from './pages/LostDetailPage.jsx';
import AdminLostFoundPage from './pages/AdminLostFoundPage.jsx';
import AdminLostFoundModerationPage from './pages/AdminLostFoundModerationPage.jsx';
import AdminHiddenLostFoundPage from './pages/AdminHiddenLostFoundPage.jsx';
import MessagesPage from './pages/MessagesPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import ScannerPage from './pages/ScannerPage.jsx';
import AdminAnalyticsPage from './pages/AdminAnalyticsPage.jsx';
import AdminTicketUsagePage from './pages/AdminTicketUsagePage.jsx';
import PaymentsDashboardPage from './pages/PaymentsDashboardPage.jsx';
import MakePaymentPage from './pages/MakePaymentPage.jsx';
import PaymentHistoryPage from './pages/PaymentHistoryPage.jsx';
import PaymentFeedbackPage from './pages/PaymentFeedbackPage.jsx';
import AdminPaymentsPage from './pages/AdminPaymentsPage.jsx';
import AdminRecordPaymentPage from './pages/AdminRecordPaymentPage.jsx';
import AdminEditPaymentPage from './pages/AdminEditPaymentPage.jsx';
import AdminPaymentFeedbackPage from './pages/AdminPaymentFeedbackPage.jsx';
import AnnouncementsPage from './pages/AnnouncementsPage.jsx';
import AdminAnnouncementsPage from './pages/AdminAnnouncementsPage.jsx';

function Protected({ children, admin }) {
  const { user, loading, isAdmin } = useAuth();
  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-24 text-sm text-clay-muted">
        Loading…
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (admin && !isAdmin) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="verify-otp" element={<OtpVerificationPage />} />
        <Route path="events" element={<EventsPage />} />
        <Route path="events/:id" element={<EventDetailPage />} />
        <Route path="lost-found" element={<LostFoundPage />} />
        <Route
          path="lost-found/report-lost"
          element={
            <Protected>
              <ReportLostPage />
            </Protected>
          }
        />
        <Route
          path="lost-found/report-found"
          element={
            <Protected>
              <ReportFoundPage />
            </Protected>
          }
        />
        <Route path="lost-found/lost/:id" element={<LostDetailPage />} />
        <Route path="lost-found/found/:id" element={<FoundDetailPage />} />
        <Route
          path="dashboard"
          element={
            <Protected>
              <DashboardPage />
            </Protected>
          }
        />
        <Route
          path="payments"
          element={
            <Protected>
              <Navigate to="/payments/history" replace />
            </Protected>
          }
        />
        <Route
          path="payments/new"
          element={
            <Protected>
              <MakePaymentPage />
            </Protected>
          }
        />
        <Route
          path="payments/history"
          element={
            <Protected>
              <PaymentHistoryPage />
            </Protected>
          }
        />
        <Route
          path="payments/feedback"
          element={
            <Protected>
              <PaymentFeedbackPage />
            </Protected>
          }
        />
        <Route
          path="payments/profile"
          element={
            <Protected>
              <ProfilePage />
            </Protected>
          }
        />
        <Route
          path="messages"
          element={
            <Protected>
              <MessagesPage />
            </Protected>
          }
        />
        <Route
          path="dashboard/messages"
          element={
            <Protected>
              <Navigate to="/messages" replace />
            </Protected>
          }
        />
        <Route
          path="dashboard/profile"
          element={
            <Protected>
              <ProfilePage />
            </Protected>
          }
        />
        <Route
          path="admin"
          element={
            <Protected admin>
              <AdminOverviewPage />
            </Protected>
          }
        />
        <Route
          path="admin/events"
          element={
            <Protected admin>
              <AdminEventsPage />
            </Protected>
          }
        />
        <Route
          path="admin/event-participants"
          element={
            <Protected admin>
              <AdminEventParticipantsPage />
            </Protected>
          }
        />
        <Route
          path="admin/meta"
          element={
            <Protected admin>
              <AdminMetaPage />
            </Protected>
          }
        />
        <Route
          path="admin/lost-found"
          element={
            <Protected admin>
              <AdminLostFoundPage />
            </Protected>
          }
        />
        <Route
          path="admin/lost-found/moderation"
          element={
            <Protected admin>
              <AdminLostFoundModerationPage />
            </Protected>
          }
        />
        <Route
          path="admin/lost-found/hidden"
          element={
            <Protected admin>
              <AdminHiddenLostFoundPage />
            </Protected>
          }
        />
        <Route
          path="admin/scanner"
          element={
            <Protected admin>
              <ScannerPage />
            </Protected>
          }
        />
        <Route
          path="admin/analytics"
          element={
            <Protected admin>
              <AdminAnalyticsPage />
            </Protected>
          }
        />
        <Route
          path="admin/payments"
          element={
            <Protected admin>
              <AdminPaymentsPage />
            </Protected>
          }
        />
        <Route
          path="admin/payments/record"
          element={
            <Protected admin>
              <AdminRecordPaymentPage />
            </Protected>
          }
        />
        <Route
          path="admin/payments/:id/edit"
          element={
            <Protected admin>
              <AdminEditPaymentPage />
            </Protected>
          }
        />
        <Route
          path="admin/payments/feedback"
          element={
            <Protected admin>
              <AdminPaymentFeedbackPage />
            </Protected>
          }
        />
        <Route
          path="admin/ticket-logs"
          element={
            <Protected admin>
              <AdminTicketUsagePage />
            </Protected>
          }
        />
        <Route
          path="announcements"
          element={
            <Protected>
              <AnnouncementsPage />
            </Protected>
          }
        />
        <Route
          path="admin/announcements"
          element={
            <Protected admin>
              <AdminAnnouncementsPage />
            </Protected>
          }
        />
      </Route>
    </Routes>
  );
}
