import React, { Suspense, lazy, useEffect, useState } from 'react';
import { Route, createBrowserRouter, createRoutesFromElements, RouterProvider } from 'react-router-dom';
import BugSpark from '@bugspark/widget';
import RoomSession from './room/RoomSession';
const AboutMe = lazy(() => import('./components/AboutMe'));
const Layout = lazy(() => import('./Layout'));
const MainContent = lazy(() => import('./MainContent'));
const Contact = lazy(() => import('./components/Contact'));
const ProjectDetail = lazy(() => import('./components/ProjectDetail'));
const Projects = lazy(() => import('./components/Projects'));
const MyOfferHub = lazy(() => import('./components/MyOffer/MyOfferHub'));
const BuyCoffeePage = lazy(() => import('./components/MyOffer/BuyCoffeePage'));
const CoachingPage = lazy(() => import('./components/MyOffer/CoachingPage'));
const ServicesPage = lazy(() => import('./components/MyOffer/ServicesPage'));
const ChatBotGame = lazy(() => import('./game/chatbot/ChatBotGame'));
const PromptHunterGame = lazy(() => import('./game/prompt-hunter/PromptHunterGame'));
const CardGame = lazy(() => import('./game/card-game/CardGame'));
const CasinoGame = lazy(() => import('./game/casino-game/CasinoGame'));
const SystemDesignGame = lazy(() => import('./game/system-design/SystemDesignGame'));
const Connect4Game = lazy(() => import('./game/connect4/Connect4Game'));
const MathMemoryGame = lazy(() => import('./game/math-memory/MathMemoryGame'));
const CardDrawerGame = lazy(() => import('./game/card-drawer/CardDrawerGame'));
const DaSiuYanGame = lazy(() => import('./game/da-siu-yan/DaSiuYanGame'));
const SiuHeiBouGame = lazy(() => import('./game/siu-hei-bou/SiuHeiBouGame'));
const RubiksCubePractice = lazy(() => import('./game/rubiks-cube-practice/RubiksCubePractice'));

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
      <Route element={<RoomSession />}>
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
