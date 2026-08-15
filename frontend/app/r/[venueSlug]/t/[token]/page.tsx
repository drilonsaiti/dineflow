'use client';

import {use, useState} from 'react';
import {usePublicMenu} from '@/hooks/usePublicMenu';
import {ItemDetailModal} from "@/components/ItemDetailModal";

interface MenuPageProps {
    params: Promise<{ venueSlug: string; token: string }>;
}

export interface PublicMenuItem {
    id: string;
    name: string;
    description: string | null;
    photoUrl: string | null;
    priceCents: number;
    isAvailable: boolean;
    tags: { tag: { id: string; label: string; kind: string } }[];
    modifierGroups: {
        id: string;
        name: string;
        isRequired: boolean;
        minSelect: number;
        maxSelect: number;
        options: { id: string; name: string; priceDeltaCents: number }[];
    }[];
}

export default function MenuPage({params}: MenuPageProps) {
    const {venueSlug} = use(params);
    const {data: menu, error} = usePublicMenu(venueSlug);

    const [activeItem, setActiveItem] = useState<PublicMenuItem | null>(null);
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [excludedAllergens, setExcludedAllergens] = useState<string[]>([]);
    const [requiredDietary, setRequiredDietary] = useState<string[]>([]);
    const [showFilters, setShowFilters] = useState(false);

    if (error) {
        return (
            <div className="p-8 text-center text-muted">
                <p>Unable to load the menu.</p>
                <p className="mt-1 text-sm">{(error as Error).message}</p>
            </div>
        );
    }

    if (!menu) return <div className="p-8 text-center text-muted-soft">Loading menu…</div>;

    if (menu.categories.length === 0 || menu.categories.every((c: any) => c.items.length === 0)) {
        return <div className="p-8 text-center text-muted">This menu isn't set up yet. Please check with staff.</div>;
    }

    // Lazily resolve which category tab is "active" the first time menu data
    // arrives — a derived default rather than a separate effect just to seed it.
    const effectiveActiveCategory = activeCategory ?? menu.categories[0]?.id ?? null;

    function handleCategoryClick(categoryId: string) {
        setActiveCategory(categoryId);
        document.getElementById(`cat-${categoryId}`)?.scrollIntoView({behavior: 'smooth', block: 'start'});
    }

    const allTags = Array.from(
        new Map(menu.categories.flatMap((c: any) => c.items.flatMap((i: any) => i.tags.map((t: any) => [t.tag.id, t.tag])))),
    ).map(([, t]) => t as { id: string; label: string; kind: string });
    const allergenTags = allTags.filter((t) => t.kind === 'allergen');
    const dietaryTags = allTags.filter((t) => t.kind === 'dietary');
    const activeFilterCount = excludedAllergens.length + requiredDietary.length;

    function itemPassesFilters(item: PublicMenuItem): boolean {
        const itemTagIds = item.tags.map((t) => t.tag.id);
        if (excludedAllergens.some((id) => itemTagIds.includes(id))) return false;
        if (requiredDietary.length > 0 && !requiredDietary.every((id) => itemTagIds.includes(id))) return false;
        return true;
    }

    return (
        <div>
            <div
                className="sticky top-[52px] z-10 flex gap-2 overflow-x-auto bg-canvas px-4 py-3 shadow-sm dark:bg-surface-dark">
                {menu.categories.map((c: any) => (
                    <button
                        key={c.id}
                        onClick={() => handleCategoryClick(c.id)}
                        className={`flex min-h-[44px] shrink-0 items-center rounded-full px-4 py-2 text-sm font-medium ${
                            effectiveActiveCategory === c.id ? 'bg-ink text-white dark:bg-white dark:text-ink' : 'border border-hairline bg-canvas dark:border-gray-700'
                        }`}
                    >
                        {c.name}
                    </button>
                ))}
            </div>

            {(allergenTags.length > 0 || dietaryTags.length > 0) && (
                <div className="px-4">
                    <button
                        onClick={() => setShowFilters((s) => !s)}
                        className="mt-2 flex min-h-[36px] items-center gap-1 rounded-full border border-hairline px-3 text-xs font-medium text-muted dark:border-gray-700"
                    >
                        🔍 Dietary filters {activeFilterCount > 0 && `(${activeFilterCount})`}
                    </button>
                    {showFilters && (
                        <div
                            className="mt-2 space-y-2 rounded-lg border border-hairline bg-canvas p-3 dark:border-gray-700 dark:bg-surface-dark-elevated">
                            {dietaryTags.length > 0 && (
                                <div>
                                    <p className="text-xs font-medium text-muted">Show only</p>
                                    <div className="mt-1 flex flex-wrap gap-1.5">
                                        {dietaryTags.map((tag) => (
                                            <button
                                                key={tag.id}
                                                onClick={() =>
                                                    setRequiredDietary((prev) => (prev.includes(tag.id) ? prev.filter((id) => id !== tag.id) : [...prev, tag.id]))
                                                }
                                                className={`rounded-full px-3 py-1 text-xs ${requiredDietary.includes(tag.id) ? 'bg-ink text-white dark:bg-white dark:text-ink' : 'bg-surface-strong text-muted dark:bg-gray-700'}`}
                                            >
                                                {tag.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {allergenTags.length > 0 && (
                                <div>
                                    <p className="text-xs font-medium text-muted">Exclude (allergens)</p>
                                    <div className="mt-1 flex flex-wrap gap-1.5">
                                        {allergenTags.map((tag) => (
                                            <button
                                                key={tag.id}
                                                onClick={() =>
                                                    setExcludedAllergens((prev) => (prev.includes(tag.id) ? prev.filter((id) => id !== tag.id) : [...prev, tag.id]))
                                                }
                                                className={`rounded-full px-3 py-1 text-xs ${excludedAllergens.includes(tag.id) ? 'bg-error text-white' : 'bg-surface-strong text-muted dark:bg-gray-700'}`}
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

            <div className="px-4 py-4 space-y-8">
                {menu.categories.map((category: any) => (
                    <section key={category.id} id={`cat-${category.id}`}>
                        <h2 className="text-lg font-display font-semibold">{category.name}</h2>
                        {category.description && <p className="text-sm text-muted">{category.description}</p>}
                        <div className="mt-3 space-y-3">
                            {category.items.filter(itemPassesFilters).length === 0 && activeFilterCount > 0 && (
                                <p className="text-sm text-muted-soft">No items in this category match your filters.</p>
                            )}
                            {category.items.filter(itemPassesFilters).map((item: PublicMenuItem) => (
                                <button
                                    key={item.id}
                                    onClick={() => item.isAvailable && setActiveItem(item)}
                                    disabled={!item.isAvailable}
                                    className={`flex w-full items-center gap-3 rounded-xl border border-hairline bg-canvas p-3 text-left dark:border-gray-700 dark:bg-surface-dark-elevated ${
                                        !item.isAvailable ? 'opacity-50' : 'active:scale-[0.99]'
                                    }`}
                                >
                                    {item.photoUrl ? (
                                        <img src={item.photoUrl} alt={item.name}
                                             className="h-16 w-16 shrink-0 rounded-lg object-cover"/>
                                    ) : (
                                        <div className="h-16 w-16 shrink-0 rounded-lg bg-surface-strong"/>
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-medium">{item.name}</p>
                                        {item.description &&
                                            <p className="line-clamp-2 text-sm text-muted">{item.description}</p>}
                                        <div className="mt-1 flex items-center gap-2">
                                            <span
                                                className="text-sm font-semibold">{(item.priceCents / 100).toFixed(2)}</span>
                                            {!item.isAvailable &&
                                                <span className="text-xs font-medium text-error">Unavailable</span>}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </section>
                ))}
            </div>

            {activeItem && (
                <ItemDetailModal item={activeItem} currency={menu.venue.currency} onClose={() => setActiveItem(null)}/>
            )}
        </div>
    );
}