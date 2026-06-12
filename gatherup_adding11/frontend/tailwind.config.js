/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.5rem',
        '3xl': '1.75rem',
      },
      colors: {
        clay: {
          bg: '#FEF9F0',
          mist: '#F9F9FF',
          surface: '#FFFFFF',
          ink: '#1F2937',
          muted: '#6B7280',
          subtle: '#9CA3AF',
          border: '#E8E4DC',
          lilac: '#EDE9FE',
          cream: '#FFF7ED',
          mint: '#D1FAE5',
          peach: '#FFEDD5',
          primary: '#7C3AED',
          'primary-dark': '#6D28D9',
          secondary: '#F59E0B',
          accent: '#10B981',
          warmth: '#F97316',
        },
        brand: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#7c3aed',
          600: '#6d28d9',
          700: '#5b21b6',
          800: '#4c1d95',
          900: '#3b0764',
        },
        accent: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
        },
      },
      backgroundImage: {
        'hero-gradient':
          'linear-gradient(135deg, #7c3aed 0%, #a78bfa 42%, #f97316 100%)',
        'hero-soft':
          'linear-gradient(145deg, #fef9f0 0%, #ede9fe 45%, #fff7ed 100%)',
        'nav-gradient': 'linear-gradient(180deg, #ffffff 0%, #fef9f0 100%)',
        'card-wash':
          'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(254,249,240,0.6) 100%)',
      },
      boxShadow: {
        clay: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'clay-lg': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        'clay-inset':
          'inset 2px 2px 6px rgba(255, 255, 255, 0.85), inset -2px -2px 8px rgba(124, 58, 237, 0.06)',
        'clay-glow': '0 10px 40px -12px rgba(124, 58, 237, 0.28)',
      },
    },
  },
  plugins: [],
};
