import './globals.css';
import type { ReactNode } from 'react';

export const metadata = {
    title: 'QR Ordering',
    description: 'Multi-tenant QR table ordering',
};

// Inline, blocking script — runs before first paint so there's no
// light-flash-then-dark flicker on load. Reads the same storage key
// lib/theme.ts uses, kept in sync manually since this can't import a module.
const themeInitScript = `
(function () {
  try {
    var stored = localStorage.getItem('qr-saas:theme');
    var theme = stored || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', theme === 'dark');
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: ReactNode }) {
    return (
        <html lang="en">
        <head>
            <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        </head>
        <body>{children}</body>
        </html>
    );
}