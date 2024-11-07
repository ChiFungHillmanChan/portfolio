import React from 'react';
import { useNavigate } from 'react-router-dom';
import projectData from '../projectData.json';

const ProjectDetail = ({ id }) => {
  const navigate = useNavigate();
  // Find the project based on id
  const project = projectData.find(({id}) => id === id);
  // Handle case where project is not found
  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Project not found</h2>
          <button
            onClick={() => navigate('/portfolio')}
            className="bg-gray-800 text-white px-6 py-2 rounded-md hover:bg-gray-700 transition-colors duration-300"
          >
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-7xl">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Left Section - Project Details */}
        <div className="space-y-6">
          <h1 className="text-4xl font-bold mb-6 dark:text-white">{project.title}</h1>
          
          <div className="bg-white dark:bg-gray-700 rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-semibold mb-4 dark:text-white">Project Overview</h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
              {project.description}
            </p>
            
            {/* Technical Details Section */}
            <div className="space-y-4">
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
                        <span
                          key={index}
                          className="bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-3 py-1 rounded-full text-sm"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Section - Video and Buttons */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-700 rounded-xl shadow-lg overflow-hidden">
            <div className="aspect-w-16 aspect-h-9">
              <video
                className="w-full h-full object-cover"
                controls
                poster={require(`../assets/${project.image}`)}
              >
                <source src={project.videoUrl} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <a
              href={project.sourceCode}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gray-700 text-white px-6 py-3 rounded-md hover:bg-gray-500 transition-colors duration-300 text-center"
            >
              View Source Code
            </a>
            {project.liveDemo && (
              <a
                href={project.liveDemo}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors duration-300 text-center"
              >
                Live Demo
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Back Button */}
      <div className="mt-12 text-center">
        <button
          onClick={() => navigate('/projects')}
          className="bg-gray-700 text-white px-8 py-3 rounded-md hover:bg-gray-500 transition-colors duration-300 inline-flex items-center gap-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
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
        </button>
      </div>
    </div>
  );
};

export default ProjectDetail;