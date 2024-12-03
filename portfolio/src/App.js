import React from 'react';
import { Route, createBrowserRouter, createRoutesFromElements, RouterProvider } from 'react-router-dom';
// import PortfolioWebsite from './PortfolioWebsite';
import AboutMe from './components/AboutMe';
import Layout from './Layout';
import MainContent from './MainContent';
import Contact from './components/Contact';
import ProjectDetail from './components/ProjectDetail';
// import Blogs from './components/Blogs';
import Projects from './components/Projects';

function App() {
  const router = createBrowserRouter(
    createRoutesFromElements(
      <Route element={<Layout />}>
        <Route path="/"element={<MainContent />} /> 
        <Route path="/about" element={<AboutMe />} /> 
        <Route path="/contact" element={<Contact />} /> 
        <Route path="/projects" element={<Projects />} /> 
        <Route path="/project/:id" element={<ProjectDetail />} />
      </Route>
    )
  )

  return (
    <RouterProvider router={router} />
  );
}

export default App;