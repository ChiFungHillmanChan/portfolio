import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import projectData from './projectData.json';
import profilePic from "./assets/profile_pic.jpg";
import { useNavigate } from 'react-router-dom';

//update

import { 
    SiPython, 
    SiJavascript, 
    SiHtml5, 
    SiCss3, 
    SiReact, 
    SiNodedotjs, 
    SiTailwindcss, 
    SiGit, 
    SiMysql, 
    SiC
} from 'react-icons/si';

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
        { name: 'Python', icon: SiPython, color: '#3776AB' },
        { name: 'JavaScript', icon: SiJavascript, color: '#F7DF1E' },
        { name: 'HTML', icon: SiHtml5, color: '#E34F26' },
        { name: 'CSS', icon: SiCss3, color: '#1572B6' },
        { name: 'React', icon: SiReact, color: '#61DAFB' },
        { name: 'Node.js', icon: SiNodedotjs, color: '#339933' },
        { name: 'Tailwind CSS', icon: SiTailwindcss, color: '#06B6D4' },
        { name: 'Git', icon: SiGit, color: '#F05032' },
        { name: 'SQL', icon: SiMysql, color: '#4479A1' },
        { name: 'C', icon: SiC, color: '#A8B9CC' }
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
                        I recently completed a degree in Computer Science with Artificial Intelligence and enjoy creating practical software solutions. I’m eager to join a team where I can apply my skills, take on meaningful projects, and grow through new challenges. My portfolio highlights the work I’ve done so far—feel free to explore it!
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* Skills Visualization Section */}
            <section className="py-12 md:py-16 bg-transparent -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 overflow-hidden">
                <motion.h2 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-2xl md:text-3xl font-bold mb-8 md:mb-12 text-center dark:text-white"
                >
                    My Tech Skills
                </motion.h2>

                <div className="relative w-full overflow-hidden">
                    <motion.div 
                        className="flex space-x-8 pb-6"
                        animate={{
                            x: [0, `-${skills.length * 160}px`],
                            transition: {
                                x: {
                                    repeat: Infinity,
                                    duration: 30,
                                    ease: "linear"
                                }
                            }
                        }}
                    >
                        {[...skills, ...skills, ...skills].map((skill, index) => (
                            <div 
                                key={index}
                                className="flex-shrink-0 w-32 h-32 flex flex-col items-center justify-center"
                            >
                                <skill.icon 
                                    style={{ color: skill.color }} 
                                    className="w-16 h-16"
                                />
                                <span className="text-gray-800 dark:text-white text-sm mt-2">
                                    {skill.name}
                                </span>
                            </div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* Project Display Section */}
            <section className="py-12">
                <h2 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8 text-center">My Delighted Projects</h2>
                <div className="mb-8 flex justify-center">
                    <div className="bg-gray-200 dark:bg-gray-700 rounded-full px-4 py-2 flex gap-2">
                    {['all', 'web', 'program', 'fullstack'].map((category) => (
                        <button
                        key={category}
                        className={`px-4 py-1 rounded-full transition-colors duration-300 ${
                            activeCategory === category 
                            ? 'bg-gray-800 text-white' 
                            : 'hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                        }`}
                        onClick={() => setActiveCategory(category)}
                        >
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                        </button>
                    ))}
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                    {filteredProjects.slice(0,3).map(project => (
                        <motion.div
                            key={project.id}
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                            className="bg-white dark:bg-gray-700 rounded-lg shadow-md overflow-hidden flex flex-col h-full"
                        >
                            <div className="aspect-w-16 aspect-h-9">
                                <img 
                                    src={require(`./assets/${project.image}`)} 
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
            </section>

            
        </div>
    );
}

export default MainContent;