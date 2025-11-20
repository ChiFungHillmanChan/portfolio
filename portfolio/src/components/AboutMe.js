import React from 'react';
import { motion } from 'framer-motion';
import poker_pic from '../assets/poker.png';
import traveling_pic from '../assets/traveling.jpg';
import piano_pic from '../assets/piano.jpg'

const AboutMe = () => {
  const hobbies = [
    {
      title: "Passion for Piano",
      description: "Playing the piano is my escape, a way to find peace and disconnect from the world. When I'm at the keys, everything else fades, and I get lost in the music. It's a moment to recharge, focus, and embrace a calm that enhances both patience and creativity.",
      image: piano_pic,
      alt: "Piano illustration"
    },
    {
      title: "Travel",
      description: "Traveling is my way of stepping outside the familiar, a journey to explore and embrace the world's diversity. Japan is just the beginning—a gateway to discovering new cultures, flavors, and perspectives. From Europe's vast landscapes to Asia's vibrant cities, each destination holds its own story, and I'm eager to learn and grow with every adventure.",
      image: traveling_pic,
      alt: "Japan"
    },
    {
      title: "Poker Strategy",
      description: "Poker is the ultimate strategic game, full of calculations and long-term thinking, which makes it a perfect fit for me. I love the challenge of planning strategies and calculating Expected Value (EV) to make the best moves. The game keeps me on my toes, sharpening my analytical skills and teaching me to think several steps ahead. For me, poker isn't just a game—it's a way to develop a mindset for smart, calculated decisions.",
      image: poker_pic,
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

  const experience = [
    {
      title: "Junior AI Engineer",
      company: "Evoke AI Lab",
      location: "Hong Kong / Remote",
      start_date: "October 2025",
      end_date: "Present",
      description: [
        "Develop end-to-end AI solutions spanning image generation, text summarisation, and question-answering for education-focused products.",
        "Fine-tune large language models to improve accuracy and latency, aligning deliverables with educator requirements.",
        "Partner with cross-functional teams to translate stakeholder needs into deployable machine learning features."
      ],
      skills: ["AI Engineering", "LLM Fine-tuning", "Stakeholder Collaboration", "MLOps"]
    },
    {
      title: "Programming Tutor",
      company: "Self-Employed",
      location: "Hybrid",
      start_date: "July 2023",
      end_date: "Present",
      description: [
        "Taught Python, Java, and software engineering fundamentals with a focus on data structures, algorithms, and debugging strategies.",
        "Created custom exercises and unit testing frameworks to help students solve real-world coding problems.",
        "Mentored students through end-to-end projects, emphasizing clean code, performance tuning, and best practices.",
        "Coached a diverse range of learners, including students, former Hong Kong teachers, and company managers, in understanding AI concepts and software development foundations."
      ],
      skills: ["Python", "Java", "Software Engineering", "Mentoring", "AI Literacy"]
    },
    {
      title: "Online Service Colleague",
      company: "Asda",
      location: "United Kingdom",
      start_date: "July 2022",
      end_date: "June 2025",
      description: [
        "Collaborated with cross-departmental teams to improve logistics workflows, ensuring smooth coordination between picking, packing, and delivery operations.",
        "Designed Excel-based inventory check systems with formulas and validation, reducing product discrepancies by 30%.",
        "Acted as a bridge between operations and management teams to identify issues and implement process optimizations."
      ],
      skills: ["Logistics Coordination", "Excel", "Cross-Team Collaboration", "Process Optimization"]
    },
    {
      title: "Freelance Software Developer",
      company: "PBM App Team",
      location: "Hong Kong",
      start_date: "December 2024",
      end_date: "April 2025",
      description: [
        "Developed cross-platform modules in React Native and TypeScript, improving app load performance by 25% on low-end devices.",
        "Debugged UI rendering and memory optimization issues, reducing crashes and ensuring stable performance across Android and iOS.",
        "Participated in Agile sprints and code reviews, ensuring clean, maintainable code."
      ],
      skills: ["React Native", "TypeScript", "Agile Delivery", "Performance Optimization"]
    }
  ];


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
    <motion.div className="container mx-auto px-4 py-12" initial="hidden" animate="visible" variants={pageVariants}>
      {/* Hero Section */}
      <motion.section className="mb-16" variants={sectionVariants}>
        <motion.h1 className="text-4xl md:text-5xl font-bold mb-6 dark:text-white" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          About Me
        </motion.h1>
      </motion.section>
      
      {/* Education Section */}
      <motion.section className="mb-16" variants={sectionVariants}>
        <h2 className="text-3xl font-bold mb-8 dark:text-white">Education</h2>
        <div className="grid gap-6">
          {education.map((edu, index) => (
            <motion.div key={index} className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-700 dark:to-gray-800 rounded-xl shadow-lg p-8 border border-gray-200 dark:border-gray-600" variants={storyVariants} whileHover={{ scale: 1.02, boxShadow: "0 15px 30px -10px rgba(0, 0, 0, 0.15)" }} transition={{ type: "spring", stiffness: 300 }}>
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-600 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                  </svg>
                </div>
                <span className="bg-gray-100 dark:bg-gray-600 px-4 py-2 rounded-full text-sm font-medium text-gray-700 dark:text-gray-200">
                  {edu.year}
                </span>
              </div>
              
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-3">
                {edu.degree}
              </h3>
              <h4 className="text-lg font-semibold text-gray-600 dark:text-gray-300 mb-4">
                {edu.school}
              </h4>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                {edu.description}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Experience Section */}
      <motion.section className="mb-16" variants={sectionVariants}>
        <h2 className="text-3xl font-bold mb-8 dark:text-white">Experience</h2>
        <div className="grid gap-6">
          {experience.map((exp, index) => (
            <motion.div key={index} className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-xl shadow-lg p-4 sm:p-6 border-l-4 border-gray-400 dark:border-gray-500" variants={storyVariants} whileHover={{ scale: 1.01, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)" }} transition={{ type: "spring", stiffness: 300 }}>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-3">
                <div className="flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2">
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">
                      {exp.title}
                    </h3>
                    <div className="bg-white dark:bg-gray-600 px-3 py-1 rounded-full text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 whitespace-nowrap mt-1 sm:mt-0 sm:ml-4 self-start">
                      {exp.start_date} - {exp.end_date}
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                    <span className="text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-300">
                      {exp.company}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">
                      • {exp.location}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-1 sm:space-y-2 mb-3 sm:mb-4">
                {exp.description.map((desc, descIndex) => (
                  <p key={descIndex} className="text-sm sm:text-base text-gray-700 dark:text-gray-300 leading-relaxed">
                    • {desc}
                  </p>
                ))}
              </div>
              
              <div className="flex flex-wrap gap-2">
                {exp.skills.map((skill, skillIndex) => (
                  <span key={skillIndex} className="px-2 sm:px-3 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-full text-xs sm:text-sm font-medium">
                    {skill}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Hobbies Section */}
      <motion.section variants={sectionVariants}>
        <h2 className="text-3xl font-bold mb-8 dark:text-white">Hobbies</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 sm:gap-8">
          {hobbies.map((hobby, index) => (
            <motion.div key={index} className="group bg-white dark:bg-gray-700 rounded-2xl shadow-lg overflow-hidden" variants={storyVariants} whileHover={{ scale: 1.05, y: -5 }} transition={{ type: "spring", stiffness: 300 }}>
              <div className="relative overflow-hidden">
                <img
                  src={hobby.image}
                  alt={hobby.alt}
                  className="w-full h-40 sm:h-48 object-cover group-hover:scale-110 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
              <div className="p-4 sm:p-6">
                <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white mb-3">
                  {hobby.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                  {hobby.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>
    </motion.div>
  );
};

export default AboutMe;
