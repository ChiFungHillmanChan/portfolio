// Layout.js
import React, { useState } from 'react';
import { FaGithub, FaInstagram, FaLinkedin, FaLightbulb, FaMoon } from 'react-icons/fa';
// import MainContent from './MainContent';
import {Link, useLocation, Outlet } from 'react-router-dom';


const Layout = () => {
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
      <div className="bg-khaki dark:bg-gray-800 dark:text-white transition-colors duration-300">
        
        {/* Navigation/Header */}
        <header className="bg-white dark:bg-gray-700 shadow-md">
            <nav className="container mx-auto flex items-center justify-between py-4 px-4">
                <div className="font-bold text-2xl">
                    <Link to="/portfolio" className="hover:text-blue-500 transition-colors duration-300">
                    Hillman Chan
                    </Link>
                </div>
                <ul className="hidden md:flex items-center space-x-6">
                    <li>
                        <Link 
                            to="/about"
                            className={`hover:text-blue-500 transition-colors duration-300 ${isActiveLink('/about')}`}
                        >
                            About
                        </Link>
                    </li>
                    {/* <li>
                        <Link 
                            to="/blogs"
                            className={`hover:text-blue-500 transition-colors duration-300 ${isActiveLink('/blogs')}`}
                        >
                            Blogs
                        </Link>
                    </li> */}
                    <li>
                        <Link 
                            to="/projects"
                            className={`hover:text-blue-500 transition-colors duration-300 ${isActiveLink('/projects')}`}
                        >
                            Projects
                        </Link>
                    </li>
                    <li>
                        <Link 
                            to="/contact"
                            className={`hover:text-blue-500 transition-colors duration-300 ${isActiveLink('/contact')}`}
                        >
                            Contact
                        </Link>
                    </li>
                    <li>
                        <a 
                            href="https://github.com/chifunghillmanchan" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="hover:opacity-80 transition-opacity"
                        >
                            <FaGithub size={24} className="dark:text-white transition-colors duration-300" />
                        </a>
                    </li>
                    <li>
                        <a 
                            href="https://www.instagram.com/hillmanchan709_/" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="hover:opacity-80 transition-opacity"
                        >
                            <FaInstagram size={24} className="dark:text-white transition-colors duration-300" />
                        </a>
                    </li>
                    <li>
                        <a 
                            href="https://www.linkedin.com/in/chi-fung-hillman-chan-2845a5201" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="hover:opacity-80 transition-opacity"
                        >
                            <FaLinkedin size={24} className="dark:text-white transition-colors duration-300" />
                        </a>
                    </li>
                    <li>
                        <button 
                            onClick={toggleDarkMode}
                            className="focus:outline-none hover:opacity-80 transition-opacity"
                            aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                        >
                            {isDarkMode ? (
                            <FaLightbulb size={24} className="dark:text-white transition-colors duration-300" />
                            ) : (
                            <FaMoon size={24} className="dark:text-white transition-colors duration-300" />
                            )}
                        </button>
                    </li>
                </ul>
            </nav>
        </header>

        {/* Main Content where Outlet will render the route-specific component */}
        <main className="container mx-auto py-8">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="bg-gray-800 text-white py-8 dark:bg-gray-700">
            <div className="container mx-auto px-4">
                <div className="grid md:grid-cols-3 gap-8">
                    <div>
                        <h4 className="text-xl font-bold mb-4">About Me</h4>
                        <p className="text-gray-300">
                            Passionate developer creating innovative solutions for web applications and program.
                        </p>
                    </div>
                    <div>
                        <h4 className="text-xl font-bold mb-4">Quick Links</h4>
                        <ul className="space-y-2">
                            <li>
                                <Link 
                                    to="/about"
                                    className={`hover:text-blue-400 transition-colors`}
                                >
                                    About
                                </Link>
                            </li>
                            <li>
                                <Link 
                                    to="/project"
                                    className={`hover:text-blue-400 transition-colors`}
                                >
                                    Project
                                </Link>
                            </li>
                            <li>
                                <Link 
                                    to="/contact"
                                    className={`hover:text-blue-400 transition-colors`}
                                >
                                    Contact
                                </Link>
                            </li>
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
                    <p>&copy; {new Date().getFullYear()} Hillman Chan</p>
                </div>
            </div>
        </footer>

      </div>
    </div>
  );
};

export default Layout;
