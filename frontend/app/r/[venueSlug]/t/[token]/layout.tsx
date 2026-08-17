'use client';

import {createContext, ReactNode, useContext, useState} from 'react';
import {useParams, usePathname} from 'next/navigation';
import Link from 'next/link';
import {Globe, Receipt} from 'lucide-react';

import {formatCents} from '@/lib/money';
import {CartProvider, useCart} from '@/components/CartContext';
import {HeaderCartLink} from '@/components/HeadCartLink';
import {ThemeToggle} from '@/components/ThemeToggle';
import {useOnlineStatus} from '@/lib/online-status';
import {useTableInfo} from '@/hooks/useTableInfo';
import {CustomerLocaleProvider} from '@/components/CustomerLocaleProvider';
import {useTranslations} from 'next-intl';

import {AVAILABLE_LANGUAGES} from '@/lib/languages';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/Select';

export interface TableInfo {
    table: {
        id: string;
        label: string;
    };
    venue: {
        slug: string;
        name: string;
        logoUrl: string | null;
        brandColor: string | null;
        currency: string;
        taxRatePercent: number | null;
        taxInclusive: boolean;
        supportedLanguages: string[];
    };
    area: {
        name: string;
    } | null;
    sessionToken: string;
}

const VenueCurrencyContext = createContext<string>('USD');

export function useVenueCurrencyPublic() {
    return useContext(VenueCurrencyContext);
}

const VenueTaxContext = createContext<{
    taxRatePercent: number | null;
    taxInclusive: boolean;
}>({
    taxRatePercent: null,
    taxInclusive: true,
});

export function useVenueTaxPublic() {
    return useContext(VenueTaxContext);
}

const VenueLanguagesContext = createContext<string[]>([]);

export function useVenueLanguagesPublic() {
    return useContext(VenueLanguagesContext);
}

const CustomerLangContext = createContext<{
    lang: string;
    setLang: (l: string) => void;
}>({
    lang: '',
    setLang: () => {},
});

export function useCustomerLang() {
    return useContext(CustomerLangContext);
}

export default function TableLayout({
                                        children,
                                    }: {
    children: ReactNode;
}) {
    const params = useParams<{
        venueSlug: string;
        token: string;
    }>();

    const {venueSlug, token} = params;

    const [lang, setLangState] = useState(() =>
        typeof window !== 'undefined'
            ? localStorage.getItem('qr-saas:lang') ?? ''
            : '',
    );

    function setLang(l: string) {
        setLangState(l);
        localStorage.setItem('qr-saas:lang', l);
    }

    return (
        <CustomerLangContext.Provider value={{lang, setLang}}>
            <CustomerLocaleProvider locale={lang || 'en'}>
                <TableLayoutContent
                    venueSlug={venueSlug}
                    token={token}
                >
                    {children}
                </TableLayoutContent>
            </CustomerLocaleProvider>
        </CustomerLangContext.Provider>
    );
}

