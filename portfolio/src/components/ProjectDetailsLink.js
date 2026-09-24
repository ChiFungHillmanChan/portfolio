import React from 'react';
import { Link } from 'react-router-dom';

const ProjectDetailsLink = ({ project }) => {
  const unavailable = project.category === 'none';
  const className = `w-full px-4 py-2 rounded-md flex items-center justify-center gap-2
    ${unavailable
      ? 'bg-gray-700 cursor-not-allowed text-gray-200'
      : 'bg-gray-800 text-white hover:bg-gray-600 transition-colors duration-300'}`;
  const content = (
    <>
      <span>View Details</span>
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 5l7 7-7 7"
        />
      </svg>
    </>
  );

  return unavailable ? (
    <button type="button" disabled className={className}>
      {content}
    </button>
  ) : (
    <Link to={`/project/${project.id}`} aria-label={`View details for ${project.title}`} className={className}>
      {content}
    </Link>
  );
};

export default ProjectDetailsLink;
