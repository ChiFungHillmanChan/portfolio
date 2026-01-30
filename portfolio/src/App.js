import React from 'react';
import { Route, createBrowserRouter, createRoutesFromElements, RouterProvider } from 'react-router-dom';
import AboutMe from './components/AboutMe';
import Layout from './Layout';
import MainContent from './MainContent';
import Contact from './components/Contact';
import ProjectDetail from './components/ProjectDetail';
import Projects from './components/Projects';
import MyOfferHub from './components/MyOffer/MyOfferHub';
import BuyCoffeePage from './components/MyOffer/BuyCoffeePage';
import CoachingPage from './components/MyOffer/CoachingPage';
import ServicesPage from './components/MyOffer/ServicesPage';
import ChatBotGame from './game/chatbot/ChatBotGame';
import PromptHunterGame from './game/prompt-hunter/PromptHunterGame';
import CardGame from './game/card-game/CardGame';
import CasinoGame from './game/casino-game/CasinoGame';

const GAME_SUBDOMAIN_COMPONENTS = {
  'prompt-hunter': PromptHunterGame,
  'chat-box': ChatBotGame,
  'card-game': CardGame,
  'casino-game': CasinoGame,
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

function App() {
  const SubdomainGame = getGameComponentFromHostname();

  if (SubdomainGame) {
    return <SubdomainGame />;
  }

  const router = createBrowserRouter(
    createRoutesFromElements(
      <>
        {/* Standalone experience routes */}
        <Route path="/chat-box" element={<ChatBotGame />} />
        <Route path="/prompt-hunter" element={<PromptHunterGame />} />
        <Route path="/card-game" element={<CardGame />} />
        <Route path="/casino-game" element={<CasinoGame />} />

        {/* Your existing routes with Layout */}
        <Route element={<Layout />}>
          <Route path="/" element={<MainContent />} /> 
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
      </>
    )
  );

  return (
    <RouterProvider router={router} />
  );
}

export default App;
