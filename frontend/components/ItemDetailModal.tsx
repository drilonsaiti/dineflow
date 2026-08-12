'use client';

import { useMemo, useState } from 'react';
import { useCart } from './CartContext';
import { formatCents } from '@/lib/money';
import {PublicMenuItem} from "@/types/menu";

export function ItemDetailModal({
                                    item,
                                    currency,
                                    onClose,
                                }: {
    item: PublicMenuItem;
    currency: string;
    onClose: () => void;
}) {
    const { addLine } = useCart();
    const [selected, setSelected] = useState<Record<string, string[]>>({}); // groupId -> optionIds
    const [quantity, setQuantity] = useState(1);
    const [note, setNote] = useState('');
    const [validationError, setValidationError] = useState<string | null>(null);

    const modifierDelta = useMemo(() => {
        return item.modifierGroups.reduce((sum, group) => {
            const chosenIds = selected[group.id] ?? [];
            const groupSum = group.options
                .filter((o) => chosenIds.includes(o.id))
                .reduce((s, o) => s + o.priceDeltaCents, 0);
            return sum + groupSum;
        }, 0);
    }, [selected, item.modifierGroups]);

    const unitPriceCents = item.priceCents + modifierDelta;

    function toggleOption(groupId: string, optionId: string, maxSelect: number) {
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

    function handleAdd() {
        // Required-group validation (section 5: required vs optional, min/max
        // selections) — enforced client-side before it ever reaches checkout.
        for (const group of item.modifierGroups) {
            const chosenCount = (selected[group.id] ?? []).length;
            if (chosenCount < group.minSelect) {
                setValidationError(`Please choose ${group.minSelect === 1 ? '' : `at least ${group.minSelect} `}${group.name.toLowerCase()}.`);
                return;
            }
        }

        const modifiers = item.modifierGroups.flatMap((group) =>
            (selected[group.id] ?? []).map((optionId) => {
                const option = group.options.find((o) => o.id === optionId)!;
                return { modifierOptionId: option.id, name: option.name, priceDeltaCents: option.priceDeltaCents };
            }),
        );

        addLine({
            menuItemId: item.id,
            name: item.name,
            photoUrl: item.photoUrl,
            unitPriceCents,
            quantity,
            note: note || undefined,
            modifiers,
        });
        onClose();
    }

    return (
        <div className="fixed inset-0 z-30 flex flex-col bg-white sm:items-center sm:justify-center sm:bg-black/50">
            <div className="flex h-full w-full flex-col overflow-y-auto bg-white sm:h-auto sm:max-h-[90vh] sm:max-w-md sm:rounded-2xl">
                <div className="relative">
                    {item.photoUrl ? (
                        <img src={item.photoUrl} alt={item.name} className="h-56 w-full object-cover" />
                    ) : (
                        <div className="h-40 w-full bg-gray-100" />
                    )}
                    <button
                        onClick={onClose}
                        className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-lg shadow"
                        aria-label="Close"
                    >
                        ✕
                    </button>
                </div>

                <div className="flex-1 px-5 py-4">
                    <h2 className="text-xl font-semibold">{item.name}</h2>
                    {item.description && <p className="mt-1 text-gray-600">{item.description}</p>}

                    {item.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                            {item.tags.map(({ tag }) => (
                                <span key={tag.id} className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600">
                  {tag.label}
                </span>
                            ))}
                        </div>
                    )}

                    <p className="mt-3 text-lg font-semibold">{formatCents(item.priceCents, currency)}</p>

                    {item.modifierGroups.map((group) => (
                        <div key={group.id} className="mt-5">
                            <div className="flex items-baseline justify-between">
                                <p className="font-medium">{group.name}</p>
                                <p className="text-xs text-gray-400">
                                    {group.isRequired ? 'Required' : 'Optional'}
                                    {group.maxSelect > 1 ? ` · up to ${group.maxSelect}` : ''}
                                </p>
                            </div>
                            <div className="mt-2 space-y-2">
                                {group.options.map((option) => {
                                    const checked = (selected[group.id] ?? []).includes(option.id);
                                    return (
                                        <button
                                            key={option.id}
                                            onClick={() => toggleOption(group.id, option.id, group.maxSelect)}
                                            className={`flex w-full min-h-[44px] items-center justify-between rounded-lg border px-3 py-2 text-left ${
                                                checked ? 'border-brand bg-brand/5' : 'border-gray-200'
                                            }`}
                                        >
                                            <span>{option.name}</span>
                                            <span className="text-sm text-gray-500">
                        {option.priceDeltaCents > 0
                            ? `+${formatCents(option.priceDeltaCents, currency)}`
                            : option.priceDeltaCents < 0
                                ? formatCents(option.priceDeltaCents, currency)
                                : ''}
                      </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}

                    <div className="mt-5">
                        <label className="text-sm font-medium">Note for the kitchen (optional)</label>
                        <textarea
                            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                            rows={2}
                            placeholder="No onions, extra spicy, etc."
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                        />
                    </div>

                    {validationError && <p className="mt-3 text-sm text-red-500">{validationError}</p>}
                </div>

                <div className="sticky bottom-0 flex items-center gap-3 border-t border-gray-100 bg-white px-5 py-4">
                    <div className="flex items-center rounded-full border border-gray-200">
                        <button
                            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                            className="flex h-11 w-11 items-center justify-center text-lg"
                            aria-label="Decrease quantity"
                        >
                            −
                        </button>
                        <span className="w-6 text-center font-medium">{quantity}</span>
                        <button
                            onClick={() => setQuantity((q) => q + 1)}
                            className="flex h-11 w-11 items-center justify-center text-lg"
                            aria-label="Increase quantity"
                        >
                            +
                        </button>
                    </div>
                    <button
                        onClick={handleAdd}
                        className="flex min-h-[44px] flex-1 items-center justify-center rounded-full bg-brand font-medium text-white"
                    >
                        Add to cart · {formatCents(unitPriceCents * quantity, currency)}
                    </button>
                </div>
            </div>
        </div>
    );
}