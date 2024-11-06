import React , { useState, useRef }from 'react';
import { FaEnvelope, FaLinkedin, FaGithub } from 'react-icons/fa';
import emailjs from '@emailjs/browser'

const Contact = () => {
    const form = useRef();

    const sendEmail = (e) => {
        e.preventDefault();

        emailjs
        .sendForm('service_gc2e006', 'template_hbmi8n6', form.current, {
            publicKey: 'tAF6uPWQu6pBX3SG9',
        })
        .then(
            (result) => {
                console.log(result.text)
                console.log('SUCCESS!');
            },
            (error) => {
                console.log('FAILED...', error.text);
            },
        );
    };

  return (
    <section className="container mx-auto py-12">
      <h2 className="text-3xl font-bold mb-8 dark:text-white">Get in Touch</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Side */}
        <div className="bg-white dark:bg-gray-700 rounded-md shadow-md p-6">
          <h3 className="text-2xl font-bold mb-4 dark:text-white">Let's Talk</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            I'm always excited to discuss new ideas, collaborate on projects, or just chat about the latest
            advancements in technology. Feel free to reach out using the contact form or my social media links.
          </p>
          <div className="flex items-center space-x-4 mb-6">
            <FaEnvelope className="text-gray-600 dark:text-gray-400" />
            <a href="mailto:hillmanchan709@gmail.com" className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                hillmanchan709@gmail.com
            </a>
          </div>
          <div className="flex items-center space-x-4">
            <a href="https://www.linkedin.com/in/hillmanchan" target="_blank" rel="noopener noreferrer" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
              <FaLinkedin size={24} />
            </a>
            <a href="https://github.com/hillmanchan" target="_blank" rel="noopener noreferrer" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
              <FaGithub size={24} />
            </a>
          </div>
        </div>

        {/* Right Side */}
        <div className="bg-white dark:bg-gray-700 rounded-md shadow-md p-6">
          <h3 className="text-2xl font-bold mb-4 dark:text-white">Contact Me</h3>
          <form ref={form} onSubmit={sendEmail}>
            <div className="mb-4">
              <label htmlFor="name" className="block text-gray-700 dark:text-gray-300 font-medium mb-2">
                Name
              </label>
              <input
                id="name"
                name="user_name"
                type="text"
                placeholder="Enter your name"
                className="w-full px-3 py-2 rounded-md bg-gray-200 dark:bg-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-500"
              />
            </div>
            <div className="mb-4">
              <label htmlFor="email" className="block text-gray-700 dark:text-gray-300 font-medium mb-2">
                Email
              </label>
              <input
                id="email"
                name="user_email"
                type="email"
                placeholder="Enter your email"
                className="w-full px-3 py-2 rounded-md bg-gray-200 dark:bg-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-500"
              />
            </div>
            <div className="mb-4">
              <label htmlFor="message" className="block text-gray-700 dark:text-gray-300 font-medium mb-2">
                Message
              </label>
              <textarea
                id="message"
                name="message"
                placeholder="Type your message"
                className="w-full px-3 py-2 rounded-md bg-gray-200 dark:bg-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-500"
              ></textarea>
            </div>
            <button
              type="submit"
              className="bg-gray-800 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors duration-300"
            >
              Submit
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default Contact;