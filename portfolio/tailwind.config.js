/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      margin:{
        '103':'103px',
      },
      colors: {
        'purple-blue': '#6B72E1',
      },
    },
  },
  plugins: [],
}