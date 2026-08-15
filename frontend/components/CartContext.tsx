'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
    useTableCart,
    useAddCartItem,
    useUpdateCartItem,
    useRemoveCartItem,
    SharedCartLine,
} from '@/hooks/useTableCart';

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
    subtotalCents: number;
    count: number;
}

const CartContext = createContext<CartContextValue | null>(null);

function guestNameKey(token: string) {
    return `qr-saas:guest-name:${token}`;
}

export function CartProvider({ token, children }: { token: string; children: ReactNode }) {
    const { data: lines = [], isLoading } = useTableCart(token);
    const addMutation = useAddCartItem(token);
    const updateMutation = useUpdateCartItem(token);
    const removeMutation = useRemoveCartItem(token);

    const [guestName, setGuestNameState] = useState('');
    useEffect(() => {
        setGuestNameState(localStorage.getItem(guestNameKey(token)) ?? '');
    }, [token]);

    function setGuestName(name: string) {
        setGuestNameState(name);
        localStorage.setItem(guestNameKey(token), name);
    }

    async function addLine(line: AddLineInput) {
        await addMutation.mutateAsync({ ...line, addedByLabel: guestName || undefined });
    }
    async function updateQuantity(itemId: string, quantity: number) {
        await updateMutation.mutateAsync({ itemId, quantity });
    }
    async function updateNote(itemId: string, note: string) {
        await updateMutation.mutateAsync({ itemId, note });
    }
    async function removeLine(itemId: string) {
        await removeMutation.mutateAsync(itemId);
    }

    const subtotalCents = lines.reduce((sum, l) => sum + l.lineTotalCents, 0);
    const count = lines.reduce((sum, l) => sum + l.quantity, 0);

    return (
        <CartContext.Provider
            value={{ lines, loading: isLoading, guestName, setGuestName, addLine, updateQuantity, updateNote, removeLine, subtotalCents, count }}
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