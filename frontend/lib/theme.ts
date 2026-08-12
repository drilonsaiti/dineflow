export type Theme = 'light' | 'dark';

export function getStoredTheme(): Theme | null {
    if (typeof window === 'undefined') return null;
    return (localStorage.getItem('qr-saas:theme') as Theme) ?? null;
}

export function applyTheme(theme: Theme) {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('qr-saas:theme', theme);
}

export function initTheme() {
    const stored = getStoredTheme();
    const preferred =
        stored ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    applyTheme(preferred);
}