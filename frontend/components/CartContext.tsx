'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { getSessionToken } from '@/lib/session';

const API_URL = process.env.NEXT_PUBLIC_API_URL!;
const POLL_INTERVAL_MS = 3000; // shared cart — other devices at the table can add/remove any time

export interface SharedCartLine {
    id: string;
    menuItemId: string;
    name: string;
    photoUrl: string | null;
    isAvailable: boolean;
    quantity: number;
    note: string | null;
    addedByLabel: string | null;
    modifiers: { modifierOptionId: string; name: string; priceDeltaCents: number }[];
    unitPriceCents: number;
    lineTotalCents: number;
}

interface AddLineInput {
    menuItemId: string;
    quantity: number;
    note?: string;
    modifierOptionIds: string[];
}

interface CartContextValue {
    lines: SharedCartLine[];
    loading: boolean;
    guestName: string;
    setGuestName: (name: string) => void;
    addLine: (line: AddLineInput) => Promise<void>;
    updateQuantity: (itemId: string, quantity: number) => Promise<void>;
    updateNote: (itemId: string, note: string) => Promise<void>;
    removeLine: (itemId: string) => Promise<void>;
    refresh: () => Promise<void>;
    subtotalCents: number;
    count: number;
}

const CartContext = createContext<CartContextValue | null>(null);

function guestNameKey(token: string) {
    return `qr-saas:guest-name:${token}`;
}

export function CartProvider({ token, children }: { token: string; children: ReactNode }) {
    const [lines, setLines] = useState<SharedCartLine[]>([]);
    const [loading, setLoading] = useState(true);
    const [guestName, setGuestNameState] = useState('');

    useEffect(() => {
        setGuestNameState(localStorage.getItem(guestNameKey(token)) ?? '');
    }, [token]);

    function setGuestName(name: string) {
        setGuestNameState(name);
        localStorage.setItem(guestNameKey(token), name);
    }

    const refresh = useCallback(async () => {
        try {
            const res = await fetch(`${API_URL}/public/table-cart/${token}`);
            if (res.ok) setLines(await res.json());
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        refresh();
        const interval = setInterval(refresh, POLL_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [refresh]);

    async function addLine(line: AddLineInput) {
        if (!navigator.onLine) return;
        await fetch(`${API_URL}/public/table-cart`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tableToken: token,
                sessionToken: getSessionToken(token),
                addedByLabel: guestName || undefined,
                ...line,
            }),
        });
        await refresh();
    }

    async function updateQuantity(itemId: string, quantity: number) {
        if (!navigator.onLine) return;
        await fetch(`${API_URL}/public/table-cart/${token}/items/${itemId}?session=${getSessionToken(token)}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quantity }),
        });
        await refresh();
    }

    async function updateNote(itemId: string, note: string) {
        if (!navigator.onLine) return;
        await fetch(`${API_URL}/public/table-cart/${token}/items/${itemId}?session=${getSessionToken(token)}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ note }),
        });
        await refresh();
    }

    async function removeLine(itemId: string) {
        if (!navigator.onLine) return;
        await fetch(`${API_URL}/public/table-cart/${token}/items/${itemId}?session=${getSessionToken(token)}`, { method: 'DELETE' });
        await refresh();
    }

    const subtotalCents = lines.reduce((sum, l) => sum + l.lineTotalCents, 0);
    const count = lines.reduce((sum, l) => sum + l.quantity, 0);

    return (
        <CartContext.Provider
            value={{ lines, loading, guestName, setGuestName, addLine, updateQuantity, updateNote, removeLine, refresh, subtotalCents, count }}
        >
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const ctx = useContext(CartContext);
    if (!ctx) throw new Error('useCart must be used within CartProvider');
    return ctx;
}