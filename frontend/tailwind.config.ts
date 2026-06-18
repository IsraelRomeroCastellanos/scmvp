/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
    './src/pages/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          black: '#0A0A0A',
          silver: '#CFCFCF',
          graphite: '#5C5C5C',
          elevated: '#171717',
        },
        app: '#F4F4F4',
        surface: {
          DEFAULT: '#FFFFFF',
          muted: '#ECECEC',
        },
        text: {
          primary: '#171717',
          secondary: '#5C5C5C',
          dark: '#F5F5F5',
          'dark-muted': '#A3A3A3',
        },
        border: {
          light: '#D4D4D4',
          dark: '#404040',
        },
        semantic: {
          success: '#15803D',
          'success-bg': '#F0FDF4',
          warning: '#B45309',
          'warning-bg': '#FFFBEB',
          danger: '#B91C1C',
          'danger-bg': '#FEF2F2',
          info: '#1D4ED8',
          'info-bg': '#EFF6FF',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Arial', 'Helvetica', 'sans-serif'],
      },
      borderRadius: {
        control: '0.5rem',
        card: '0.75rem',
        panel: '1rem',
      },
      boxShadow: {
        card: '0 1px 2px rgba(10, 10, 10, 0.06), 0 8px 24px rgba(10, 10, 10, 0.05)',
        float: '0 18px 50px rgba(10, 10, 10, 0.18)',
        'inner-soft': 'inset 0 1px 2px rgba(10, 10, 10, 0.04)',
      },
    },
  },
  plugins: [],
};
