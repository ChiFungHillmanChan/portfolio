import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import coachingData from '../../data/coachingData.json';

const CoachingPage = () => {
  const [timers, setTimers] = useState({});
  const sessions = useMemo(() => coachingData, []);

  useEffect(() => {
    // Initial calculation to avoid delay
    const calculateTimers = () => {
      const newTimers = {};
      sessions.forEach(coaching => {
        if (coaching.discountEndDate) {
          // Parse the date string properly
          const endTime = new Date(coaching.discountEndDate).getTime();
          const now = new Date().getTime();
          const timeLeft = endTime - now;
          
          if (timeLeft > 0) {
            const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
            const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
            
            newTimers[coaching.id] = { 
              days: Math.max(0, days), 
              hours: Math.max(0, hours), 
              minutes: Math.max(0, minutes), 
              seconds: Math.max(0, seconds), 
              expired: false 
            };
          } else {
            newTimers[coaching.id] = { 
              days: 0, 
              hours: 0, 
              minutes: 0, 
              seconds: 0, 
              expired: true 
            };
          }
        }
      });
      setTimers((prev) => {
        const nextKeys = Object.keys(newTimers);
        const hasKeyChange = nextKeys.length !== Object.keys(prev).length;
        if (hasKeyChange) {
          return newTimers;
        }

        // avoid unnecessary state updates when timers have not meaningfully changed
        const hasChanged = nextKeys.some((key) => {
          const prevTimer = prev[key];
          const nextTimer = newTimers[key];
          if (!prevTimer || !nextTimer) return true;
          return (
            prevTimer.days !== nextTimer.days ||
            prevTimer.hours !== nextTimer.hours ||
            prevTimer.minutes !== nextTimer.minutes ||
            prevTimer.seconds !== nextTimer.seconds ||
            prevTimer.expired !== nextTimer.expired
          );
        });

        return hasChanged ? newTimers : prev;
      });
    };

    // Calculate immediately
    calculateTimers();

    // Set up interval for updates
    const interval = setInterval(calculateTimers, 1000);

    // Cleanup interval on component unmount
    return () => clearInterval(interval);
  }, [sessions]);

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

  const getCategoryStyle = (category) => {
    const styles = {
      free: 'border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-800',
      standard: 'border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-800',
      premium: 'border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-800'
    };
    return styles[category] || 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800';
  };

  const getCategoryBadge = (category) => {
    const badges = {
      free: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
      standard: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
      premium: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
    };
    return badges[category] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
  };

  const formatPrice = (price) => {
    return price === 0 ? 'Free' : `£${price}`;
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
          Coaching Sessions
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
          Get personalized guidance in AI, programming, and career development through one-on-one coaching sessions tailored to your goals.
        </p>
      </motion.div>

      {/* Coaching Options */}
      <motion.section variants={itemVariants}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {sessions.map((coaching) => (
            <motion.div
              key={coaching.id}
              variants={itemVariants}
              whileHover={{ scale: 1.02, y: -5 }}
              className={`relative rounded-2xl shadow-lg overflow-hidden border-2 ${getCategoryStyle(coaching.category)} ${
                coaching.popular ? 'ring-2 ring-gray-400 ring-opacity-75' : ''
              } flex flex-col h-full`}
            >
              {/* Popular Badge */}
              {coaching.popular && (
                <div className="absolute top-4 right-4 z-10">
                  <span className="bg-gray-800 text-white px-3 py-1 rounded-full text-sm font-bold">
                    Popular
                  </span>
                </div>
              )}

              {/* Content */}
              <div className="p-6 flex flex-col h-full">
                {/* Category Badge */}
                <div className="mb-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getCategoryBadge(coaching.category)}`}>
                    {coaching.category}
                  </span>
                </div>

                {/* Title and Duration */}
                <h3 className="text-2xl font-bold mb-2 dark:text-white">
                  {coaching.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Duration: {coaching.duration}
                </p>

                {/* Description */}
                <p className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
                  {coaching.description}
                </p>

                {/* Features */}
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-800 dark:text-white mb-3">What's included:</h4>
                  <ul className="space-y-2">
                    {coaching.features.map((feature, index) => (
                      <li key={index} className="flex items-start text-sm text-gray-600 dark:text-gray-300">
                        <svg className="w-4 h-4 text-gray-600 dark:text-gray-400 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Spacer to push bottom elements to same level */}
                <div className="flex-grow"></div>

                {/* Bottom Section - Price, Timer, Button all aligned */}
                <div className="mt-auto flex flex-col gap-3">
                  {/* Pricing - ensure consistent height across cards */}
                  <div className="min-h-[70px] flex items-center justify-center text-center">
                    {coaching.discountPercentage > 0 ? (
                      <div className="flex items-center justify-center gap-2 flex-wrap">
                        <span className="text-2xl font-bold text-gray-800 dark:text-white">
                          {formatPrice(coaching.currentPrice)}
                        </span>
                        <span className="text-lg text-gray-500 dark:text-gray-400 line-through">
                          {formatPrice(coaching.originalPrice)}
                        </span>
                        <span className="bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-800 px-2 py-1 rounded-full text-sm font-medium">
                          {coaching.discountPercentage}% OFF
                        </span>
                      </div>
                    ) : (
                      <span className="text-3xl font-bold text-gray-800 dark:text-white">
                        {formatPrice(coaching.currentPrice)}
                      </span>
                    )}
                  </div>

                  {/* Countdown Timer - reserving space keeps buttons level */}
                  {coaching.discountPercentage > 0 && timers[coaching.id] && !timers[coaching.id].expired && (
                    <div className="flex items-center justify-center">
                      <div className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg p-2 text-center">
                        <p className="text-xs text-gray-700 dark:text-gray-300 font-medium mb-1">
                          Limited Time Offer!
                        </p>
                        <div className="text-sm text-gray-800 dark:text-white font-semibold">
                          {timers[coaching.id].days >= 30 
                            ? `${Math.floor(timers[coaching.id].days / 30)} month${Math.floor(timers[coaching.id].days / 30) > 1 ? 's' : ''} left`
                            : `${timers[coaching.id].days} day${timers[coaching.id].days !== 1 ? 's' : ''} left`
                          }
                        </div>
                      </div>
                    </div>
                  )}

                  {/* CTA Button - Fixed at bottom */}
                  <div>
                    <a
                      href={coaching.googleFormUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-gray-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-600 transition-colors duration-300 flex items-center justify-center group"
                    >
                      Learn More
                      <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-2M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* FAQ Section */}
      <motion.section variants={itemVariants} className="mt-16">
        <h2 className="text-3xl font-bold text-center mb-12 dark:text-white">
          Frequently Asked Questions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div className="bg-white dark:bg-gray-700 rounded-lg p-6 shadow-md">
            <h3 className="text-lg font-semibold mb-3 dark:text-white">
              How do I schedule a session?
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Simply click the "Learn More" button above, fill out the Google Form with your details and preferred times, and I'll get back to you within 24 hours to confirm.
            </p>
          </div>
          <div className="bg-white dark:bg-gray-700 rounded-lg p-6 shadow-md">
            <h3 className="text-lg font-semibold mb-3 dark:text-white">
              What platform do we use for sessions?
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              All sessions are conducted via Zoom. You'll receive a meeting link after booking confirmation.
            </p>
          </div>
          <div className="bg-white dark:bg-gray-700 rounded-lg p-6 shadow-md">
            <h3 className="text-lg font-semibold mb-3 dark:text-white">
              Can I reschedule a session?
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Yes! Please give at least 24 hours notice for rescheduling. Contact me directly through the provided channels.
            </p>
          </div>
          <div className="bg-white dark:bg-gray-700 rounded-lg p-6 shadow-md">
            <h3 className="text-lg font-semibold mb-3 dark:text-white">
              What if I'm not satisfied?
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Your satisfaction is my priority. If you're not happy with the session, we can discuss a follow-up or alternative solution.
            </p>
          </div>
        </div>
      </motion.section>

      {/* Contact CTA */}
      <motion.section variants={itemVariants} className="mt-16 text-center">
        <div className="bg-gradient-to-r from-gray-800 to-gray-600 dark:from-gray-700 dark:to-gray-800 rounded-2xl p-8 md:p-12">
          <h2 className="text-3xl font-bold text-white mb-4">
            Have Questions?
          </h2>
          <p className="text-gray-300 mb-6 text-lg max-w-2xl mx-auto">
            Not sure which coaching option is right for you? Let's have a quick chat to discuss your goals and find the perfect fit.
          </p>
          <Link 
            to="/contact"
            className="bg-white text-gray-800 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors duration-300 inline-flex items-center"
          >
            Get in Touch
            <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.955 8.955 0 01-2.748-.424l-1.752 1.752A1 1 0 018 21l2.25-2.25C9.456 18.92 8.736 19 8 19a8 8 0 110-16 8 8 0 110 16z" />
            </svg>
          </Link>
        </div>
      </motion.section>
    </motion.div>
  );
};

export default CoachingPage;
