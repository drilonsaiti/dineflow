// Integer-cents everywhere on the wire (section 18) — these helpers are the
// only place the UI converts to/from a human-typed decimal string.

export function formatCents(cents: number, currency = 'USD'): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
}

export function centsToInput(cents: number): string {
    return (cents / 100).toFixed(2);
}

export function inputToCents(value: string): number {
    const n = Number.parseFloat(value);
    return Number.isFinite(n) ? Math.round(n * 100) : 0;
}