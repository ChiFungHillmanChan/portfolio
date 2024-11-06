import React, { useState } from 'react';
import { motion } from 'framer-motion';
import blogData from './blogData.json';

const Blogs = () => {
  const [activeCategory, setActiveCategory] = useState('all');
  const filteredBlogs = activeCategory === 'all' ? blogData : blogData.filter(blog => blog.category === activeCategory);

  // Categories for filtering
  const categories = ['all', 'books', 'youtube', 'articles'];

  return (
    <>
      {/* Blog Display */}
      <section className="container mx-auto py-12">
        <h2 className="text-3xl font-bold mb-8 dark:text-white">Topics I'd Like to Share</h2>
        <div className="mb-8">
          {categories.map(category => (
            <button
              key={category}
              className={`px-4 py-2 rounded-md mr-2 ${
                activeCategory === category
                  ? 'bg-gray-800 text-white'
                  : 'bg-gray-200 dark:bg-gray-600 dark:text-white'
              }`}
              onClick={() => setActiveCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredBlogs.map(blog => (
            <motion.div
              key={blog.id}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="bg-white dark:bg-gray-700 rounded-md shadow-md overflow-hidden"
            >
              <img src={require(`../assets/${blog.image}`)} alt={blog.title} className="w-full h-48 object-cover" />
              <div className="p-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-xl font-bold">{blog.title}</h3>
                  <span className="text-gray-500 dark:text-gray-400 text-sm">{blog.date}</span>
                </div>
                <p className="text-gray-600 dark:text-gray-400 mb-4">{blog.description}</p>
                <a href={blog.url} target="_blank" rel="noopener noreferrer" className="bg-gray-800 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors duration-300">
                  Read More
                </a>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    </>
  );
};

export default Blogs;