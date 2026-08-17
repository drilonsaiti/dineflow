'use client';

import { NextIntlClientProvider } from 'next-intl';
import { ReactNode, useEffect, useState } from 'react';

const messageCache: Record<string, any> = {};

async function loadMessages(locale: string) {
    if (messageCache[locale]) return messageCache[locale];
    const messages = (await import(`../i18n/locales/${locale}.json`)).default;
    messageCache[locale] = messages;
    return messages;
}

/** Client-side locale provider for the customer-facing flow — this app's
 * customer pages are all 'use client', so rather than restructure every
 * route under a server-rendered [locale] segment, the UI-string locale is
 * driven the same way menu-content language already is: read from
 * localStorage, applied at runtime. Falls back to English messages while
 * a non-English bundle is loading, rather than rendering blank. */
export function CustomerLocaleProvider({ locale, children }: { locale: string; children: ReactNode }) {
    const [messages, setMessages] = useState<any>(() => messageCache['en'] ?? null);

    useEffect(() => {
        loadMessages(locale).then(setMessages);
    }, [locale]);

    useEffect(() => {
        loadMessages('en'); // always warm the English fallback
    }, []);

    if (!messages) return null;

    return (
        <NextIntlClientProvider locale={locale} messages={messages}>
            {children}
        </NextIntlClientProvider>
    );
}