function TableLayoutContent({
                                children,
                                venueSlug,
                                token,
                            }: {
    children: ReactNode;
    venueSlug: string;
    token: string;
}) {
    const online = useOnlineStatus();
    const t = useTranslations();

    const {data: info, error} = useTableInfo(token);

    if (error) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
                <p className="text-lg font-medium text-ink dark:text-white">
                    {(error as Error).message}
                </p>

                <p className="mt-2 text-sm text-muted">
                    {t('deactivated.askStaff')}
                </p>
            </div>
        );
    }

    if (!info) {
        return (
            <div className="flex min-h-screen items-center justify-center text-muted-soft">
                {t('menu.loading')}
            </div>
        );
    }

    return (
        <VenueCurrencyContext.Provider value={info.venue.currency}>
            <VenueTaxContext.Provider
                value={{
                    taxRatePercent: info.venue.taxRatePercent,
                    taxInclusive: info.venue.taxInclusive,
                }}
            >
                <VenueLanguagesContext.Provider
                    value={info.venue.supportedLanguages ?? []}
                >
                    <CartProvider token={token}>
                        <div
                            className="min-h-screen bg-canvas pb-24 dark:bg-surface-dark"
                            style={
                                {
                                    '--brand-color':
                                        info.venue.brandColor ?? '#EA580CFF',
                                } as React.CSSProperties
                            }
                        >
                            <header
                                className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 text-white shadow-elevated"
                                style={{
                                    backgroundColor: 'var(--brand-color)',
                                }}
                            >
                                <Link
                                    href={`/r/${venueSlug}/t/${token}`}
                                    className="flex min-w-0 items-center gap-3"
                                >
                                    {info.venue.logoUrl && (
                                        <img
                                            src={info.venue.logoUrl}
                                            alt={info.venue.name}
                                            className="h-8 w-8 rounded-full object-cover"
                                        />
                                    )}

                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold leading-tight">
                                            {info.venue.name}
                                        </p>

                                        <p className="truncate text-xs leading-tight opacity-90">
                                            {t('menu.orderingFor', {
                                                table: info.table.label,
                                            })}

                                            {info.area
                                                ? ` · ${info.area.name}`
                                                : ''}
                                        </p>
                                    </div>
                                </Link>

                                <div className="flex shrink-0 items-center gap-1.5">
                                    <HeaderLanguageSelector />

                                    <ThemeToggle />

                                    <HeaderCartLink
                                        venueSlug={venueSlug}
                                        token={token}
                                        info={info}
                                    />

                                    <Link
                                        href={`/r/${venueSlug}/t/${token}/tab`}
                                        className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white"
                                        aria-label={t('tab.title')}
                                    >
                                        <Receipt
                                            className="h-5 w-5"
                                            aria-hidden
                                        />
                                    </Link>
                                </div>
                            </header>

                            {!online && (
                                <div
                                    role="status"
                                    className="bg-amber-100 px-4 py-2 text-center text-sm text-amber-800"
                                >
                                    {t('offline.banner')}
                                </div>
                            )}

                            <main className="mx-auto max-w-2xl">
                                {children}
                            </main>

                            <CartBar
                                venueSlug={venueSlug}
                                token={token}
                                currency={info.venue.currency}
                            />
                        </div>
                    </CartProvider>
                </VenueLanguagesContext.Provider>
            </VenueTaxContext.Provider>
        </VenueCurrencyContext.Provider>
    );
}

function HeaderLanguageSelector() {
    const {lang, setLang} = useCustomerLang();
    const supportedLanguages = useVenueLanguagesPublic();

    if (supportedLanguages.length === 0) {
        return null;
    }

    return (
        <Select
            value={lang || 'en'}
            onValueChange={(value) => {
                setLang(value === 'en' ? '' : value);
            }}
        >
            <SelectTrigger
                aria-label="Language"
                className="h-11 w-auto min-w-[48px] gap-1 border-0 bg-white/15 px-2 text-white shadow-none hover:bg-white/20 focus:ring-0"
            >
                <Globe className="h-4 w-4 shrink-0" aria-hidden />

                <SelectValue />
            </SelectTrigger>

            <SelectContent>
                <SelectItem value="en">
                    EN
                </SelectItem>

                {supportedLanguages
                    .filter((code) => code !== 'en')
                    .map((code) => {
                        const label =
                            AVAILABLE_LANGUAGES.find(
                                (language) => language.code === code,
                            )?.code.toUpperCase() ?? code.toUpperCase();

                        return (
                            <SelectItem
                                key={code}
                                value={code}
                            >
                                {label}
                            </SelectItem>
                        );
                    })}
            </SelectContent>
        </Select>
    );
}

function CartBar({
                     venueSlug,
                     token,
                     currency,
                 }: {
    venueSlug: string;
    token: string;
    currency: string;
}) {
    const {count, subtotalCents} = useCart();
    const pathname = usePathname();
    const t = useTranslations('cart');

    const onCartPage = pathname?.endsWith('/cart');

    if (count === 0 || onCartPage) {
        return null;
    }

    return (
        <Link
            href={`/r/${venueSlug}/t/${token}/cart`}
            aria-live="polite"
            className="fixed inset-x-0 bottom-0 z-20 px-4 py-3 text-white shadow-[0_-2px_10px_rgba(0,0,0,0.15)]"
            style={{
                backgroundColor: 'var(--brand-color)',
            }}
        >
            <div className="mx-auto flex min-h-[44px] max-w-2xl items-center justify-between">
                <span className="font-medium">
                    {count === 1
                        ? t('viewCartOne', {count})
                        : t('viewCartMany', {count})}
                </span>

                <span className="font-semibold">
                    {formatCents(subtotalCents, currency)}
                </span>
            </div>
        </Link>
    );
}