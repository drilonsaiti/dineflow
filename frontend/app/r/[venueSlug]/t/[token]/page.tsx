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
    const [excludedAllergens, setExcludedAllergens] = useState<string[]>([]);
    const [requiredDietary, setRequiredDietary] = useState<string[]>([]);
    const [showFilters, setShowFilters] = useState(false);
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
            <div className="p-8 text-center text-muted">
                <p>Unable to load the menu.</p>
                <p className="mt-1 text-sm">{error}</p>
            </div>
        );
    }

    if (!menu) {
        return (
            <div className="p-8 text-center text-muted-soft">
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
            <div className="p-8 text-center text-muted">
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

    const allTags = menu
        ? Array.from(new Map(menu.categories.flatMap((c) => c.items.flatMap((i) => i.tags.map((t) => [t.tag.id, t.tag]))))).map(([, t]) => t)
        : [];
    const allergenTags = allTags.filter((t) => t.kind === 'allergen');
    const dietaryTags = allTags.filter((t) => t.kind === 'dietary');

    function itemPassesFilters(item: PublicMenuItem): boolean {
        const itemTagIds = item.tags.map((t) => t.tag.id);
        if (excludedAllergens.some((id) => itemTagIds.includes(id))) return false; // hide items containing any excluded allergen
        if (requiredDietary.length > 0 && !requiredDietary.every((id) => itemTagIds.includes(id))) return false; // require all selected dietary tags
        return true;
    }

    return (
        <div className="min-h-screen bg-canvas dark:bg-surface-dark">
            {/* Category navigation */}
            <div className="sticky top-[52px] z-10 flex gap-2 overflow-x-auto border-b border-hairline bg-canvas px-4 py-3 shadow-sm dark:border-gray-800 dark:bg-surface-dark">
                {menu.categories.map((category) => {
                    const isActive = activeCategory === category.id;
                    return (
                        <button
                            key={category.id}
                            type="button"
                            onClick={() => handleCategoryClick(category.id)}
                            className={`flex min-h-[44px] shrink-0 items-center rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                                isActive
                                    ? 'text-white'
                                    : 'border border-hairline bg-canvas text-body hover:bg-surface-card dark:border-gray-800 dark:bg-surface-dark-elevated dark:text-gray-300'
                            }`}
                            style={isActive ? { backgroundColor: 'var(--brand-color)' } : undefined}
                        >
                            {category.name}
                        </button>
                    );
                })}
            </div>

            {/* Menu */}
            <div className="space-y-8 px-4 py-4">
                {menu.categories.map((category) => (
                    <section
                        key={category.id}
                        id={`cat-${category.id}`}
                        className="scroll-mt-32"
                    >
                        <h2 className="text-lg">
                            {category.name}
                        </h2>

                        {category.description && (
                            <p className="mt-1 text-sm text-muted">
                                {category.description}
                            </p>
                        )}

                        <div className="mt-3 space-y-3">
                            {category.items.filter(itemPassesFilters).length === 0 && (excludedAllergens.length + requiredDietary.length) > 0 && (
                                <p className="text-sm text-gray-400">No items in this category match your filters.</p>
                            )}
                            {category.items.filter(itemPassesFilters).map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => {
                                        if (item.isAvailable) {
                                            setActiveItem(item);
                                        }
                                    }}
                                    disabled={!item.isAvailable}
                                    className={`flex w-full items-center gap-3 rounded-xl border border-hairline bg-canvas p-3 text-left transition dark:border-gray-800 dark:bg-surface-dark-elevated ${
                                        item.isAvailable
                                            ? 'active:scale-[0.99] hover:border-gray-300 dark:hover:border-gray-600'
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
                                            className="h-16 w-16 shrink-0 rounded-lg bg-surface-card dark:bg-surface-dark-elevated"
                                            aria-hidden="true"
                                        />
                                    )}

                                    {/* Content */}
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-medium text-ink dark:text-white">
                                            {item.name}
                                        </p>

                                        {item.description && (
                                            <p className="line-clamp-2 text-sm text-muted">
                                                {item.description}
                                            </p>
                                        )}

                                        <div className="mt-1 flex items-center gap-2">
                                            <span className="text-sm font-semibold text-ink dark:text-white">
                                                {formatCents(
                                                    item.priceCents,
                                                    menu.venue.currency
                                                )}
                                            </span>

                                            {!item.isAvailable && (
                                                <span className="text-xs font-medium text-error">
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

            {(allergenTags.length > 0 || dietaryTags.length > 0) && (
                <div className="px-4">
                    <button
                        onClick={() => setShowFilters((s) => !s)}
                        className="mt-2 flex min-h-[36px] items-center gap-1 rounded-full border border-gray-200 px-3 text-xs font-medium text-gray-600"
                    >
                        🔍 Dietary filters {(excludedAllergens.length + requiredDietary.length) > 0 && `(${excludedAllergens.length + requiredDietary.length})`}
                    </button>
                    {showFilters && (
                        <div className="mt-2 space-y-2 rounded-lg border border-gray-200 bg-white p-3">
                            {dietaryTags.length > 0 && (
                                <div>
                                    <p className="text-xs font-medium text-gray-500">Show only</p>
                                    <div className="mt-1 flex flex-wrap gap-1.5">
                                        {dietaryTags.map((tag) => (
                                            <button
                                                key={tag.id}
                                                onClick={() => setRequiredDietary((prev) => prev.includes(tag.id) ? prev.filter((id) => id !== tag.id) : [...prev, tag.id])}
                                                className={`rounded-full px-3 py-1 text-xs ${requiredDietary.includes(tag.id) ? 'bg-brand text-white' : 'bg-gray-100 text-gray-600'}`}
                                            >
                                                {tag.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {allergenTags.length > 0 && (
                                <div>
                                    <p className="text-xs font-medium text-gray-500">Exclude (allergens)</p>
                                    <div className="mt-1 flex flex-wrap gap-1.5">
                                        {allergenTags.map((tag) => (
                                            <button
                                                key={tag.id}
                                                onClick={() => setExcludedAllergens((prev) => prev.includes(tag.id) ? prev.filter((id) => id !== tag.id) : [...prev, tag.id])}
                                                className={`rounded-full px-3 py-1 text-xs ${excludedAllergens.includes(tag.id) ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600'}`}
                                            >
                                                {tag.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

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