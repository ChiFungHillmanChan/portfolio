/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0f1117',
          secondary: '#1a1d27',
          tertiary: '#13151c',
          dark: '#0a0b10',
        },
        border: {
          DEFAULT: '#2a2d3a',
          hover: '#4b5563',
        },
        accent: {
          indigo: '#6366f1',
          'indigo-light': '#a5b4fc',
          'indigo-hover': '#4f46e5',
          green: '#10B981',
          'green-light': '#34d399',
          amber: '#F59E0B',
          'amber-light': '#fbbf24',
          red: '#f87171',
        },
        text: {
          primary: '#ffffff',
          secondary: '#e0e0e0',
          muted: '#c0c4cc',
          dim: '#9ca3af',
          dimmer: '#6b7280',
          darkest: '#4b5563',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          '"PingFang HK"',
          '"Microsoft JhengHei"',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};
