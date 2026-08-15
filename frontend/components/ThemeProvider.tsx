'use client';

import {createContext, ReactNode, useContext, useEffect, useState} from 'react';
import {applyTheme, getStoredTheme, Theme} from '@/lib/theme';

interface ThemeContextValue {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({children}: { children: ReactNode }) {
    // Light on first render (server + client) so hydration matches.
    // The inline script in layout.tsx already sets the real class on
    // <html> before paint, so there's no flash — this just syncs state.
    const [theme, setThemeState] = useState<Theme>('light');

    useEffect(() => {
        const stored = getStoredTheme();
        const current = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
        setThemeState(stored ?? current);
    }, []);

    function setTheme(next: Theme) {
        setThemeState(next);
        applyTheme(next);
    }

    function toggleTheme() {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    }

    return (
        <ThemeContext.Provider value={{theme, setTheme, toggleTheme}}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
    return ctx;
}