/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Sora', 'sans-serif'],
      },
      colors: {
        bg: '#0f0f11',
        surface: '#17171b',
        border: '#2a2a32',
        muted: '#4a4a58',
        text: '#e8e8f0',
        sub: '#8888a0',
        accent: '#7dba28',
        'accent-dim': '#3fb16f',
        error: '#e05a5a',
        success: '#5ae08a',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'slide-up': { from: { opacity: '0', transform: 'translateY(20px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'scale-in': { from: { opacity: '0', transform: 'scale(0.95)' }, to: { opacity: '1', transform: 'scale(1)' } },
        'blink': { '0%,100%': { opacity: '1' }, '50%': { opacity: '0' } },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease forwards',
        'slide-up': 'slide-up 0.5s ease forwards',
        'scale-in': 'scale-in 0.3s ease forwards',
        'blink': 'blink 1s step-end infinite',
      },
    },
  },
  plugins: [],
};
