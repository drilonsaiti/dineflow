'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil } from 'lucide-react';
import { usePublicMenu } from '@/hooks/usePublicMenu';
import { useVenueBasics } from '@/hooks/useVenueBasics';
import { useTables } from '@/hooks/useTables';
import { useStaffPlaceOrder } from '@/hooks/useStaffPlaceOrder';
import { formatCents } from '@/lib/money';
import { useToast } from '@/components/ui/Toast';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/Dialog';

interface DraftLine {
    menuItemId: string;
    name: string;
    quantity: number;
    unitPriceCents: number;
    modifierOptionIds: string[];
    modifierNames: string[];
    note?: string;
}

// Groups a line by item + exact modifier combo, so "Margherita, no mods" and
// "Margherita, extra cheese" stay separate lines but tapping the same combo
// twice still increments quantity instead of duplicating the row.
function lineKey(menuItemId: string, modifierOptionIds: string[]) {
    return `${menuItemId}:${[...modifierOptionIds].sort().join(',')}`;
}

export default function TakeOrderPage({ params }: { params: Promise<{ venueId: string; tableId: string }> }) {
    const { venueId, tableId } = use(params);
    const router = useRouter();
    const showToast = useToast();

    const { data: venueBasics } = useVenueBasics(venueId);
    const { data: tables = [] } = useTables(venueId);
    const table = tables.find((t) => t.id === tableId);

    const { data: menu } = usePublicMenu(venueBasics?.slug ?? '');
    const placeOrderMutation = useStaffPlaceOrder(venueId);

    const [lines, setLines] = useState<DraftLine[]>([]);
    const [customerName, setCustomerName] = useState('');
    const [modifierItem, setModifierItem] = useState<any | null>(null);
    const [noteLineIndex, setNoteLineIndex] = useState<number | null>(null);

    function addLine(item: any, modifierOptionIds: string[], modifierNames: string[]) {
        const key = lineKey(item.id, modifierOptionIds);
        setLines((prev) => {
            const existing = prev.find((l) => lineKey(l.menuItemId, l.modifierOptionIds) === key && !l.note);
            if (existing) {
                return prev.map((l) => (l === existing ? { ...l, quantity: l.quantity + 1 } : l));
            }
            return [
                ...prev,
                {
                    menuItemId: item.id,
                    name: item.name,
                    quantity: 1,
                    unitPriceCents: item.priceCents,
                    modifierOptionIds,
                    modifierNames,
                },
            ];
        });
    }

    function addItem(item: any) {
        // Simple version: no modifier picker here, quantity 1 per tap, tap
        // again to increment — matches how a waiter actually works fastest
        // (rapid taps down a known menu), unlike the customer flow's more
        // deliberate per-item modal. Items WITH modifier groups open the
        // picker instead, since "large, extra cheese" can't be guessed from
        // a single tap.
        if (item.modifierGroups && item.modifierGroups.length > 0) {
            setModifierItem(item);
            return;
        }
        addLine(item, [], []);
    }

    function updateQuantity(index: number, delta: number) {
        setLines((prev) =>
            prev
                .map((l, i) => (i === index ? { ...l, quantity: l.quantity + delta } : l))
                .filter((l) => l.quantity > 0),
        );
    }

    function updateNote(index: number, note: string) {
        setLines((prev) => prev.map((l, i) => (i === index ? { ...l, note: note || undefined } : l)));
    }

    const totalCents = lines.reduce((sum, l) => sum + l.unitPriceCents * l.quantity, 0);
    const currency = venueBasics?.currency ?? 'USD';

    async function submit() {
        if (lines.length === 0) return;
        try {
            await placeOrderMutation.mutateAsync({
                tableId,
                customerName: customerName || undefined,
                items: lines.map((l) => ({
                    menuItemId: l.menuItemId,
                    quantity: l.quantity,
                    note: l.note,
                    modifiers: l.modifierOptionIds.map((id) => ({ modifierOptionId: id })),
                })),
            });
            showToast('Order placed', 'success');
            router.push(`/admin/${venueId}/dashboard`);
        } catch (err: unknown) {
            showToast(err instanceof Error ? err.message : 'Failed to place order', 'error');
        }
    }

    if (!menu) return <div className="p-8 text-muted-soft">Loading menu…</div>;

    return (
        <div className={`mx-auto max-w-2xl p-6 ${lines.length > 0 ? 'pb-64' : ''}`}>
            <h1 className="text-2xl">Take order — {table?.label ?? 'Table'}</h1>

            <input
                className="input mt-3"
                placeholder="Customer name (optional)"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
            />

            <div className="mt-6 space-y-6">
                {menu.categories.map((category: any) => (
                    <section key={category.id}>
                        <h2 className="text-sm font-semibold text-muted">{category.name}</h2>
                        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                            {category.items.filter((i: any) => i.isAvailable).map((item: any) => (
                                <button
                                    key={item.id}
                                    onClick={() => addItem(item)}
                                    className="min-h-[44px] rounded-lg border border-hairline p-3 text-left text-sm transition-colors hover:border-ink active:scale-[0.98] dark:border-gray-700 dark:hover:border-white"
                                >
                                    <p className="font-medium text-ink dark:text-white">
                                        {item.name}
                                        {item.modifierGroups?.length > 0 && (
                                            <span className="ml-1 text-xs text-muted-soft">•••</span>
                                        )}
                                    </p>
                                    <p className="text-muted">{formatCents(item.priceCents, currency)}</p>
                                </button>
                            ))}
                        </div>
                    </section>
                ))}
            </div>

            {lines.length > 0 && (
                <div className="fixed inset-x-0 bottom-0 border-t border-hairline bg-canvas p-4 shadow-[0_-2px_10px_rgba(0,0,0,0.15)] dark:border-gray-700 dark:bg-surface-dark">
                    <div className="mx-auto max-w-2xl">
                        <div className="max-h-40 space-y-1 overflow-y-auto">
                            {lines.map((line, i) => (
                                <div key={i} className="py-0.5">
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="min-w-0 flex-1">
                                            <span className="text-ink dark:text-white">{line.name}</span>
                                            {line.modifierNames.length > 0 && (
                                                <span className="text-muted"> ({line.modifierNames.join(', ')})</span>
                                            )}
                                        </div>
                                        <div className="flex shrink-0 items-center gap-1.5">
                                            <button
                                                onClick={() => setNoteLineIndex(i)}
                                                className="flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-surface-card dark:hover:bg-surface-dark-elevated"
                                                aria-label={`Add note to ${line.name}`}
                                            >
                                                <Pencil className="h-3.5 w-3.5" aria-hidden />
                                            </button>
                                            <button
                                                onClick={() => updateQuantity(i, -1)}
                                                className="flex h-11 w-11 items-center justify-center rounded-full border border-hairline text-ink dark:border-gray-700 dark:text-white"
                                                aria-label={`Decrease ${line.name}`}
                                            >
                                                −
                                            </button>
                                            <span className="w-4 text-center text-ink dark:text-white">{line.quantity}</span>
                                            <button
                                                onClick={() => updateQuantity(i, 1)}
                                                className="flex h-11 w-11 items-center justify-center rounded-full border border-hairline text-ink dark:border-gray-700 dark:text-white"
                                                aria-label={`Increase ${line.name}`}
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>
                                    {line.note && <p className="pl-0 text-xs text-warning">Note: {line.note}</p>}
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={submit}
                            disabled={placeOrderMutation.isPending}
                            className="btn-primary mt-3 w-full disabled:opacity-50"
                        >
                            {placeOrderMutation.isPending ? 'Placing…' : `Place order · ${formatCents(totalCents, currency)}`}
                        </button>
                    </div>
                </div>
            )}

            {modifierItem && (
                <ModifierPickerDialog
                    item={modifierItem}
                    currency={currency}
                    onClose={() => setModifierItem(null)}
                    onConfirm={(modifierOptionIds, modifierNames) => {
                        addLine(modifierItem, modifierOptionIds, modifierNames);
                        setModifierItem(null);
                    }}
                />
            )}

            {noteLineIndex !== null && (
                <NoteDialog
                    initialNote={lines[noteLineIndex]?.note ?? ''}
                    onClose={() => setNoteLineIndex(null)}
                    onSave={(note) => {
                        updateNote(noteLineIndex, note);
                        setNoteLineIndex(null);
                    }}
                />
            )}
        </div>
    );
}

// Fast modifier picker for the staff quick-order screen — no min/max
// validation, no photo, no description. A waiter already knows what the
// customer wants; this just needs to be quick to tap through.
function ModifierPickerDialog({
                                  item,
                                  currency,
                                  onClose,
                                  onConfirm,
                              }: {
    item: any;
    currency: string;
    onClose: () => void;
    onConfirm: (modifierOptionIds: string[], modifierNames: string[]) => void;
}) {
    const [selected, setSelected] = useState<Record<string, string[]>>({});

    function toggle(groupId: string, optionId: string, maxSelect: number) {
        setSelected((prev) => {
            const current = prev[groupId] ?? [];
            if (maxSelect === 1) {
                return { ...prev, [groupId]: current.includes(optionId) ? [] : [optionId] };
            }
            const next = current.includes(optionId)
                ? current.filter((id) => id !== optionId)
                : current.length < maxSelect
                    ? [...current, optionId]
                    : current;
            return { ...prev, [groupId]: next };
        });
    }

    function confirm() {
        const ids: string[] = [];
        const names: string[] = [];
        for (const group of item.modifierGroups) {
            for (const optionId of selected[group.id] ?? []) {
                const option = group.options.find((o: any) => o.id === optionId);
                if (option) {
                    ids.push(option.id);
                    names.push(option.name);
                }
            }
        }
        onConfirm(ids, names);
    }

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-h-[80vh] overflow-y-auto">
                <DialogTitle>{item.name}</DialogTitle>
                <p className="mt-1 text-sm text-muted">{formatCents(item.priceCents, currency)}</p>

                <div className="mt-4 space-y-4">
                    {item.modifierGroups.map((group: any) => (
                        <div key={group.id}>
                            <p className="text-sm font-medium text-ink dark:text-white">
                                {group.name}
                                {group.isRequired && <span className="ml-1 text-xs text-error">Required</span>}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                                {group.options.map((option: any) => {
                                    const checked = (selected[group.id] ?? []).includes(option.id);
                                    return (
                                        <button
                                            key={option.id}
                                            type="button"
                                            onClick={() => toggle(group.id, option.id, group.maxSelect)}
                                            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                                                checked
                                                    ? 'border-ink bg-ink text-white dark:border-white dark:bg-white dark:text-ink'
                                                    : 'border-hairline text-ink dark:border-gray-700 dark:text-white'
                                            }`}
                                        >
                                            {option.name}
                                            {option.priceDeltaCents > 0 && ` +${formatCents(option.priceDeltaCents, currency)}`}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-6 flex justify-end gap-2">
                    <button className="btn-secondary" onClick={onClose}>Cancel</button>
                    <button className="btn-primary" onClick={confirm}>Add to order</button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function NoteDialog({
                        initialNote,
                        onClose,
                        onSave,
                    }: {
    initialNote: string;
    onClose: () => void;
    onSave: (note: string) => void;
}) {
    const [note, setNote] = useState(initialNote);

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent>
                <DialogTitle>Note for the kitchen</DialogTitle>
                <textarea
                    className="input mt-3"
                    rows={2}
                    placeholder="No onions, extra spicy, etc."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    autoFocus
                />
                <div className="mt-4 flex justify-end gap-2">
                    <button className="btn-secondary" onClick={onClose}>Cancel</button>
                    <button className="btn-primary" onClick={() => onSave(note)}>Save</button>
                </div>
            </DialogContent>
        </Dialog>
    );
}