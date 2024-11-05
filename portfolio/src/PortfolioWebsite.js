import React, { useState, useEffect } from 'react';
import { FaGithub, FaInstagram, FaLinkedin, FaLightbulb, FaMoon } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import projectData from './projectData.json';

const PortfolioWebsite = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [timeOfDay, setTimeOfDay] = useState('');

  useEffect(() => {
    // Get the current time and set a personalized greeting
    const currentHour = new Date().getHours();
    if (currentHour < 12) {
      setTimeOfDay('Good morning');
    } else if (currentHour < 18) {
      setTimeOfDay('Good afternoon');
    } else {
      setTimeOfDay('Good evening');
    }
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  // Filter projects based on category
  const [activeCategory, setActiveCategory] = useState('all');
  const filteredProjects = activeCategory === 'all' ? projectData : projectData.filter(project => project.category === activeCategory);

  return (
    <div className={`font-['Montserrat', 'sans-serif'] ${isDarkMode ? 'dark' : ''}`}>
      <div className={`bg-khaki dark:bg-gray-800 dark:text-white transition-colors duration-300`}>
        {/* Top Navbar */}
        <header className="bg-white dark:bg-gray-700 shadow-md">
          <nav className="container mx-auto flex items-center justify-between py-4">
            <div className="font-bold text-2xl">
              <a href="/">Hillman Chan</a>
            </div>
            <ul className="flex space-x-6">
              <li><a href="/about">About</a></li>
              <li><a href="/blogs">Blogs</a></li>
              <li><a href="/projects">Projects</a></li>
              <li><a href="/contact">Contact</a></li>
              <li>
                <a href="https://github.com/chifunghillmanchan" target="_blank" rel="noopener noreferrer">
                  <FaGithub size={24} className="dark:text-white transition-colors duration-300" />
                </a>
              </li>
              <li>
                <a href="https://www.instagram.com/hillmanchan709_/" target="_blank" rel="noopener noreferrer">
                  <FaInstagram size={24} className="dark:text-white transition-colors duration-300" />
                </a>
              </li>
              <li>
                <a href="https://www.linkedin.com/in/chi-fung-hillman-chan-2845a5201" target="_blank" rel="noopener noreferrer">
                  <FaLinkedin size={24} className="dark:text-white transition-colors duration-300" />
                </a>
              </li>
              
              <li>
                <button onClick={toggleDarkMode}>
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

        {/* Main Content */}
        <main>
          {/* Personalized Greeting */}
          <section className="container mx-auto py-12">
            <motion.h1 initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-4xl font-bold mb-4">
              {timeOfDay}, I'm Hillman Chan
            </motion.h1>
            <p className="text-lg">Welcome to my portfolio website!</p>
          </section>

          {/* Project Display */}
          <section className="container mx-auto py-12">
            <h2 className="text-3xl font-bold mb-8">My Projects</h2>
            <div className="mb-8">
              <button
                className={`px-4 py-2 rounded-md mr-2 ${activeCategory === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-200 dark:bg-gray-600 dark:text-white'}`}
                onClick={() => setActiveCategory('all')}
              >
                All
              </button>
              <button
                className={`px-4 py-2 rounded-md mr-2 ${activeCategory === 'web' ? 'bg-gray-800 text-white' : 'bg-gray-200 dark:bg-gray-600 dark:text-white'}`}
                onClick={() => setActiveCategory('web')}
              >
                Web
              </button>
              <button
                className={`px-4 py-2 rounded-md mr-2 ${activeCategory === 'mobile' ? 'bg-gray-800 text-white' : 'bg-gray-200 dark:bg-gray-600 dark:text-white'}`}
                onClick={() => setActiveCategory('mobile')}
              >
                Mobile
              </button>
              <button
                className={`px-4 py-2 rounded-md mr-2 ${activeCategory === 'fullstack' ? 'bg-gray-800 text-white' : 'bg-gray-200 dark:bg-gray-600 dark:text-white'}`}
                onClick={() => setActiveCategory('fullstack')}
              >
                Full-Stack
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredProjects.map(project => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  className="bg-white dark:bg-gray-700 rounded-md shadow-md overflow-hidden"
                >
                  <img src={require(`./assets/${project.image}`)} alt={project.title} className="w-full h-48 object-cover" />
                  <div className="p-4">
                    <h3 className="text-xl font-bold mb-2">{project.title}</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">{project.description}</p>
                    <a href={project.url} target="_blank" rel="noopener noreferrer" className="bg-gray-800 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors duration-300">
                      View Project
                    </a>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Skills Visualization */}
          <section className="container mx-auto py-12">
            <h2 className="text-3xl font-bold mb-8">My Skills</h2>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={[
                { skill: 'HTML', proficiency: 90 },
                { skill: 'CSS', proficiency: 85 },
                { skill: 'JavaScript', proficiency: 80 },
                { skill: 'React.js', proficiency: 75 },
                { skill: 'Node.js', proficiency: 70 },
                { skill: 'MongoDB', proficiency: 65 },
              ]}>
                <XAxis dataKey="skill" />
                <YAxis type="number" domain={[0, 100]} />
                <CartesianGrid strokeDasharray="3 3" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="proficiency" stroke="#8884d8" />
              </LineChart>
            </ResponsiveContainer>
          </section>
        </main>

        {/* Footer */}
        <footer className="bg-gray-800 text-white py-6">
          <div className="container mx-auto flex justify-between items-center">
            <p>&copy; 2024 Hillman Chan</p>
            <div>
              {/* Add your contact form here */}
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default PortfolioWebsite;