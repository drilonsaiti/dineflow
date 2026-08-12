'use client';

import { use,useEffect, useState } from 'react';
import { formatCents } from '@/lib/money';
import { ItemDetailModal } from '@/components/ItemDetailModal';
import {PublicMenu, PublicMenuItem} from "@/types/menu";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;



interface MenuPageProps {
    params: Promise<{
        venueSlug: string;
        token: string;
    }>;
}

export default function MenuPage({ params }: MenuPageProps) {
    const { venueSlug } = use(params);

    const [menu, setMenu] = useState<PublicMenu | null>(null);
    const [activeItem, setActiveItem] = useState<PublicMenuItem | null>(null);
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function loadMenu() {
            try {
                setError(null);

                const response = await fetch(
                    `${API_URL}/public/menu/${encodeURIComponent(venueSlug)}`
                );

                if (!response.ok) {
                    throw new Error('Failed to load menu');
                }

                const data: PublicMenu = await response.json();

                if (cancelled) return;

                setMenu(data);
                setActiveCategory(data.categories[0]?.id ?? null);
            } catch (err) {
                if (cancelled) return;

                setError(
                    err instanceof Error
                        ? err.message
                        : 'Failed to load menu'
                );
            }
        }

        loadMenu();

        return () => {
            cancelled = true;
        };
    }, [venueSlug]);

    if (error) {
        return (
            <div className="p-8 text-center text-gray-500">
                <p>Unable to load the menu.</p>
                <p className="mt-1 text-sm">{error}</p>
            </div>
        );
    }

    if (!menu) {
        return (
            <div className="p-8 text-center text-gray-400">
                Loading menu…
            </div>
        );
    }

    // Zero-menu-items edge case.
    if (
        menu.categories.length === 0 ||
        menu.categories.every((category) => category.items.length === 0)
    ) {
        return (
            <div className="p-8 text-center text-gray-500">
                This menu isn't set up yet. Please check with staff.
            </div>
        );
    }

    function handleCategoryClick(categoryId: string) {
        setActiveCategory(categoryId);

        document
            .getElementById(`cat-${categoryId}`)
            ?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            });
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Category navigation */}
            <div className="sticky top-[52px] z-10 flex gap-2 overflow-x-auto border-b border-gray-200 bg-gray-50 px-4 py-3 shadow-sm">
                {menu.categories.map((category) => (
                    <button
                        key={category.id}
                        type="button"
                        onClick={() => handleCategoryClick(category.id)}
                        className={`flex min-h-[44px] shrink-0 items-center rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                            activeCategory === category.id
                                ? 'bg-brand text-white'
                                : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900'
                        }`}
                    >
                        {category.name}
                    </button>
                ))}
            </div>

            {/* Menu */}
            <div className="space-y-8 px-4 py-4">
                {menu.categories.map((category) => (
                    <section
                        key={category.id}
                        id={`cat-${category.id}`}
                        className="scroll-mt-32"
                    >
                        <h2 className="text-lg font-semibold">
                            {category.name}
                        </h2>

                        {category.description && (
                            <p className="mt-1 text-sm text-gray-500">
                                {category.description}
                            </p>
                        )}

                        <div className="mt-3 space-y-3">
                            {category.items.map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => {
                                        if (item.isAvailable) {
                                            setActiveItem(item);
                                        }
                                    }}
                                    disabled={!item.isAvailable}
                                    className={`flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 text-left transition dark:border-gray-800 dark:bg-gray-900 ${
                                        item.isAvailable
                                            ? 'active:scale-[0.99] hover:border-gray-300'
                                            : 'cursor-not-allowed opacity-50'
                                    }`}
                                >
                                    {/* Image */}
                                    {item.photoUrl ? (
                                        <img
                                            src={item.photoUrl}
                                            alt={item.name}
                                            className="h-16 w-16 shrink-0 rounded-lg object-cover"
                                        />
                                    ) : (
                                        <div
                                            className="h-16 w-16 shrink-0 rounded-lg bg-gray-100"
                                            aria-hidden="true"
                                        />
                                    )}

                                    {/* Content */}
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-medium">
                                            {item.name}
                                        </p>

                                        {item.description && (
                                            <p className="line-clamp-2 text-sm text-gray-500">
                                                {item.description}
                                            </p>
                                        )}

                                        <div className="mt-1 flex items-center gap-2">
                                            <span className="text-sm font-semibold">
                                                {formatCents(
                                                    item.priceCents,
                                                    menu.venue.currency
                                                )}
                                            </span>

                                            {!item.isAvailable && (
                                                <span className="text-xs font-medium text-red-500">
                                                    Unavailable
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </section>
                ))}
            </div>

            {/* Item details */}
            {activeItem && (
                <ItemDetailModal
                    item={activeItem}
                    currency={menu.venue.currency}
                    onClose={() => setActiveItem(null)}
                />
            )}
        </div>
    );
}