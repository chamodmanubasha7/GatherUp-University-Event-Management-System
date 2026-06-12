import { Navigate } from 'react-router-dom';

/** Legacy route: claims flow removed — moderation lives under /admin/lost-found/moderation */
export default function AdminLostFoundPage() {
  return <Navigate to="/admin/lost-found/moderation" replace />;
}
