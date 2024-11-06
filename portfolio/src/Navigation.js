import React from 'react';
import { FaGithub, FaInstagram, FaLinkedin, FaLightbulb, FaMoon } from 'react-icons/fa';
import { Link, useLocation } from 'react-router-dom';

const Navigation = ({ isDarkMode, toggleDarkMode }) => {

  const location = useLocation();

  const isActiveLink = (path) => {
    return location.pathname === path ? 'text-blue-500' : '';
  };

  return (
    <nav className="container mx-auto flex items-center justify-between py-4 px-4">
        <div className="font-bold text-2xl">
            <Link to="/" className="hover:text-blue-500 transition-colors duration-300">
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
            <li>
            <Link 
                to="/blogs"
                className={`hover:text-blue-500 transition-colors duration-300 ${isActiveLink('/blogs')}`}
            >
                Blogs
            </Link>
            </li>
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
  );
};

export default Navigation;