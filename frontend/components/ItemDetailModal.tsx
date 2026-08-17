'use client';

import {useEffect, useMemo, useRef, useState} from 'react';
import {X} from 'lucide-react';
import {useTranslations} from 'next-intl';
import {useCart} from './CartContext';
import {formatCents} from '@/lib/money';
import {PublicMenuItem} from '@/types/menu';

export function ItemDetailModal({
                                    item,
                                    currency,
                                    onClose,
                                }: {
    item: PublicMenuItem;
    currency: string;
    onClose: () => void;
}) {
    const {addLine} = useCart();
    const t = useTranslations('itemDetail');

    const [selected, setSelected] = useState<Record<string, string[]>>({});
    const [quantity, setQuantity] = useState(1);
    const [note, setNote] = useState('');
    const [validationError, setValidationError] = useState<string | null>(null);

    const dialogRef = useRef<HTMLDivElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        closeButtonRef.current?.focus();

        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape') {
                onClose();
                return;
            }

            if (e.key !== 'Tab' || !dialogRef.current) return;

            const focusable =
                dialogRef.current.querySelectorAll<HTMLElement>(
                    'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])',
                );

            if (focusable.length === 0) return;

            const first = focusable[0];
            const last = focusable[focusable.length - 1];

            if (
                e.shiftKey &&
                document.activeElement === first
            ) {
                e.preventDefault();
                last.focus();
            } else if (
                !e.shiftKey &&
                document.activeElement === last
            ) {
                e.preventDefault();
                first.focus();
            }
        }

        document.addEventListener('keydown', handleKeyDown);

        return () =>
            document.removeEventListener(
                'keydown',
                handleKeyDown,
            );

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const modifierDelta = useMemo(() => {
        return item.modifierGroups.reduce((sum, group) => {
            const chosenIds = selected[group.id] ?? [];

            const groupSum = group.options
                .filter((option) =>
                    chosenIds.includes(option.id),
                )
                .reduce(
                    (subtotal, option) =>
                        subtotal + option.priceDeltaCents,
                    0,
                );

            return sum + groupSum;
        }, 0);
    }, [selected, item.modifierGroups]);

    const unitPriceCents =
        item.priceCents + modifierDelta;

    function toggleOption(
        groupId: string,
        optionId: string,
        maxSelect: number,
    ) {
        setSelected((prev) => {
            const current = prev[groupId] ?? [];

            if (maxSelect === 1) {
                return {
                    ...prev,
                    [groupId]: current.includes(optionId)
                        ? []
                        : [optionId],
                };
            }

            const next = current.includes(optionId)
                ? current.filter((id) => id !== optionId)
                : current.length < maxSelect
                    ? [...current, optionId]
                    : current;

            return {
                ...prev,
                [groupId]: next,
            };
        });
    }

    async function handleAdd() {
        setValidationError(null);

        for (const group of item.modifierGroups) {
            const chosenCount =
                (selected[group.id] ?? []).length;

            if (chosenCount < group.minSelect) {
                setValidationError(
                    group.minSelect === 1
                        ? t('choose', {
                            group: group.name.toLowerCase(),
                        })
                        : t('chooseAtLeast', {
                            n: group.minSelect,
                            group: group.name.toLowerCase(),
                        }),
                );

                return;
            }
        }

        const modifierOptionIds =
            item.modifierGroups.flatMap(
                (group) => selected[group.id] ?? [],
            );

        try {
            await addLine({
                menuItemId: item.id,
                quantity,
                note: note || undefined,
                modifierOptionIds,
            });

            onClose();
        } catch (err: any) {
            setValidationError(
                err?.message ?? t('addError'),
            );
        }
    }

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="item-detail-title"
            className="fixed inset-0 z-30 flex flex-col bg-canvas dark:bg-surface-dark sm:items-center sm:justify-center sm:bg-black/50"
        >
            <div
                ref={dialogRef}
                className="flex h-full w-full flex-col overflow-y-auto bg-canvas dark:bg-surface-dark-elevated sm:h-auto sm:max-h-[90vh] sm:max-w-md sm:rounded-2xl"
            >
                <div className="relative">
                    {item.photoUrl && (
                        <img
                            src={item.photoUrl}
                            alt={item.name}
                            className="h-56 w-full object-cover"
                        />
                    )}

                    <button
                        ref={closeButtonRef}
                        onClick={onClose}
                        className={`absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full shadow-elevated ${
                            item.photoUrl
                                ? 'bg-white/90 dark:bg-surface-dark-elevated/90'
                                : 'bg-surface-card dark:bg-surface-dark-elevated'
                        }`}
                        aria-label={t('close')}
                    >
                        <X
                            className="h-5 w-5 text-ink dark:text-white"
                            aria-hidden
                        />
                    </button>
                </div>

                <div className="flex-1 px-5 py-4">
                    <h2
                        id="item-detail-title"
                        className="text-xl text-ink dark:text-white"
                    >
                        {item.name}
                    </h2>

                    {item.description && (
                        <p className="mt-1 text-body dark:text-gray-300">
                            {item.description}
                        </p>
                    )}

                    {item.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                            {item.tags.map(({tag}) => (
                                <span
                                    key={tag.id}
                                    className="badge-pill"
                                >
                                    {tag.label}
                                </span>
                            ))}
                        </div>
                    )}

                    <p className="mt-3 text-lg font-semibold text-ink dark:text-white">
                        {formatCents(
                            item.priceCents,
                            currency,
                        )}
                    </p>

                    {item.modifierGroups.map((group) => (
                        <div
                            key={group.id}
                            className="mt-5"
                        >
                            <div className="flex items-baseline justify-between">
                                <p className="font-medium text-ink dark:text-white">
                                    {group.name}
                                </p>

                                <p className="text-xs text-muted-soft">
                                    {group.isRequired
                                        ? t('required')
                                        : t('optional')}

                                    {group.maxSelect > 1
                                        ? ` · ${t('upTo', {
                                            n: group.maxSelect,
                                        })}`
                                        : ''}
                                </p>
                            </div>

                            <div className="mt-2 space-y-2">
                                {group.options.map(
                                    (option) => {
                                        const checked = (
                                            selected[
                                                group.id
                                                ] ?? []
                                        ).includes(
                                            option.id,
                                        );

                                        return (
                                            <button
                                                key={option.id}
                                                onClick={() =>
                                                    toggleOption(
                                                        group.id,
                                                        option.id,
                                                        group.maxSelect,
                                                    )
                                                }
                                                className={`flex w-full min-h-[44px] items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors ${
                                                    checked
                                                        ? ''
                                                        : 'border-hairline dark:border-gray-700'
                                                }`}
                                                style={
                                                    checked
                                                        ? {
                                                            borderColor:
                                                                'var(--brand-color, #EA580C)',
                                                            backgroundColor:
                                                                'color-mix(in srgb, var(--brand-color, #EA580C) 10%, transparent)',
                                                        }
                                                        : undefined
                                                }
                                            >
                                                <span className="text-ink dark:text-white">
                                                    {
                                                        option.name
                                                    }
                                                </span>

                                                <span className="text-sm text-muted">
                                                    {option.priceDeltaCents >
                                                    0
                                                        ? `+${formatCents(
                                                            option.priceDeltaCents,
                                                            currency,
                                                        )}`
                                                        : option.priceDeltaCents <
                                                        0
                                                            ? formatCents(
                                                                option.priceDeltaCents,
                                                                currency,
                                                            )
                                                            : ''}
                                                </span>
                                            </button>
                                        );
                                    },
                                )}
                            </div>
                        </div>
                    ))}

                    <div className="mt-5">
                        <label className="text-sm font-medium text-ink dark:text-white">
                            {t('noteLabel')}
                        </label>

                        <textarea
                            className="input mt-1"
                            rows={2}
                            placeholder={t(
                                'notePlaceholder',
                            )}
                            value={note}
                            onChange={(e) =>
                                setNote(e.target.value)
                            }
                        />
                    </div>

                    {validationError && (
                        <p className="mt-3 text-sm text-error">
                            {validationError}
                        </p>
                    )}
                </div>

                <div className="sticky bottom-0 flex items-center gap-3 border-t border-hairline-soft bg-canvas px-5 py-4 dark:border-gray-800 dark:bg-surface-dark-elevated">
                    <div className="flex items-center rounded-full border border-hairline dark:border-gray-700">
                        <button
                            onClick={() =>
                                setQuantity((q) =>
                                    Math.max(1, q - 1),
                                )
                            }
                            className="flex h-11 w-11 items-center justify-center text-lg text-ink dark:text-white"
                            aria-label={t(
                                'decreaseQuantity',
                            )}
                        >
                            −
                        </button>

                        <span className="w-6 text-center font-medium text-ink dark:text-white">
                            {quantity}
                        </span>

                        <button
                            onClick={() =>
                                setQuantity((q) => q + 1)
                            }
                            className="flex h-11 w-11 items-center justify-center text-lg text-ink dark:text-white"
                            aria-label={t(
                                'increaseQuantity',
                            )}
                        >
                            +
                        </button>
                    </div>

                    <button
                        onClick={handleAdd}
                        className="flex min-h-[44px] flex-1 items-center justify-center rounded-full text-sm font-semibold text-white transition-colors"
                        style={{
                            backgroundColor:
                                'var(--brand-color, #EA580C)',
                        }}
                    >
                        {t('addToCart', {
                            price: formatCents(
                                unitPriceCents * quantity,
                                currency,
                            ),
                        })}
                    </button>
                </div>
            </div>
        </div>
    );
}