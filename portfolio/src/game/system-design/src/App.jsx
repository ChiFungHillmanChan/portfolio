import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PremiumProvider, usePremium } from './context/PremiumContext';
import { ProgressProvider } from './context/ProgressContext';
import Layout from './components/Layout';
import Welcome from './pages/Welcome';
import Premium from './pages/Premium';
import TopicPage from './pages/TopicPage';
import Roadmap from './pages/Roadmap';
import AIPlanner from './pages/AIPlanner';
import Coaching from './pages/Coaching';
import Projects from './pages/Projects';
import Settings from './pages/Settings';
import Changelog from './pages/Changelog';
import { useAuth } from './context/AuthContext';

// Stripe returns session_id in query string before hash.
// We never trust query params directly for unlock:
// this only calls backend confirmation and refreshes Firestore-backed state.
function StripeRedirectHandler() {
  const { user } = useAuth();
  const { confirmStripeSession } = usePremium();

  useEffect(() => {
    const sessionId = new URLSearchParams(window.location.search).get('session_id');
    if (!sessionId || !user) return;
    confirmStripeSession(sessionId)
      .then(() => {
        const params = new URLSearchParams(window.location.search);
        params.delete('session_id');
        const nextQuery = params.toString();
        const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}${window.location.hash}`;
        window.history.replaceState(null, '', nextUrl);
      })
      .catch(() => {});
  }, [user, confirmStripeSession]);

  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <PremiumProvider>
        <ProgressProvider>
          <StripeRedirectHandler />
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Welcome />} />
              <Route path="topic/:slug" element={<TopicPage />} />
              <Route path="roadmap" element={<Roadmap />} />
              <Route path="plan" element={<AIPlanner />} />
              <Route path="coaching" element={<Coaching />} />
              <Route path="coaching/:slug" element={<Coaching />} />
              <Route path="projects" element={<Projects />} />
              <Route path="premium" element={<Premium />} />
              <Route path="settings" element={<Settings />} />
              <Route path="changelog" element={<Changelog />} />
            </Route>
          </Routes>
        </ProgressProvider>
      </PremiumProvider>
    </AuthProvider>
  );
}
