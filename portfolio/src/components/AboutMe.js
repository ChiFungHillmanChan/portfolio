import React from 'react';

const AboutMe = () => {
  const stories = [
    {
      title: "But, I wanted more.",
      description: "Though I loved the freedom of academic practice, I was greatly dissatisfied with just how slow the industry actually moved.",
      image: "/api/placeholder/600/400",
      alt: "Professional workspace illustration"
    },
    {
      title: "The Journey Continues",
      description: "I wanted to push my design craft at a faster pace and have a positive impact on vastly more people.",
      image: "/api/placeholder/600/400",
      alt: "Journey illustration"
    }
  ];

  const education = [
    {
      degree: "Bachelor of Computer Science",
      school: "University of Leeds",
      year: "2021 - 2024",
      description: "Focus on Software Engineering and Web Development"
    }
    // Add more education items as needed
  ];

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Hero Section */}
      <section className="mb-16">
        <h1 className="text-4xl md:text-5xl font-bold mb-6 dark:text-white">
          About Me
        </h1>
        <div className="bg-white dark:bg-gray-700 rounded-lg shadow-lg p-8">
          <p className="text-xl md:text-2xl text-gray-700 dark:text-gray-200 leading-relaxed">
            Hi, I'm Hillman Chan – a passionate developer with a deep love for creating 
            innovative web solutions. I blend technical expertise with creative design 
            thinking to build seamless user experiences.
          </p>
        </div>
      </section>

      {/* Story Section */}
      <section className="mb-16">
        <h2 className="text-3xl font-bold mb-8 dark:text-white">My Journey</h2>
        <div className="space-y-16">
          {stories.map((story, index) => (
            <div 
              key={index} 
              className={`flex flex-col ${index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'} 
                gap-8 items-center`}
            >
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
            </div>
          ))}
        </div>
      </section>

      {/* Education Section */}
      <section>
        <h2 className="text-3xl font-bold mb-8 dark:text-white">Education</h2>
        <div className="grid gap-6">
          {education.map((edu, index) => (
            <div 
              key={index}
              className="bg-white dark:bg-gray-700 rounded-lg shadow-lg p-6 
                transform transition duration-300 hover:scale-102"
            >
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
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default AboutMe;