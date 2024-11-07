import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import projectData from './projectData.json';
import profilePic from "./assets/profile_pic.jpg";
import { useNavigate } from 'react-router-dom';

const MainContent = () => {
    const [activeCategory, setActiveCategory] = useState('all');
    const filteredProjects = activeCategory === 'all' ? projectData : projectData.filter(project => project.category === activeCategory);
    const navigate = useNavigate();

    const [timeOfDay, setTimeOfDay] = useState('');
    useEffect(() => {
        const currentHour = new Date().getHours();
        if (currentHour < 12) setTimeOfDay('Good morning');
        else if (currentHour < 18) setTimeOfDay('Good afternoon');
        else setTimeOfDay('Good evening');
    }, []);

    const skills = [
        { name: 'HTML/CSS', proficiency: 90 },
        { name: 'Python', proficiency: 90 },
        { name: 'SQL', proficiency: 85 },
        { name: 'C', proficiency: 80 },
        { name: 'JavaScript', proficiency: 80 },
        { name: 'Machine Learning', proficiency: 75 },
    ];

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Personalized Greeting Section */}
            <section className="py-12 md:py-20">
                <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8 }}
                        className="w-full md:w-1/3 flex justify-center"
                    >
                        <div className="w-48 h-48 md:w-64 md:h-64 rounded-full overflow-hidden border-4 border-black-500 shadow-lg">
                            <img
                                src={profilePic}
                                alt="Profile"
                                className="w-full h-full object-cover"
                            />
                        </div>
                    </motion.div>
                    
                    <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="w-full md:w-2/3 text-center md:text-left"
                    >
                        <h1 className="text-3xl md:text-4xl font-bold mb-4 md:mb-6 dark:text-white">
                            {timeOfDay}, I'm Hillman Chan
                        </h1>
                        <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-4 md:mb-6">
                            Computer Science & AI Graduate | Software Engineer
                        </p>
                        <p className="text-base md:text-lg text-gray-700 dark:text-gray-400 leading-relaxed">
                            I recently graduated with a degree in Computer Science and Artificial Intelligence. 
                            I'm passionate about building creative software and enjoy working on real-world projects that challenge me. 
                            I'm excited to find a role where I can work with a team, contribute my skills, and keep learning. 
                            Take a look at my portfolio to see what I've been up to!
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* Project Display Section */}
            <section className="py-12">
                <h2 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8 text-center">My Delighted Projects</h2>
                <div className="flex flex-wrap justify-center gap-2 mb-8">
                    {['all', 'web', 'mobile', 'fullstack'].map((category) => (
                        <button
                            key={category}
                            className={`px-4 py-2 rounded-md ${
                                activeCategory === category 
                                    ? 'bg-gray-800 text-white' 
                                    : 'bg-gray-200 dark:bg-gray-600 dark:text-white'
                            } transition-colors duration-300`}
                            onClick={() => setActiveCategory(category)}
                        >
                            {category.charAt(0).toUpperCase() + category.slice(1)}
                        </button>
                    ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                    {filteredProjects.map(project => (
                        <motion.div
                            key={project.id}
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                            className="bg-white dark:bg-gray-700 rounded-lg shadow-md overflow-hidden"
                        >
                            <div className="aspect-w-16 aspect-h-9">
                                <img 
                                    src={require(`./assets/${project.image}`)} 
                                    alt={project.title} 
                                    className="w-full h-48 object-cover"
                                />
                            </div>
                            <div className="p-4 md:p-6">
                                <h3 className="text-lg md:text-xl font-bold mb-2">{project.title}</h3>
                                <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm md:text-base">
                                    {project.shortDescription}
                                </p>
                                <button
                                    onClick={() => project.category !== 'none' && navigate(`/project/${project.id}`)}
                                    disabled={project.category === 'none'}
                                    className={`w-full px-4 py-2 rounded-md flex items-center justify-center gap-2 
                                        ${project.category === 'none' 
                                        ? 'bg-gray-700 cursor-not-allowed text-gray-200'
                                        : 'bg-gray-800 text-white hover:bg-gray-700 transition-colors duration-300'}`}
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
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* Skills Visualization Section */}
            <section className="py-12 md:py-16 bg-gray-50 dark:bg-gray-800 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
                <div className="max-w-5xl mx-auto">
                    <motion.h2 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-2xl md:text-3xl font-bold mb-8 md:mb-12 text-center dark:text-white"
                    >
                        Technical Skills
                    </motion.h2>
                    
                    <div className="bg-white dark:bg-gray-700 rounded-xl shadow-lg p-6 md:p-8">
                        <div className="grid md:grid-cols-2 gap-6 md:gap-8">
                            {skills.map((skill, index) => (
                                <motion.div 
                                    key={skill.name}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className="space-y-3"
                                >
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-medium text-gray-700 dark:text-gray-200 text-base md:text-lg">
                                            {skill.name}
                                        </span>
                                        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                                            {skill.proficiency}%
                                        </span>
                                    </div>
                                    <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                                        <motion.div 
                                            className="h-full bg-blue-500 rounded-full"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${skill.proficiency}%` }}
                                            transition={{ duration: 1, delay: index * 0.1 }}
                                        />
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}

export default MainContent;