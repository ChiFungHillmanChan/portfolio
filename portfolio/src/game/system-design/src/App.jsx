import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
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

// Stripe redirects with ?session_id= before the hash, so HashRouter's
// useSearchParams won't see it. Handle it at the top level.
function StripeRedirectHandler() {
  const { isPremium, activatePremium } = usePremium();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    if (sessionId && !isPremium) {
      activatePremium(sessionId);
      // Clean the URL
      window.history.replaceState(null, '', window.location.pathname + window.location.hash);
    }
  }, [isPremium, activatePremium]);

  return null;
}

export default function App() {
  return (
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
          </Route>
        </Routes>
      </ProgressProvider>
    </PremiumProvider>
  );
}
