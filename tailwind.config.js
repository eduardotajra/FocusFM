/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        skin: {
          base: 'var(--bg-app)',
          card: 'var(--bg-card)',
          'card-hover': 'var(--bg-card-hover)',
          border: 'var(--border-color)',
          accent: 'var(--accent)',
          'accent-dark': 'var(--accent-dark)',
          'accent-text': 'var(--accent-text)',
          text: 'var(--text-primary)',
          muted: 'var(--text-secondary)',
          secondary: 'var(--secondary)',
          warning: 'var(--warning)',
          'warning-bg': 'var(--warning-bg)',
          'warning-border': 'var(--warning-border)',
          error: 'var(--error)',
          'error-bg': 'var(--error-bg)',
          'error-border': 'var(--error-border)',
          success: 'var(--success)',
          'success-bg': 'var(--success-bg)',
          'success-border': 'var(--success-border)',
        },
      },
      boxShadow: {
        'theme': '0 10px 15px -3px var(--shadow), 0 4px 6px -2px var(--shadow)',
      },
      borderRadius: {
        button: 'var(--border-radius)',
      },
      backdropBlur: {
        glass: '12px',
      },
    },
  },
  plugins: [],
}
