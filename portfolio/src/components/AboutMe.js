import React, { useState } from 'react';
import { motion } from 'framer-motion';

const AboutMe = () => {
  const stories = [
    {
      title: "Passion for Piano",
      description: "I find solace and creativity in playing the piano. It’s a way to disconnect from everything else and dive into the world of music, enhancing focus and patience.",
      image: "/api/placeholder/600/400",
      alt: "Piano illustration"
    },
    {
      title: "Coding Journey",
      description: "Coding isn’t just a profession; it’s my passion. I enjoy building creative solutions and constantly learning new technologies to push the boundaries of what's possible.",
      image: "/api/placeholder/600/400",
      alt: "Coding illustration"
    },
    {
      title: "Poker Strategy",
      description: "Poker is a game of strategy and psychology. I enjoy the thrill of reading opponents and making calculated decisions, which also helps improve my analytical skills.",
      image: "/api/placeholder/600/400",
      alt: "Poker illustration"
    }
  ];

  const education = [
    {
      degree: "Bachelor of Computer Science with Artificial Intelligence",
      school: "University of Leeds",
      year: "2021 - 2024",
      description: "Focus on Software Engineering and Web Development"
    }
  ];

  // State for handling "Load More" functionality
  const [visibleStories, setVisibleStories] = useState(2);

  // Function to load more stories
  const loadMoreStories = () => {
    setVisibleStories(stories.length);
  };

  // Animation variants
  const pageVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            duration: 0.6,
            staggerChildren: 0.3
        }
    }
};

const sectionVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { 
        opacity: 1, 
        y: 0,
        transition: { duration: 0.6 }
    }
};

const storyVariants = {
    hidden: { opacity: 0, x: -30 },
    visible: { 
        opacity: 1, 
        x: 0,
        transition: { duration: 0.6 }
    }
};

  return (
    <motion.div className="container mx-auto px-4 py-12"initial="hidden"animate="visible"variants={pageVariants}>
      {/* Hero Section */}
      <motion.section className="mb-16"variants={sectionVariants}>
        <motion.h1 className="text-4xl md:text-5xl font-bold mb-6 dark:text-white"initial={{ opacity: 0, y: -20 }}animate={{ opacity: 1, y: 0 }}transition={{ delay: 0.2 }}>
          About Me
        </motion.h1>
        <motion.div className="bg-white dark:bg-gray-700 rounded-lg shadow-lg p-8"whileHover={{ scale: 1.02 }}transition={{ type: "spring", stiffness: 300 }}>
          <p className="text-xl md:text-2xl text-gray-700 dark:text-gray-200 leading-relaxed">
            Hi. I am Hillman - a passionate developer who loves to create innovative web design and solutions.
          </p>
        </motion.div>
      </motion.section>

      {/* Habit and Interests Section */}
      <motion.section className="mb-16"variants={sectionVariants}>
        <h2 className="text-3xl font-bold mb-8 dark:text-white">Habits and Interests</h2>
        <div className="space-y-16">
          {stories.slice(0, visibleStories).map((story, index) => (
            <motion.div  key={index} className={`flex flex-col ${index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'} gap-8 items-center`} variants={storyVariants} whileHover={{ scale: 1.02 }} transition={{ type: "spring", stiffness: 300 }}>
              <div className="w-full md:w-1/2">
                <img
                  src={story.image}
                  alt={story.alt}
                  className="rounded-lg shadow-lg w-full h-auto"
                />
              </div>
              <div className="w-full md:w-1/2 space-y-4">
                <h3 className="text-2xl font-bold dark:text-white">
                  {story.title}
                </h3>
                <p className="text-gray-700 dark:text-gray-200 text-lg leading-relaxed">
                  {story.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Load More Button */}
        {visibleStories < stories.length && (
        <motion.div className="text-center mt-8"initial={{ opacity: 0 }}animate={{ opacity: 1 }}transition={{ delay: 0.5 }}>
          <motion.button  onClick={loadMoreStories} className="px-6 py-2 bg-white text-gray-700 rounded-md shadow-md hover:bg-gray-200 transition-colors dark:bg-gray-700 dark:text-white dark:hover:bg-gray-400" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
            Load More
          </motion.button>
        </motion.div>
        )}
      </motion.section>

      {/* Education Section */}
      <motion.section variants={sectionVariants}>
        <h2 className="text-3xl font-bold mb-8 dark:text-white">Education</h2>
        <div className="grid gap-6">
          {education.map((edu, index) => (
            <motion.div  key={index} className="bg-white dark:bg-gray-700 rounded-lg shadow-lg p-6" variants={storyVariants} whileHover={{ scale: 1.02 }} transition={{ type: "spring", stiffness: 300 }}>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                <h3 className="text-xl font-bold dark:text-white">
                  {edu.degree}
                </h3>
                <span className="text-gray-600 dark:text-gray-300">
                  {edu.year}
                </span>
              </div>
              <h4 className="text-lg text-gray-700 dark:text-gray-200 mb-2">
                {edu.school}
              </h4>
              <p className="text-gray-600 dark:text-gray-300">
                {edu.description}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.section>
    </motion.div>
  );
};

export default AboutMe;
