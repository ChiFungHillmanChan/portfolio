import React, { useState, useRef } from 'react';
import { FaEnvelope, FaLinkedin, FaGithub } from 'react-icons/fa';
import emailjs from '@emailjs/browser';
import { motion } from 'framer-motion';

const LoadingSpinner = () => (
  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
);

const Contact = () => {
  const form = useRef();
  const [status, setStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sendEmail = async (e) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    setIsSubmitting(true);

    try {
      await emailjs.sendForm(
        process.env.REACT_APP_SERVICE_ID,
        process.env.REACT_APP_TEMPLATE_ID,
        form.current,
        {
          publicKey: process.env.REACT_APP_PUBLIC_KEY,
        }
      );
      
      setStatus('success');
      form.current.reset();
    } catch (error) {
      setStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeMessage = () => setStatus('');

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { type: "spring", stiffness: 300, damping: 25 }
    }
  };

  return (
    <motion.section 
      className="container mx-auto px-4 py-8 md:py-12 max-w-6xl"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <motion.h2 
        className="text-2xl md:text-3xl font-bold mb-6 md:mb-8 dark:text-white text-center md:text-left"
        variants={itemVariants}
      >
        Get in Touch
      </motion.h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        {/* Left Side - Contact Info */}
        <motion.div 
          className="bg-white dark:bg-gray-700 rounded-lg shadow-md p-4 md:p-6"
          variants={itemVariants}
          whileHover={{ scale: 1.01 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <h3 className="text-xl md:text-2xl font-bold mb-4 dark:text-white">Let's Talk</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm md:text-base">
          I'm always on the lookout for opportunities to work on impactful projects, whether it’s with a company, a large-scale project, or freelance work. 
          Feel free to reach out if you're interested in collaborating or just want to chat about new ideas!
          </p>
          
          {/* Contact Links */}
          <div className="space-y-4">
            <motion.div 
              className="flex items-center space-x-3 group"
              whileHover={{ x: 5 }}
            >
              <FaEnvelope className="text-gray-600 dark:text-gray-400 text-xl" />
              <a 
                href="mailto:hillmanchan709@gmail.com" 
                className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white text-sm md:text-base break-all"
              >
                hillmanchan709@gmail.com
              </a>
            </motion.div>

            {/* Social Links */}
            <div className="flex items-center space-x-6 pt-4">
              <motion.a 
                href="https://www.linkedin.com/in/hillmanchan" 
                target="_blank" 
                rel="noopener noreferrer"
                whileHover={{ scale: 1.1 }}
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                <FaLinkedin size={28} />
              </motion.a>
              <motion.a 
                href="https://github.com/hillmanchan" 
                target="_blank" 
                rel="noopener noreferrer"
                whileHover={{ scale: 1.1 }}
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                <FaGithub size={28} />
              </motion.a>
            </div>
          </div>
        </motion.div>

        {/* Right Side - Contact Form */}
        <motion.div 
        className="bg-white dark:bg-gray-700 rounded-lg shadow-md p-4 md:p-6"
        variants={itemVariants}
      >
          <h3 className="text-xl md:text-2xl font-bold mb-4 dark:text-white">Contact Me</h3>
          <motion.form 
            ref={form} 
            onSubmit={sendEmail}
            className="space-y-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div>
              <label 
                htmlFor="name" 
                className="block text-gray-700 dark:text-gray-300 font-medium mb-2 text-sm"
              >
                Name
              </label>
              <input
                id="name"
                name="user_name"
                type="text"
                required
                disabled={isSubmitting}
                placeholder="Enter your name"
                className="w-full px-3 py-2 rounded-md bg-gray-100 dark:bg-gray-600 dark:text-white 
                        focus:outline-none focus:ring-2 focus:ring-gray-500 text-sm md:text-base
                        border border-gray-300 dark:border-gray-500
                        disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label 
                htmlFor="email" 
                className="block text-gray-700 dark:text-gray-300 font-medium mb-2 text-sm"
              >
                Email
              </label>
              <input
                id="email"
                name="user_email"
                type="email"
                required
                disabled={isSubmitting}
                placeholder="Enter your email"
                className="w-full px-3 py-2 rounded-md bg-gray-100 dark:bg-gray-600 dark:text-white 
                        focus:outline-none focus:ring-2 focus:ring-gray-500 text-sm md:text-base
                        border border-gray-300 dark:border-gray-500
                        disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label 
                htmlFor="message" 
                className="block text-gray-700 dark:text-gray-300 font-medium mb-2 text-sm"
              >
                Message
              </label>
              <textarea
                id="message"
                name="message"
                required
                disabled={isSubmitting}
                placeholder="Type your message"
                rows="4"
                className="w-full px-3 py-2 rounded-md bg-gray-100 dark:bg-gray-600 dark:text-white 
                        focus:outline-none focus:ring-2 focus:ring-gray-500 text-sm md:text-base
                        border border-gray-300 dark:border-gray-500
                        disabled:opacity-50 disabled:cursor-not-allowed"
              ></textarea>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full md:w-auto bg-gray-800 text-white px-6 py-2 rounded-md hover:bg-gray-700 
                      transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed
                      text-sm md:text-base flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner />
                  Sending...
                </>
              ) : (
                'Submit'
              )}
            </button>
          </motion.form>
        </motion.div>
      </div>

      {/* Success Modal */}
      {status === 'success' && (
        <motion.div 
          className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50 px-4 z-50"
          initial="hidden"
          animate="visible"
          variants={modalVariants}
        >
          <div className="bg-gray-600 text-white rounded-lg p-6 max-w-md w-full text-center">
            <p className="text-sm md:text-base">Your message has been successfully sent. I'll get back to you soon!</p>
            <button
              onClick={closeMessage}
              className="mt-4 px-4 py-2 bg-white text-gray-800 rounded hover:bg-gray-200 text-sm md:text-base"
            >
              Close
            </button>
          </div>
        </motion.div>
      )}

      {/* Error Modal */}
      {status === 'error' && (
        <motion.div 
          className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50 px-4 z-50"
          initial="hidden"
          animate="visible"
          variants={modalVariants}
        >
          <div className="bg-red-500 text-white rounded-lg p-6 max-w-md w-full text-center">
            <p className="text-sm md:text-base">Sorry, there was an issue sending your message. Please try reaching out via social media!</p>
            <button
              onClick={closeMessage}
              className="mt-4 px-4 py-2 bg-white text-gray-800 rounded hover:bg-gray-200 text-sm md:text-base"
            >
              Close
            </button>
          </div>
        </motion.div>
      )}
    </motion.section>
  );
};

export default Contact;