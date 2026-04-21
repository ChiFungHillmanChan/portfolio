/** @type {import('tailwindcss').Config} */
module.exports = {
  // Exclude node_modules under sub-apps (e.g. src/game/system-design/, which
  // is its own Vite project with its own Tailwind config + installed deps).
  // Without the negation, Tailwind tries to scan every .ts file under
  // src/game/system-design/node_modules — thousands of type-definition
  // files — and emits the "accidentally matching all of node_modules"
  // warning during the outer CRA build.
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    '!./src/**/node_modules/**',
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