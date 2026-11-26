import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)'],
        mono: ['var(--font-mono)'],
      },
      colors: {
        brand: {
          DEFAULT: 'var(--color-brand)',
          hover: 'var(--color-brand-hover)',
          pressed: 'var(--color-brand-pressed)',
          subtle: 'var(--color-brand-subtle)',
          'subtle-hover': 'var(--color-brand-subtle-hover)',
        },
        surface: {
          DEFAULT: 'var(--bg)',
          sunken: 'var(--bg-sunken)',
          column: 'var(--bg-column)',
          hover: 'var(--bg-hover)',
          pressed: 'var(--bg-pressed)',
          overlay: 'var(--bg-overlay)',
        },
        ink: {
          DEFAULT: 'var(--text)',
          subtle: 'var(--text-subtle)',
          subtlest: 'var(--text-subtlest)',
          disabled: 'var(--text-disabled)',
          inverse: 'var(--text-inverse)',
          link: 'var(--text-link)',
          danger: 'var(--text-danger)',
          success: 'var(--text-success)',
          warning: 'var(--text-warning)',
        },
        line: {
          DEFAULT: 'var(--border)',
          strong: 'var(--border-strong)',
          focus: 'var(--border-focus)',
          danger: 'var(--border-danger)',
        },
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
      },
      boxShadow: {
        raised: 'var(--shadow-raised)',
        overlay: 'var(--shadow-overlay)',
        drag: 'var(--shadow-drag)',
      },
    },
  },
  plugins: [],
};

export default config;
