import React, { useState } from 'react';
import { FaGithub, FaInstagram, FaLinkedin, FaLightbulb, FaMoon, FaBars, FaTimes } from 'react-icons/fa';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const Layout = () => {
    const [isDarkMode, setIsDarkMode] = useState(() => {
        return localStorage.getItem('darkMode') === 'true';
    });
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const location = useLocation();

    const isActiveLink = (path) => {
        return location.pathname === path ? 'text-blue-500' : '';
    };

    const toggleDarkMode = () => {
        setIsDarkMode(prevMode => {
            const newMode = !prevMode;
            localStorage.setItem('darkMode', newMode);
            return newMode;
        });
    };

    const menuVariants = {
        closed: {
            opacity: 0,
            x: "100%",
            transition: {
                duration: 0.3
            }
        },
        open: {
            opacity: 1,
            x: 0,
            transition: {
                duration: 0.3
            }
        }
    };

    return (
        <div className={`min-h-screen font-['Montserrat', 'sans-serif'] ${isDarkMode ? 'dark' : ''}`}>
            <div className="bg-khaki dark:bg-gray-800 dark:text-white transition-colors duration-300">
                
                {/* Navigation/Header */}
                <header className="bg-white dark:bg-gray-700 shadow-md relative">
                    <nav className="container mx-auto flex items-center justify-between py-4 px-4">
                        <div className="font-bold text-2xl">
                            <Link to="/portfolio" className="hover:text-blue-500 transition-colors duration-300">
                                Hillman Chan
                            </Link>
                        </div>

                        {/* Mobile Menu Button */}
                        <button 
                            className="md:hidden z-50 p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md"
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            aria-label="Toggle menu"
                        >
                            {isMenuOpen ? (
                                <FaTimes size={24} className="dark:text-white" />
                            ) : (
                                <FaBars size={24} className="dark:text-white" />
                            )}
                        </button>

                        {/* Desktop Menu */}
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

                        {/* Mobile Menu */}
                        <AnimatePresence>
                            {isMenuOpen && (
                                <motion.div
                                    initial="closed"
                                    animate="open"
                                    exit="closed"
                                    variants={menuVariants}
                                    className="fixed top-0 right-0 h-screen w-64 bg-white dark:bg-gray-800 shadow-lg z-40 md:hidden"
                                >
                                    <div className="flex flex-col h-full pt-20 px-4">
                                        <ul className="space-y-4">
                                            <li>
                                                <Link 
                                                    to="/about"
                                                    className={`block py-2 hover:text-blue-500 transition-colors duration-300 ${isActiveLink('/about')}`}
                                                    onClick={() => setIsMenuOpen(false)}
                                                >
                                                    About
                                                </Link>
                                            </li>
                                            <li>
                                                <Link 
                                                    to="/contact"
                                                    className={`block py-2 hover:text-blue-500 transition-colors duration-300 ${isActiveLink('/contact')}`}
                                                    onClick={() => setIsMenuOpen(false)}
                                                >
                                                    Contact
                                                </Link>
                                            </li>
                                            <li className="pt-4">
                                                <div className="flex space-x-4">
                                                    <a 
                                                        href="https://github.com/chifunghillmanchan"
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="hover:opacity-80 transition-opacity"
                                                    >
                                                        <FaGithub size={24} className="dark:text-white" />
                                                    </a>
                                                    <a 
                                                        href="https://www.instagram.com/hillmanchan709_/"
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="hover:opacity-80 transition-opacity"
                                                    >
                                                        <FaInstagram size={24} className="dark:text-white" />
                                                    </a>
                                                    <a 
                                                        href="https://www.linkedin.com/in/chi-fung-hillman-chan-2845a5201"
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="hover:opacity-80 transition-opacity"
                                                    >
                                                        <FaLinkedin size={24} className="dark:text-white" />
                                                    </a>
                                                </div>
                                            </li>
                                            <li className="pt-4">
                                                <button 
                                                    onClick={() => {
                                                        toggleDarkMode();
                                                        setIsMenuOpen(false);
                                                    }}
                                                    className="flex items-center space-x-2 hover:text-blue-500 transition-colors duration-300"
                                                >
                                                    {isDarkMode ? (
                                                        <>
                                                            <FaLightbulb size={24} />
                                                            <span>Light Mode</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <FaMoon size={24} />
                                                            <span>Dark Mode</span>
                                                        </>
                                                    )}
                                                </button>
                                            </li>
                                        </ul>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                        
                        {/* Overlay for mobile menu */}
                        {isMenuOpen && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 0.5 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 bg-black z-30 md:hidden"
                                onClick={() => setIsMenuOpen(false)}
                            />
                        )}
                    </nav>
                </header>

                {/* Main Content */}
                <main className="container mx-auto py-8">
                    <Outlet />
                </main>

                {/* Footer - Made it responsive */}
                <footer className="bg-gray-800 text-white py-8 dark:bg-gray-700">
                    <div className="container mx-auto px-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="text-center md:text-left">
                                <h4 className="text-xl font-bold mb-4">About Me</h4>
                                <p className="text-gray-300">
                                    Passionate developer creating innovative solutions for web applications and program.
                                </p>
                            </div>
                            <div className="text-center md:text-left">
                                <h4 className="text-xl font-bold mb-4">Quick Links</h4>
                                <ul className="space-y-2">
                                    <li>
                                        <Link to="/about" className="hover:text-blue-400 transition-colors">
                                            About
                                        </Link>
                                    </li>
                                    <li>
                                        <Link to="/contact" className="hover:text-blue-400 transition-colors">
                                            Contact
                                        </Link>
                                    </li>
                                </ul>
                            </div>
                            <div className="text-center md:text-left">
                                <h4 className="text-xl font-bold mb-4">Connect</h4>
                                <div className="flex justify-center md:justify-start space-x-4">
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