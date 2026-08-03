/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#E3F2FD',
          100: '#BBDEFB',
          200: '#90CAF9',
          300: '#64B5F6',
          400: '#42A5F5',
          500: '#1565C0',
          600: '#1E88E5',
          700: '#1976D2',
          800: '#1565C0',
          900: '#0D47A1',
        },
        success: {
          50: '#E8F5E9',
          500: '#43A047',
          600: '#2E7D32',
          700: '#1B5E20',
        },
        warning: {
          500: '#FB8C00',
        },
        danger: {
          500: '#E53935',
        },
      },
    },
  },
  plugins: [],
}
