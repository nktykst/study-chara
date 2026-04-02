import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0effb',
          100: '#e1dff7',
          200: '#c3beef',
          300: '#a59de7',
          400: '#877cdf',
          500: '#7F77DD',
          600: '#5e55c4',
          700: '#4840a3',
          800: '#332e72',
          900: '#1f1c45',
        },
      },
    },
  },
  plugins: [],
};

export default config;
