import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import servicesData from '../../data/servicesData.json';

const ServicesPage = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.6,
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.6 }
    }
  };

  return (
    <motion.div 
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="text-center mb-12">
        <div className="flex items-center justify-center mb-6">
          <Link 
            to="/my-offer"
            className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors mr-4"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Offerings
          </Link>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-6 dark:text-white">
          Collaboration Services
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
          Let's work together! I'm always excited to collaborate on innovative projects, contribute to meaningful work, and help bring ideas to life.
        </p>
      </motion.div>

      {/* Services Grid */}
      <motion.section variants={itemVariants}>
        <div className="grid grid-cols-1 gap-8 max-w-4xl mx-auto">
          {servicesData.map((service) => (
            <motion.div
              key={service.id}
              variants={itemVariants}
              whileHover={{ scale: 1.02, y: -5 }}
              className="bg-white dark:bg-gray-700 rounded-2xl shadow-lg overflow-hidden"
            >
              {/* Content */}
              <div className="p-8">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    <h2 className="text-3xl font-bold mb-4 dark:text-white">
                      {service.title}
                    </h2>
                    <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
                      {service.description}
                    </p>
                  </div>
                  <div className="ml-6 flex-shrink-0">
                    <div className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-4 py-2 rounded-full text-sm font-medium">
                      {service.availability}
                    </div>
                  </div>
                </div>

                {/* What I Offer */}
                <div className="mb-8">
                  <h3 className="text-xl font-semibold mb-4 dark:text-white">What I can contribute:</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {service.features.map((feature, index) => (
                      <div key={index} className="flex items-center text-gray-600 dark:text-gray-300">
                        <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        {feature}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Response Time Info */}
                <div className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg p-4 mb-6">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-gray-600 dark:text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-gray-800 dark:text-gray-300 font-medium">
                      Response Time: {service.responseTime}
                    </span>
                  </div>
                </div>

                {/* CTA Button */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <a
                    href={service.EmailUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-gray-800 text-white px-6 py-4 rounded-lg font-semibold hover:bg-gray-600 transition-colors duration-300 flex items-center justify-center group"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.955 8.955 0 01-2.748-.424l-1.752 1.752A1 1 0 018 21l2.25-2.25C9.456 18.92 8.736 19 8 19a8 8 0 110-16 8 8 0 110 16z" />
                    </svg>
                    Start a Conversation
                    <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </a>
                  
                  <Link
                    to="/contact"
                    className="flex-1 sm:flex-initial border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-6 py-4 rounded-lg font-semibold hover:border-gray-400 dark:hover:border-gray-500 transition-colors duration-300 flex items-center justify-center"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Email Me
                  </Link>
                </div>

                {/* Note */}
                <div className="mt-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                  💡 This will open a Google Document form for collaboration inquiries
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Why Collaborate Section */}
      <motion.section variants={itemVariants} className="mt-16">
        <div className="bg-gradient-to-r from-gray-800 to-gray-600 rounded-2xl p-8 md:p-12 text-white">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6">
              Why Collaborate With Me?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
              <div className="text-center">
                <div className="bg-white bg-opacity-20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">Fast Learner</h3>
                <p className="opacity-90">
                  I quickly adapt to new technologies and project requirements
                </p>
              </div>
              <div className="text-center">
                <div className="bg-white bg-opacity-20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">Team Player</h3>
                <p className="opacity-90">
                  Strong communication skills and collaborative mindset
                </p>
              </div>
              <div className="text-center">
                <div className="bg-white bg-opacity-20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">Problem Solver</h3>
                <p className="opacity-90">
                  I love tackling challenges and finding creative solutions
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Types of Collaborations */}
      <motion.section variants={itemVariants} className="mt-16">
        <h2 className="text-3xl font-bold text-center mb-12 dark:text-white">
          Types of Collaborations I'm Interested In
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="bg-white dark:bg-gray-700 rounded-lg p-6 shadow-md text-center">
            <div className="bg-gray-100 dark:bg-gray-800 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-3 dark:text-white">Startup Projects</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Early-stage startups looking for technical co-founders or development partners
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-700 rounded-lg p-6 shadow-md text-center">
            <div className="bg-gray-100 dark:bg-gray-800 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-3 dark:text-white">Open Source</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Contributing to meaningful open-source projects and building developer tools
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-700 rounded-lg p-6 shadow-md text-center">
            <div className="bg-gray-100 dark:bg-gray-800 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-3 dark:text-white">AI/ML Projects</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Machine learning applications, AI tools, and data science initiatives
            </p>
          </div>
        </div>
      </motion.section>

      {/* Process Section */}
      <motion.section variants={itemVariants} className="mt-16 bg-gray-50 dark:bg-gray-800 rounded-2xl p-8">
        <h2 className="text-3xl font-bold text-center mb-12 dark:text-white">
          How It Works
        </h2>
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="bg-gray-600 text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4 font-bold text-lg">
                1
              </div>
              <h3 className="font-semibold mb-2 dark:text-white">Reach Out</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Fill out the collaboration form with your project details
              </p>
            </div>
            <div className="text-center">
              <div className="bg-gray-600 text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4 font-bold text-lg">
                2
              </div>
              <h3 className="font-semibold mb-2 dark:text-white">Discussion</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                We'll have a call to discuss goals, timeline, and fit
              </p>
            </div>
            <div className="text-center">
              <div className="bg-gray-600 text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4 font-bold text-lg">
                3
              </div>
              <h3 className="font-semibold mb-2 dark:text-white">Planning</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Define scope, responsibilities, and collaboration terms
              </p>
            </div>
            <div className="text-center">
              <div className="bg-gray-600 text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4 font-bold text-lg">
                4
              </div>
              <h3 className="font-semibold mb-2 dark:text-white">Execute</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Start building something amazing together!
              </p>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Final CTA */}
      <motion.section variants={itemVariants} className="mt-16 text-center">
        <div className="bg-gradient-to-r from-gray-800 to-gray-600 dark:from-gray-700 dark:to-gray-800 rounded-2xl p-8 md:p-12">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Collaborate?
          </h2>
          <p className="text-gray-300 mb-6 text-lg max-w-2xl mx-auto">
            I'm excited to hear about your project and explore how we can work together to bring your ideas to life.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={servicesData[0]?.EmailUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white text-gray-800 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors duration-300 inline-flex items-center justify-center"
            >
              Start Collaboration
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
            <Link 
              to="/contact"
              className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-gray-800 transition-colors duration-300 inline-flex items-center justify-center"
            >
              Ask Questions
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.955 8.955 0 01-2.748-.424l-1.752 1.752A1 1 0 018 21l2.25-2.25C9.456 18.92 8.736 19 8 19a8 8 0 110-16 8 8 0 110 16z" />
              </svg>
            </Link>
          </div>
        </div>
      </motion.section>
    </motion.div>
  );
};

export default ServicesPage;