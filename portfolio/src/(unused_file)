import React, { useState } from 'react';
import { FaGithub, FaInstagram, FaLinkedin, FaLightbulb, FaMoon } from 'react-icons/fa';
import MainContent from './MainContent';
import { Link, useLocation } from 'react-router-dom';
import Navigation from './components/Navigation';

const PortfolioWebsite = () => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true';
  });

  const location = useLocation();

  const isActiveLink = (path) => {
    return location.pathname === path ? 'text-blue-500' : '';
  };

  // Add dark mode toggle function
  const toggleDarkMode = () => {
    setIsDarkMode(prevMode => {
      const newMode = !prevMode;
      localStorage.setItem('darkMode', newMode);
      return newMode;
    });
  };

  return (
    <div className={`min-h-screen font-['Montserrat', 'sans-serif'] ${isDarkMode ? 'dark' : ''}`}>
      <div className={`bg-khaki dark:bg-gray-800 dark:text-white transition-colors duration-300`}>
  

        {/* Main Content */}
        <main>
          <MainContent />
        </main>
       

        {/* Footer */}
        <footer className="bg-gray-800 text-white py-8 dark:bg-gray-700">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <h4 className="text-xl font-bold mb-4">About Me</h4>
              <p className="text-gray-300">
                Passionate developer creating innovative solutions for web and mobile applications.
              </p>
            </div>
            <div>
              <h4 className="text-xl font-bold mb-4">Quick Links</h4>
              <ul className="space-y-2">
                <li><a href="/about" className="hover:text-blue-400 transition-colors">About</a></li>
                <li><a href="/projects" className="hover:text-blue-400 transition-colors">Projects</a></li>
                <li><a href="/blog" className="hover:text-blue-400 transition-colors">Blog</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xl font-bold mb-4">Connect</h4>
              <div className="flex space-x-4">
                <a href="https://github.com/chifunghillmanchan" className="hover:text-blue-400 transition-colors">
                  <FaGithub size={24} />
                </a>
                <a href="https://www.instagram.com/hillmanchan709_/" className="hover:text-blue-400 transition-colors">
                  <FaInstagram size={24} />
                </a>
                <a href="https://www.linkedin.com/in/chi-fung-hillman-chan-2845a5201" className="hover:text-blue-400 transition-colors">
                  <FaLinkedin size={24} />
                </a>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-700 text-center">
            <p>&copy; {new Date().getFullYear()} Hillman Chan. All rights reserved.</p>
          </div>
        </div>
      </footer>
      </div>
    </div>
  );
};

export default PortfolioWebsite;