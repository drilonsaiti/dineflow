'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { CartLine, loadCart, saveCart, cartSubtotalCents, cartCount } from '@/lib/cart';

interface CartContextValue {
    lines: CartLine[];
    addLine: (line: Omit<CartLine, 'lineId'>) => void;
    updateQuantity: (lineId: string, quantity: number) => void;
    updateNote: (lineId: string, note: string) => void;
    removeLine: (lineId: string) => void;
    removeMenuItemIds: (menuItemIds: string[]) => void; // used on "item no longer available"
    clear: () => void;
    subtotalCents: number;
    count: number;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ token, children }: { token: string; children: ReactNode }) {
    const [lines, setLines] = useState<CartLine[]>([]);
    const [hydrated, setHydrated] = useState(false);

    // Load once on mount (client-only — localStorage isn't available during SSR).
    useEffect(() => {
        setLines(loadCart(token));
        setHydrated(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    useEffect(() => {
        if (hydrated) saveCart(token, lines);
    }, [token, lines, hydrated]);

    function addLine(line: Omit<CartLine, 'lineId'>) {
        setLines((prev) => [...prev, { ...line, lineId: crypto.randomUUID() }]);
    }

    function updateQuantity(lineId: string, quantity: number) {
        setLines((prev) =>
            quantity <= 0
                ? prev.filter((l) => l.lineId !== lineId)
                : prev.map((l) => (l.lineId === lineId ? { ...l, quantity } : l)),
        );
    }

    function updateNote(lineId: string, note: string) {
        setLines((prev) => prev.map((l) => (l.lineId === lineId ? { ...l, note } : l)));
    }

    function removeLine(lineId: string) {
        setLines((prev) => prev.filter((l) => l.lineId !== lineId));
    }

    function removeMenuItemIds(menuItemIds: string[]) {
        setLines((prev) => prev.filter((l) => !menuItemIds.includes(l.menuItemId)));
    }

    function clear() {
        setLines([]);
    }

    return (
        <CartContext.Provider
            value={{
                lines,
                addLine,
                updateQuantity,
                updateNote,
                removeLine,
                removeMenuItemIds,
                clear,
                subtotalCents: cartSubtotalCents(lines),
                count: cartCount(lines),
            }}
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