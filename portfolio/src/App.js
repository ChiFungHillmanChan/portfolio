import React, { Suspense, useEffect, useState } from 'react';
import { Route, createBrowserRouter, createRoutesFromElements, RouterProvider } from 'react-router-dom';
import BugSpark from '@bugspark/widget';
import RoomSession from './room/RoomSession';
import lazyWithReload from './lazyWithReload';
const AboutMe = lazyWithReload(() => import('./components/AboutMe'));
const Layout = lazyWithReload(() => import('./Layout'));
const MainContent = lazyWithReload(() => import('./MainContent'));
const Contact = lazyWithReload(() => import('./components/Contact'));
const ProjectDetail = lazyWithReload(() => import('./components/ProjectDetail'));
const Projects = lazyWithReload(() => import('./components/Projects'));
const MyOfferHub = lazyWithReload(() => import('./components/MyOffer/MyOfferHub'));
const BuyCoffeePage = lazyWithReload(() => import('./components/MyOffer/BuyCoffeePage'));
const CoachingPage = lazyWithReload(() => import('./components/MyOffer/CoachingPage'));
const ServicesPage = lazyWithReload(() => import('./components/MyOffer/ServicesPage'));
const ChatBotGame = lazyWithReload(() => import('./game/chatbot/ChatBotGame'));
const PromptHunterGame = lazyWithReload(() => import('./game/prompt-hunter/PromptHunterGame'));
const CardGame = lazyWithReload(() => import('./game/card-game/CardGame'));
const CasinoGame = lazyWithReload(() => import('./game/casino-game/CasinoGame'));
const SystemDesignGame = lazyWithReload(() => import('./game/system-design/SystemDesignGame'));
const Connect4Game = lazyWithReload(() => import('./game/connect4/Connect4Game'));
const MathMemoryGame = lazyWithReload(() => import('./game/math-memory/MathMemoryGame'));
const CardDrawerGame = lazyWithReload(() => import('./game/card-drawer/CardDrawerGame'));
const DaSiuYanGame = lazyWithReload(() => import('./game/da-siu-yan/DaSiuYanGame'));
const SiuHeiBouGame = lazyWithReload(() => import('./game/siu-hei-bou/SiuHeiBouGame'));
const RubiksCubePractice = lazyWithReload(() => import('./game/rubiks-cube-practice/RubiksCubePractice'));

const GAME_SUBDOMAIN_COMPONENTS = {
  'prompt-hunter': PromptHunterGame,
  'chat-box': ChatBotGame,
  'card-game': CardGame,
  'casino-game': CasinoGame,
  'system-design': SystemDesignGame,
  'connect4': Connect4Game,
  'math-memory': MathMemoryGame,
  'card-drawer': CardDrawerGame,
  'da-siu-yan': DaSiuYanGame,
  'siu-hei-bou': SiuHeiBouGame,
  'rubiks-cube-practice': RubiksCubePractice,
};

const getGameComponentFromHostname = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  const hostname = window.location.hostname?.toLowerCase() || '';
  const firstLabel = hostname.split('.')[0];

  const GameComponent = GAME_SUBDOMAIN_COMPONENTS[firstLabel];
  return GameComponent || null;
};

function RouteLoading() {
  return <main style={{ padding: '3rem', fontFamily: 'system-ui' }}><p role="status">Opening page…</p><a href="/room">Back to room</a></main>;
}

// Shown only when a page still cannot load after the automatic reload in lazyWithReload.
function RouteError() {
  return (
    <main style={{ padding: '3rem', fontFamily: 'system-ui' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 600 }}>This page did not load</h1>
      <p role="alert" style={{ margin: '1rem 0' }}>The site may have just been updated, or the connection dropped.</p>
      <button type="button" onClick={() => window.location.reload()} style={{ textDecoration: 'underline', marginRight: '1.5rem' }}>
        Reload the page
      </button>
      <a href="/room">Back to room</a>
    </main>
  );
}

function App() {
  useEffect(() => {
    if (process.env.REACT_APP_BUGSPARK_ENABLED === 'true' && process.env.NODE_ENV !== 'production') {
      BugSpark.init({
        projectKey: process.env.REACT_APP_BUGSPARK_PROJECT_KEY,
        endpoint: process.env.REACT_APP_BUGSPARK_ENDPOINT,
      });
    }
  }, []);

  const SubdomainGame = getGameComponentFromHostname();

  return <Suspense fallback={<RouteLoading />}>
    {SubdomainGame ? <SubdomainGame /> : <PortfolioRouter />}
  </Suspense>;
}

function PortfolioRouter() {
  const [router] = useState(() => createBrowserRouter(
    createRoutesFromElements(
      <Route element={<RoomSession />} errorElement={<RouteError />}>
        <Route path="/room" element={null} />
        {/* Standalone experience routes */}
        <Route path="/chat-box" element={<ChatBotGame />} />
        <Route path="/prompt-hunter" element={<PromptHunterGame />} />
        <Route path="/card-game" element={<CardGame />} />
        <Route path="/casino-game" element={<CasinoGame />} />
        <Route path="/system-design" element={<SystemDesignGame />} />
        <Route path="/math-memory" element={<MathMemoryGame />} />
        <Route path="/connect4" element={<Connect4Game />} />
        <Route path="/card-drawer" element={<CardDrawerGame />} />
        <Route path="/da-siu-yan" element={<DaSiuYanGame />} />
        <Route path="/siu-hei-bou/*" element={<SiuHeiBouGame />} />
        <Route path="/rubiks-cube-practice" element={<RubiksCubePractice />} />

        {/* Your existing routes with Layout */}
        <Route element={<Layout />}>
          <Route path="/" element={<MainContent />} />
          <Route path="/portfolio" element={<MainContent />} />
          <Route path="/about" element={<AboutMe />} /> 
          <Route path="/contact" element={<Contact />} /> 
          <Route path="/projects" element={<Projects />} /> 
          <Route path="/project/:id" element={<ProjectDetail />} />
          
          {/* My Offer Routes */}
          <Route path="/my-offer" element={<MyOfferHub />} />
          <Route path="/my-offer/coffee" element={<BuyCoffeePage />} />
          <Route path="/my-offer/coaching" element={<CoachingPage />} />
          <Route path="/my-offer/services" element={<ServicesPage />} />
        </Route>
      </Route>
    )
  ));

  return (
    <Suspense fallback={<RouteLoading />}><RouterProvider router={router} /></Suspense>
  );
}

export default App;
