import "./globals.css";
import type { ReactNode } from "react";
import { ThemeProvider } from "@/components/ThemeProvider";
import {ToastProvider} from "@/components/ui/Toast";

export const metadata = {
    title: "QR Ordering",
    description: "Multi-tenant QR table ordering",
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
        </head>

        <body>
        <ThemeProvider>
            <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
        </body>
        </html>
    );
}