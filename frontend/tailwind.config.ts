import type {Config} from 'tailwindcss';

const config: Config = {
    darkMode: 'class',
    content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
    theme: {
        extend: {
            colors: {
                canvas: '#ffffff',
                ink: '#111111',
                primary: '#111111',
                'primary-active': '#242424',
                'brand-accent': '#3b82f6',
                body: '#374151',
                muted: '#6b7280',
                'muted-soft': '#898989',
                'surface-soft': '#f8f9fa',
                'surface-card': '#f5f5f5',
                'surface-strong': '#e5e7eb',
                'surface-dark': '#101010',
                'surface-dark-elevated': '#1a1a1a',
                hairline: '#e5e7eb',
                'hairline-soft': '#f3f4f6',
                success: '#10b981',
                warning: '#f59e0b',
                error: '#ef4444',
                'badge-orange': '#fb923c',
                'badge-pink': '#ec4899',
                'badge-violet': '#8b5cf6',
                'badge-emerald': '#34d399',
                'accent': '#EA580C',
                'accent-active': '#C2410C',
                'accent-soft': '#FFF1EA',
            },
            borderRadius: {
                xs: '4px',
                sm: '6px',
                md: '8px',
                lg: '12px',
                xl: '16px',
                pill: '9999px',
            },
            fontFamily: {
                display: ['"Cal Sans"', 'Inter', '-apple-system', 'sans-serif'],
                sans: ['Inter', '-apple-system', 'sans-serif'],
                mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
            },
            spacing: {
                section: '96px',
            },
            boxShadow: {
                card: '0 1px 2px rgba(0,0,0,0.05)',
                elevated: '0 4px 12px rgba(0,0,0,0.08)',
            },
        },
    },
    plugins: [require('tailwindcss-animate')],
};
export default config;