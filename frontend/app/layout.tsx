import "./globals.css";
import type {ReactNode} from "react";
import {ThemeProvider} from "@/components/ThemeProvider";
import {ToastProvider} from "@/components/ui/Toast";
import {PWARegister} from '@/components/PWARegister';
import {QueryProvider} from "@/components/QueryProvider";

export const metadata = {
    title: 'Dineflow - QR Ordering',
    description: 'Multi-tenant QR table ordering',
    manifest: '/manifest.json',
};

const themeInitScript = `
(function () {
  try {
    var stored = localStorage.getItem("qr-saas:theme");
    var theme =
      stored ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light");

    document.documentElement.classList.toggle("dark", theme === "dark");
  } catch (e) {}
})();
`;

export default function RootLayout({
                                       children,
                                   }: {
    children: ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
        <head>
            <script
                dangerouslySetInnerHTML={{
                    __html: themeInitScript,
                }}
            />
            <PWARegister/>

            <link rel="apple-touch-icon" href="/icon-192.png"/>
            <meta name="theme-color" content="#111111"/>
        </head>

        <body>
        <QueryProvider>
            <ThemeProvider>
                <ToastProvider>
                    {children}
                </ToastProvider>
            </ThemeProvider>
        </QueryProvider>
        </body>
        </html>
    );
}