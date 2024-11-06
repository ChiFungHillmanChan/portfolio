import React from 'react';
import { Route, createBrowserRouter, createRoutesFromElements, RouterProvider } from 'react-router-dom';
// import PortfolioWebsite from './PortfolioWebsite';
import AboutMe from './components/AboutMe';
import Layout from './Layout';
import MainContent from './MainContent';
// import Blogs from './components/Blogs';
// import Projects from './components/Projects';
// import Contact from './components/Contact';

function App() {
  const router = createBrowserRouter(
    createRoutesFromElements(
      <Route element={<Layout />}>
        <Route path="/portfolio"element={<MainContent />} /> {/* Home page */}
        <Route path="/about" element={<AboutMe />} /> {/* About page */}
        {/* Add other routes as needed */}
      </Route>
    )
  )

  return (
    <RouterProvider router={router} />
  );
}

export default App;