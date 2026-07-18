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
        // A deliberately separate family from `signal` — attention means
        // "this deserves consideration," danger means "this action may
        // cause serious or irreversible consequences." A muted oxblood/
        // brick, not signal.attention's orange, so the two remain
        // distinguishable in meaning as well as appearance. Founder
        // decision, 2026-07-18 (D1.1 Implementation Plan refinements).
        danger: {
          DEFAULT: '#8C3A2E',
          deep: '#6B2C22',
          surface: '#F7ECEA',
        },
      },
      fontFamily: {
        body: ['var(--font-body)', 'sans-serif'],
        editorial: ['var(--font-editorial)', 'serif'],
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
