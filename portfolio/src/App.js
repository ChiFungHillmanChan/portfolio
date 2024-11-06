import React from 'react';
import { Route, createBrowserRouter, createRoutesFromElements, RouterProvider } from 'react-router-dom';
// import PortfolioWebsite from './PortfolioWebsite';
import AboutMe from './components/AboutMe';
import Layout from './Layout';
import MainContent from './MainContent';
import Contact from './components/Contact';
// import Blogs from './components/Blogs';
// import Projects from './components/Projects';

function App() {
  const router = createBrowserRouter(
    createRoutesFromElements(
      <Route element={<Layout />}>
        <Route path="/portfolio"element={<MainContent />} /> {/* Home page */}
        <Route path="/about" element={<AboutMe />} /> {/* About page */}
        <Route path="/contact" element={<Contact />} /> {/* About page */}
        {/* <Route path="/blogs" element={<Blogs />} /> About page */}
      </Route>
    )
  )

  return (
    <RouterProvider router={router} />
  );
}

export default App;