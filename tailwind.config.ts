import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#161B22',
          soft: '#2A323D',
          faint: '#5B6672',
        },
        surface: {
          DEFAULT: '#F6F5F2',
          card: '#FFFFFF',
          border: '#E4E1DA',
        },
        brass: {
          DEFAULT: '#A8823C',
          soft: '#C7A669',
          deep: '#7C5E28',
        },
        signal: {
          steady: '#2F5D62',
          attention: '#B5651D',
        },
      },
      fontFamily: {
        body: ['var(--font-body)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '6px',
        lg: '10px',
      },
    },
  },
  plugins: [],
};

export default config;
