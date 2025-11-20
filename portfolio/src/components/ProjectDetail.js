import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import projectData from '../projectData.json';

const GAME_SUBDOMAIN_SLUGS = new Set(['chat-box', 'prompt-hunter', 'card-game']);

const resolveDemoLink = (demoUrl) => {
  if (!demoUrl || demoUrl === 'no-demo-url') {
    return { url: null, isInternal: false, isGameSubdomain: false };
  }

  const trimmed = demoUrl.trim();
  if (!trimmed) {
    return { url: null, isInternal: false, isGameSubdomain: false };
  }

  if (trimmed.startsWith('/')) {
    const normalized = trimmed.slice(1);
    if (GAME_SUBDOMAIN_SLUGS.has(normalized)) {
      return { url: trimmed, isInternal: true, isGameSubdomain: true };
    }
    return { url: trimmed, isInternal: true, isGameSubdomain: false };
  }

  const normalized = trimmed;
  if (GAME_SUBDOMAIN_SLUGS.has(normalized)) {
    return { url: `/${normalized}`, isInternal: true, isGameSubdomain: true };
  }

  return { url: trimmed, isInternal: false, isGameSubdomain: false };
};

const ProjectDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const project = useMemo(() => {
    const numericId = Number(id);
    return projectData.find((item) => item.id === numericId);
  }, [id]);

  const {
    url: resolvedDemoUrl,
    isInternal: isInternalDemoLink,
    isGameSubdomain,
  } = useMemo(() => resolveDemoLink(project?.demoUrl || null), [project?.demoUrl]);

  const [isVideoTooLong, setIsVideoTooLong] = useState(false);
  const [videoError, setVideoError] = useState(false);

  const posterSrc = useMemo(() => {
    if (!project?.image) return null;
    try {
      return require(`../assets/${project.image}`);
    } catch (error) {
      console.error('Unable to load project image:', error);
      return null;
    }
  }, [project?.image]);

  const videoSrc = useMemo(() => {
    if (!project || !project.liveDemo || project.liveDemo === 'no-demo' || project.liveDemo.trim() === '') {
      return null;
    }
    try {
      return require(`../assets/${project.liveDemo}`);
    } catch (error) {
      console.error('Unable to load project demo:', error);
      return null;
    }
  }, [project]);

  useEffect(() => {
    setIsVideoTooLong(false);
    setVideoError(false);
  }, [videoSrc]);

  const handleVideoMetadata = (event) => {
    const duration = event?.currentTarget?.duration;
    if (typeof duration === 'number' && duration > 60) {
      setIsVideoTooLong(true);
    }
  };

  const handleVideoError = () => {
    setVideoError(true);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.5,
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 }
    }
  };

  if (!project) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen flex items-center justify-center"
      >
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Project not found</h2>
          <button
            onClick={() => navigate('/projects')}
            className="bg-gray-800 text-white px-6 py-2 rounded-md hover:bg-gray-700 transition-colors duration-300"
          >
            Back
          </button>
        </div>
      </motion.div>
    );
  }

  // Check if project has a valid demo video
  const hasValidDemo = Boolean(videoSrc);
  // Check if project has valid source code
  const hasValidSourceCode = project.sourceCode && project.sourceCode !== 'no-source-code' && project.sourceCode.trim() !== '';
  
  // Check if project has valid demo URL
  const hasValidDemoUrl = Boolean(resolvedDemoUrl);
  const isInternalDemo = hasValidDemoUrl && isInternalDemoLink;
  const isGameProject = project.category === 'game';
  const demoCtaLabel = isGameProject ? 'Play Game' : 'Try Demo';

  const handleDemoNavigation = () => {
    if (!resolvedDemoUrl) {
      return;
    }

    if (isInternalDemo) {
      navigate(resolvedDemoUrl);
      return;
    }

    if (typeof window !== 'undefined') {
      window.location.href = resolvedDemoUrl;
    }
  };

  return (
    <motion.div 
      initial="hidden" 
      animate="visible" 
      variants={containerVariants} 
      className="container mx-auto px-4 py-12 max-w-7xl"
    >
      <motion.div 
        variants={itemVariants}
        className="mb-6 flex flex-col gap-3"
      >
        <motion.button
          variants={itemVariants}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate('/projects')}
          className="inline-flex items-center gap-2 w-fit rounded-full bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 px-3 py-1.5 text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-300"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
              clipRule="evenodd"
            />
          </svg>
          Back to Projects
        </motion.button>
        <motion.h1 
          variants={itemVariants}
          className="text-3xl md:text-4xl font-bold leading-tight dark:text-white"
        >
          {project.title}
        </motion.h1>
      </motion.div>

      {/* Main content grid with flex layout for equal heights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Left Section - Project Details */}
        <motion.div variants={itemVariants} className="flex flex-col h-full">
          <div className="bg-white dark:bg-gray-700 rounded-xl shadow-lg p-8 flex-grow">
            <motion.h2 variants={itemVariants} className="text-2xl font-semibold mb-4 dark:text-white">
              Project Overview
            </motion.h2>
            <motion.p variants={itemVariants} className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
              {project.fullDescription}
            </motion.p>
            
            <motion.div variants={itemVariants} className="space-y-4">
              <h3 className="text-xl font-semibold dark:text-white">Technical Details</h3>
              <div className="space-y-2">
                <p className="text-gray-700 dark:text-gray-300">
                  <span className="font-medium">Category:</span> {project.category}
                </p>
                {project.technologies && (
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Technologies:</span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {project.technologies.map((tech, index) => (
                        <motion.span
                          key={index}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.3, delay: index * 0.1 }}
                          className="bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-3 py-1 rounded-full text-sm"
                        >
                          {tech}
                        </motion.span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Right Section - Video/Image and Buttons */}
        <motion.div variants={itemVariants} className="flex flex-col h-full">
          <div className="bg-white dark:bg-gray-700 rounded-xl shadow-lg overflow-hidden flex-grow">
            <div className="h-full flex flex-col">
              <div className="aspect-w-16 aspect-h-9 flex-shrink-0">
                {hasValidDemo && !isVideoTooLong && !videoError ? (
                  <video
                    className="w-full h-full object-cover"
                    controls
                    preload="metadata"
                    poster={posterSrc || undefined}
                    onLoadedMetadata={handleVideoMetadata}
                    onError={handleVideoError}
                  >
                    <source src={videoSrc} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                ) : posterSrc ? (
                  <img
                    src={posterSrc}
                    alt={project.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-sm">
                    Preview not available
                  </div>
                )}
              </div>
              
              {/* Action Buttons */}
              <div className="p-8 flex-grow flex flex-col justify-end">
                {(isVideoTooLong || videoError) && hasValidDemo && (
                  <div className="mb-4 rounded-md bg-yellow-100 text-yellow-800 px-4 py-2 text-sm">
                    {isVideoTooLong
                      ? 'This demo exceeds 1 minute. Please upload a shorter clip to keep load times fast.'
                      : 'The demo video could not be loaded. Please verify the file path or format.'}
                  </div>
                )}
                <div className="space-y-3">
                  {/* Case 1: Only source code available */}
                  {hasValidSourceCode && !hasValidDemoUrl && (
                    <motion.a
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      href={project.sourceCode}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-gray-800 text-white px-6 py-3 rounded-md hover:bg-gray-500 transition-colors duration-300 text-center cursor-pointer w-full block"
                    >
                      View Source Code
                    </motion.a>
                  )}

                  {/* Case 2: Both source code and demo available */}
                  {hasValidSourceCode && hasValidDemoUrl && (
                    <>
                      <motion.a
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        href={project.sourceCode}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-gray-800 text-white px-6 py-3 rounded-md hover:bg-gray-500 transition-colors duration-300 text-center cursor-pointer w-full block"
                      >
                        View Source Code
                      </motion.a>
                      {(isInternalDemo || isGameSubdomain) ? (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={handleDemoNavigation}
                          className="bg-indigo-600 text-white px-6 py-3 rounded-md hover:bg-indigo-500 transition-colors duration-300 text-center cursor-pointer w-full block"
                        >
                          {demoCtaLabel}
                        </motion.button>
                      ) : (
                        <motion.a
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          href={resolvedDemoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-indigo-600 text-white px-6 py-3 rounded-md hover:bg-indigo-500 transition-colors duration-300 text-center cursor-pointer w-full block"
                        >
                          {demoCtaLabel}
                        </motion.a>
                      )}
                    </>
                  )}

                  {/* Case 3: Only demo available */}
                  {!hasValidSourceCode && hasValidDemoUrl && (
                    (isInternalDemo || isGameSubdomain) ? (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleDemoNavigation}
                        className="bg-indigo-600 text-white px-6 py-3 rounded-md hover:bg-indigo-500 transition-colors duration-300 text-center cursor-pointer w-full block"
                      >
                        {demoCtaLabel}
                      </motion.button>
                    ) : (
                      <motion.a
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        href={resolvedDemoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-indigo-600 text-white px-6 py-3 rounded-md hover:bg-indigo-500 transition-colors duration-300 text-center cursor-pointer w-full block"
                      >
                        {demoCtaLabel}
                      </motion.a>
                    )
                  )}

                  {/* Case 4: Neither available - show disabled button */}
                  {!hasValidSourceCode && !hasValidDemoUrl && (
                    <div className="bg-gray-400 text-gray-600 px-6 py-3 rounded-md text-center w-full cursor-not-allowed">
                      No Links Available
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default ProjectDetail;
