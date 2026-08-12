'use client';

import { useEffect, useState } from 'react';
import { applyTheme, getStoredTheme, Theme } from '@/lib/theme';

export function ThemeToggle() {
    const [theme, setTheme] = useState<Theme>('light');

    useEffect(() => {
        const current = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
        setTheme(getStoredTheme() ?? current);
    }, []);

    function toggle() {
        const next: Theme = theme === 'dark' ? 'light' : 'dark';
        setTheme(next);
        applyTheme(next);
    }

    return (
        <button
            onClick={toggle}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="flex h-11 w-11 items-center justify-center rounded-md border border-gray-300 dark:border-gray-700"
        >
            {theme === 'dark' ? '☀️' : '🌙'}
        </button>
    );
}