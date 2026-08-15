// Draft cart + "rounds" (placed orders for this table visit) are kept in
// localStorage, keyed per table token — no customer account exists, so
// this browser's storage IS the cart (section 7). Cleared/rebuilt fresh
// each round: after an order is placed, the draft clears and its id is
// appended to the rounds list, per the "recommended" behavior in section 7
// (additional items become new order rounds tied to the same table visit,
// rather than one ever-growing cart).

export interface CartLineModifier {
    modifierOptionId: string;
    name: string;
    priceDeltaCents: number;
}

export interface CartLine {
    lineId: string; // client-generated, for React keys / removal — not sent to the API
    menuItemId: string;
    name: string;
    photoUrl: string | null;
    unitPriceCents: number; // base price + sum of modifier deltas for this exact selection
    quantity: number;
    note?: string;
    modifiers: CartLineModifier[];
}

function cartKey(token: string) {
    return `qr-saas:cart:${token}`;
}

function roundsKey(token: string) {
    return `qr-saas:rounds:${token}`;
}

export function loadCart(token: string): CartLine[] {
    if (typeof window === 'undefined') return [];
    try {
        return JSON.parse(localStorage.getItem(cartKey(token)) ?? '[]');
    } catch {
        return [];
    }
}

export function saveCart(token: string, lines: CartLine[]) {
    localStorage.setItem(cartKey(token), JSON.stringify(lines));
}

export function loadRounds(token: string): string[] {
    if (typeof window === 'undefined') return [];
    try {
        return JSON.parse(localStorage.getItem(roundsKey(token)) ?? '[]');
    } catch {
        return [];
    }
}

export function pushRound(token: string, orderId: string) {
    const rounds = loadRounds(token);
    localStorage.setItem(roundsKey(token), JSON.stringify([...rounds, orderId]));
}

export function cartSubtotalCents(lines: CartLine[]): number {
    return lines.reduce((sum, l) => sum + l.unitPriceCents * l.quantity, 0);
}

export function cartCount(lines: CartLine[]): number {
    return lines.reduce((sum, l) => sum + l.quantity, 0);
}