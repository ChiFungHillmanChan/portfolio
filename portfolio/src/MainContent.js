import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import projectData from './projectData.json';
import profilePic from "./assets/profile_pic.jpg";

const MainContent = () => {
    const [activeCategory, setActiveCategory] = useState('all');
    const filteredProjects = activeCategory === 'all' ? projectData : projectData.filter(project => project.category === activeCategory);

    const [timeOfDay, setTimeOfDay] = useState('');
    useEffect(() => {
        const currentHour = new Date().getHours();
        if (currentHour < 12) setTimeOfDay('Good morning');
        else if (currentHour < 18) setTimeOfDay('Good afternoon');
        else setTimeOfDay('Good evening');
      }, []);
    // Skills data with proficiency levels
    const skills = [
        { name: 'HTML/CSS', proficiency: 90 },
        { name: 'Python', proficiency: 90 },
        { name: 'SQL', proficiency: 85 },
        { name: 'C', proficiency: 80 },
        { name: 'JavaScript', proficiency: 80 },
        { name: 'Machine Learning', proficiency: 75 },
    ];
    return (
        <>
            {/* Main Content */}
            <>
                {/* Personalized Greeting */}
                <section className="py-20 flex flex-col md:flex-row items-center gap-12">
                    <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8 }}
                    className="md:w-1/3 flex justify-center"
                    >
                    <div className="w-64 h-64 rounded-full overflow-hidden border-4 border-black-500 shadow-lg">
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
                    className="md:w-2/3"
                    >
                    <h1 className="text-4xl font-bold mb-6 dark:text-white">
                        {timeOfDay}, I'm Hillman Chan
                    </h1>
                    <p className="text-xl text-gray-600 dark:text-gray-300 mb-6">
                        Computer Science & AI Graduate | Software Engineer
                    </p>
                    <p className="text-lg text-gray-700 dark:text-gray-400 leading-relaxed">
                        I'm a recent graduate with a degree in Computer Science and Artificial Intelligence, 
                        driven by a passion for creating innovative software solutions. My academic background 
                        combines traditional computer science principles with cutting-edge AI concepts, 
                        enabling me to approach problems with a unique perspective. I'm particularly 
                        enthusiastic about developing scalable applications and implementing AI-driven 
                        solutions in real-world scenarios.
                    </p>
                    </motion.div>
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
                <section className="py-16 bg-gray-50 dark:bg-gray-800">
                    <div className="container mx-auto px-4 max-w-5xl"> 
                    <motion.h2 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-3xl font-bold mb-12 text-center dark:text-white"
                    >
                        Technical Skills
                    </motion.h2>
                    
                    <div className="bg-white dark:bg-gray-700 rounded-xl shadow-lg p-8"> 
                        <div className="grid md:grid-cols-2 gap-x-16 gap-y-8"> 
                        {skills.map((skill, index) => (
                            <motion.div 
                            key={skill.name}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="space-y-3" 
                            >
                            <div className="flex justify-between items-center mb-2">
                                <span className="font-medium text-gray-700 dark:text-gray-200 text-lg">
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
            </>
        </>
    );
}

export default MainContent;