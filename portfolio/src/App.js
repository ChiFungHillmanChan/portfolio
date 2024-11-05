import React from 'react';

// Skill data
const skills = [
  { category: 'Frontend', skills: ['HTML', 'CSS', 'JavaScript', 'React', 'Vue', 'Angular'] },
  { category: 'Backend', skills: ['Node.js', 'Python', 'Java', 'Ruby on Rails'] },
  { category: 'Databases', skills: ['MySQL', 'PostgreSQL', 'MongoDB', 'Redis'] },
  { category: 'Tools', skills: ['Git', 'Docker', 'Kubernetes', 'AWS', 'Azure'] }
];

const PortfolioWebsite = () => {
  return (
    <div className="bg-gray-200 text-gray-800 font-sans">
      {/* Header/Home */}
      <header className="bg-gray-200 py-20 px-8 flex flex-col items-center">
        <img src="/api/placeholder/200/200" alt="Profile" className="rounded-full mb-4" />
        <h1 className="text-4xl font-bold mb-2">Hillman</h1>
        <p className="text-lg text-gray-600">Fullstack Developer</p>
        <button className="mt-6 bg-purple-blue text-white px-6 py-3 rounded-md hover:bg-purple-600 transition-colors">
          Learn More
        </button>
      </header>

      {/* About */}
      <section id="about" className="bg-gray-200 py-16 px-8">
        <h2 className="text-3xl font-bold mb-4 text-purple-blue">About Me</h2>
        <p className="text-gray-700 mb-4">
          Hi, I'm Hillman, a passionate fullstack developer with a strong background in web technologies. I'm driven by
          my love for coding and creating innovative solutions. In my free time, you can find me exploring the great
          outdoors, reading about the latest tech trends, or experimenting with new recipes in the kitchen.
        </p>
        <div className="flex items-center space-x-4">
          <span className="text-purple-blue">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
              {/* SVG content */}
            </svg>
          </span>
          {/* Other icons */}
        </div>
      </section>

      {/* Projects */}
      <section className="bg-gray-200 py-16 px-8">
        <h2 className="text-3xl font-bold mb-4 text-purple-blue">My Projects</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
          <div className="bg-white rounded-md shadow-md hover:shadow-lg transition-shadow">
            <img src="/api/placeholder/400/300" alt="Project 1" className="rounded-t-md" />
            <div className="p-4">
              <h3 className="text-xl font-bold text-purple-blue mb-2">Project 1</h3>
              <p className="text-gray-700 mb-4">A brief description of the project goes here.</p>
              <div className="flex space-x-2 mb-4">
                <span className="bg-purple-blue text-white px-2 py-1 rounded-md">React</span>
                <span className="bg-purple-blue text-white px-2 py-1 rounded-md">Node.js</span>
                <span className="bg-purple-blue text-white px-2 py-1 rounded-md">MongoDB</span>
              </div>
              <div className="flex justify-end space-x-2">
                <a href="#" className="text-purple-blue hover:text-purple-600 transition-colors">
                  View Live
                </a>
                <a href="#" className="text-purple-blue hover:text-purple-600 transition-colors">
                  View Code
                </a>
              </div>
            </div>
          </div>
          {/* Add more project cards here */}
        </div>
      </section>

      {/* Skills */}
      <section className="bg-gray-200 py-16 px-8">
        <h2 className="text-3xl font-bold mb-4 text-purple-blue">My Skills</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {skills.map(({ category, skills }) => (
            <div key={category} className="bg-white rounded-md shadow-md p-4">
              <h3 className="text-lg font-bold text-purple-blue mb-2">{category}</h3>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <span
                    key={skill}
                    className="bg-purple-blue text-white px-2 py-1 rounded-md hover:bg-purple-600 transition-colors"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="bg-gray-200 py-16 px-8">
        <h2 className="text-3xl font-bold mb-4 text-purple-blue">Contact Me</h2>
        <form className="max-w-md mx-auto">
          <div className="mb-4">
            <label htmlFor="name" className="block text-gray-700 font-bold mb-2">
              Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              className="bg-white border border-gray-400 rounded-md py-2 px-3 text-gray-700 focus:outline-none focus:ring focus:border-purple-blue"
              required
            />
          </div>
          <div className="mb-4">
            <label htmlFor="email" className="block text-gray-700 font-bold mb-2">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              className="bg-white border border-gray-400 rounded-md py-2 px-3 text-gray-700 focus:outline-none focus:ring focus:border-purple-blue"
              required
            />
          </div>
          <div className="mb-4">
            <label htmlFor="message" className="block text-gray-700 font-bold mb-2">
              Message
            </label>
            <textarea
              id="message"
              name="message"
              rows={5}
              className="bg-white border border-gray-400 rounded-md py-2 px-3 text-gray-700 focus:outline-none focus:ring focus:border-purple-blue"
              required
            ></textarea>
          </div>
          <button
            type="submit"
            className="bg-purple-blue text-white px-6 py-3 rounded-md hover:bg-purple-600 transition-colors"
          >
            Send Message
          </button>
        </form>
        <div className="mt-8 flex justify-center space-x-4">
          <a href="#" className="text-purple-blue hover:text-purple-600 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
              {/* SVG content */}
            </svg>
          </a>
          {/* Other social links */}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-200 py-8 px-8 text-center">
        <p className="text-gray-700">© 2023 Hillman. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default PortfolioWebsite;