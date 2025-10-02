import React, { useState } from 'react';
import { motion } from 'framer-motion';
import projectData from '../projectData.json';
import { useNavigate } from 'react-router-dom';

const Projects = () => {
  const categories = [
    { value: 'all', label: 'All' },
    { value: 'game', label: 'Game' },
    { value: 'program', label: 'Program' },
    { value: 'fullstack', label: 'Full stack' },
  ];

  const [activeCategory, setActiveCategory] = useState('all');
  const filteredProjects = activeCategory === 'all' ? projectData : projectData.filter(project => project.category === activeCategory);
  const navigate = useNavigate();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
      <h2 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8 text-center dark:text-white">My Projects</h2>
      <div className="mb-8 flex justify-center">
        <div className="bg-gray-200 dark:bg-gray-700 rounded-full px-3 sm:px-4 py-2 flex flex-wrap sm:flex-nowrap gap-2 justify-center w-full sm:w-auto">
          {categories.map(({ value, label }) => (
            <button
              key={value}
              className={`px-3 sm:px-4 py-1 text-sm sm:text-base whitespace-nowrap rounded-full transition-colors duration-300 ${
                activeCategory === value 
                  ? 'bg-gray-800 text-white' 
                  : 'hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
              }`}
              onClick={() => setActiveCategory(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        {filteredProjects.map(project => (
          <motion.div
            key={project.id}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="bg-white dark:bg-gray-700 rounded-lg shadow-md overflow-hidden flex flex-col h-full"
          >
            <div className="aspect-w-16 aspect-h-9">
              <img 
                src={require(`../assets/${project.image}`)} 
                alt={project.title} 
                className="w-full h-48 object-cover"
              />
            </div>
            <div className="p-4 md:p-6 flex flex-col flex-grow">
              <div className="flex-grow">
                <h3 className="text-lg md:text-xl font-bold mb-2">{project.title}</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm md:text-base">
                  {project.shortDescription}
                </p>
              </div>
              <div className="mt-auto">
                <button
                  onClick={() => project.category !== 'none' && navigate(`/project/${project.id}`)}
                  disabled={project.category === 'none'}
                  className={`w-full px-4 py-2 rounded-md flex items-center justify-center gap-2 
                    ${project.category === 'none' 
                    ? 'bg-gray-700 cursor-not-allowed text-gray-200'
                    : 'bg-gray-800 text-white hover:bg-gray-600 transition-colors duration-300'}`}
                >
                  <span>View Details</span>
                  <svg 
                    className="w-4 h-4" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M9 5l7 7-7 7" 
                    />
                  </svg>
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default Projects;
