import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: 'rgb(var(--color-brand) / <alpha-value>)',
          fg: 'rgb(var(--color-brand-fg) / <alpha-value>)',
        },
      },
    },
  },
  plugins: [],
};

export default config;
