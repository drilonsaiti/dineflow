import './globals.css';
import type { ReactNode } from 'react';

export const metadata = {
    title: 'QR Ordering',
    description: 'Multi-tenant QR table ordering',
};

export default function RootLayout({ children }: { children: ReactNode }) {
    return (
        <html lang="en">
        <body>{children}</body>
        </html>
    );
}