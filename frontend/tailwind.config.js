/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: 'var(--bg-deep)',
          secondary: 'var(--bg-elevated)',
          tertiary: 'var(--bg-card)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary)',
        },
        accent: {
          DEFAULT: 'var(--champagne)',
          hover: 'var(--champagne-light)',
          bg: 'var(--champagne-muted)',
        },
        border: 'var(--border-subtle)',
        success: 'var(--trend-positive-text)',
        warning: 'var(--champagne)',
        danger: 'var(--trend-negative-text)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', 'sans-serif'],
        display: ['Playfair Display', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        'card': '16px',
        'btn': '12px',
        'tag': '6px',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('tailwindcss-animate'),
  ],
}
