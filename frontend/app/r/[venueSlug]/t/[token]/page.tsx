'use client';

import {use, useState} from 'react';
import {SlidersHorizontal, Globe, UtensilsCrossed} from 'lucide-react';
import {useTranslations} from 'next-intl';
import {usePublicMenu} from '@/hooks/usePublicMenu';
import {ItemDetailModal} from '@/components/ItemDetailModal';
import {formatCents} from '@/lib/money';
import {useCustomerLang, useVenueLanguagesPublic} from './layout';
import {AVAILABLE_LANGUAGES} from '@/lib/languages';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/Select';
import {Popover, PopoverContent, PopoverTrigger} from "@/components/Popover";

interface MenuPageProps {
    params: Promise<{venueSlug: string; token: string}>;
}

export interface PublicMenuItem {
    id: string;
    name: string;
    description: string | null;
    photoUrl: string | null;
    priceCents: number;
    isAvailable: boolean;
    tags: {
        tag: {
            id: string;
            label: string;
            kind: string;
        };
    }[];
    modifierGroups: {
        id: string;
        name: string;
        isRequired: boolean;
        minSelect: number;
        maxSelect: number;
        options: {
            id: string;
            name: string;
            priceDeltaCents: number;
        }[];
    }[];
}

export default function MenuPage({params}: MenuPageProps) {
    const {venueSlug} = use(params);

    const {lang, setLang: changeLang} = useCustomerLang();
    const t = useTranslations();

    const {data: menu, error} = usePublicMenu(
        venueSlug,
        lang || undefined
    );

    const supportedLanguages = useVenueLanguagesPublic();

    const [activeItem, setActiveItem] = useState<PublicMenuItem | null>(null);
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [excludedAllergens, setExcludedAllergens] = useState<string[]>([]);
    const [requiredDietary, setRequiredDietary] = useState<string[]>([]);

    if (error) {
        return (
            <div className="p-8 text-center text-muted">
                <p>{t('menu.unableToLoad')}</p>
                <p className="mt-1 text-sm">
                    {(error as Error).message}
                </p>
            </div>
        );
    }

    if (!menu) {
        return (
            <div className="p-8 text-center text-muted-soft">
                {t('menu.loading')}
            </div>
        );
    }

    if (
        menu.categories.length === 0 ||
        menu.categories.every((c: any) => c.items.length === 0)
    ) {
        return (
            <div className="p-8 text-center text-muted">
                {t('menu.notSetUp')}
            </div>
        );
    }

    const effectiveActiveCategory =
        activeCategory ?? menu.categories[0]?.id ?? null;

    function handleCategoryClick(categoryId: string) {
        setActiveCategory(categoryId);

        document
            .getElementById(`cat-${categoryId}`)
            ?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            });
    }

    const allTags = Array.from(
        new Map(
            menu.categories.flatMap((c: any) =>
                c.items.flatMap((i: any) =>
                    i.tags.map((t: any) => [t.tag.id, t.tag])
                )
            )
        )
    ).map(
        ([, t]) =>
            t as {
                id: string;
                label: string;
                kind: string;
            }
    );

    const allergenTags = allTags.filter(
        (t) => t.kind === 'allergen'
    );

    const dietaryTags = allTags.filter(
        (t) => t.kind === 'dietary'
    );

    const activeFilterCount =
        excludedAllergens.length + requiredDietary.length;

    function itemPassesFilters(item: PublicMenuItem): boolean {
        const itemTagIds = item.tags.map((t) => t.tag.id);

        if (
            excludedAllergens.some((id) =>
                itemTagIds.includes(id)
            )
        ) {
            return false;
        }

        if (
            requiredDietary.length > 0 &&
            !requiredDietary.every((id) =>
                itemTagIds.includes(id)
            )
        ) {
            return false;
        }

        return true;
    }

    return (
        <div>
            <div className="sticky top-[52px] z-10 bg-canvas shadow-sm dark:bg-surface-dark">
                <div className="flex gap-2 overflow-x-auto px-4 py-3">
                    {menu.categories.map((c: any) => (
                        <button
                            key={c.id}
                            onClick={() =>
                                handleCategoryClick(c.id)
                            }
                            className={`flex min-h-[44px] shrink-0 items-center rounded-full px-4 py-2 text-sm font-medium ${
                                effectiveActiveCategory === c.id
                                    ? 'bg-ink text-white dark:bg-white dark:text-ink'
                                    : 'border border-hairline bg-canvas dark:border-gray-700'
                            }`}
                        >
                            {c.name}
                        </button>
                    ))}
                </div>

                {(allergenTags.length > 0 ||
                    dietaryTags.length > 0 ||
                    supportedLanguages.length > 0) && (
                    <div className="flex items-center justify-between gap-2 px-4 pb-2">
                        {allergenTags.length > 0 || dietaryTags.length > 0 ? (
                            <Popover>
                                <PopoverTrigger asChild>
                                    <button className="flex min-h-[36px] items-center gap-1.5 rounded-full border border-hairline px-3 text-xs font-medium text-muted dark:border-gray-700">
                                        <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
                                        {t('menu.dietaryFilters')}
                                        {activeFilterCount > 0 && ` (${activeFilterCount})`}
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent>
                                    <div className="space-y-3">
                                        {dietaryTags.length > 0 && (
                                            <div>
                                                <p className="text-xs font-medium text-muted">{t('menu.showOnly')}</p>
                                                <div className="mt-1.5 flex flex-wrap gap-1.5">
                                                    {dietaryTags.map((tag) => (
                                                        <button
                                                            key={tag.id}
                                                            onClick={() =>
                                                                setRequiredDietary((prev) =>
                                                                    prev.includes(tag.id)
                                                                        ? prev.filter((id) => id !== tag.id)
                                                                        : [...prev, tag.id],
                                                                )
                                                            }
                                                            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                                                                requiredDietary.includes(tag.id)
                                                                    ? 'bg-ink text-white dark:bg-white dark:text-ink'
                                                                    : 'bg-surface-strong text-muted dark:bg-gray-700 dark:text-gray-300'
                                                            }`}
                                                        >
                                                            {tag.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {allergenTags.length > 0 && (
                                            <div>
                                                <p className="text-xs font-medium text-muted">{t('menu.excludeAllergens')}</p>
                                                <div className="mt-1.5 flex flex-wrap gap-1.5">
                                                    {allergenTags.map((tag) => (
                                                        <button
                                                            key={tag.id}
                                                            onClick={() =>
                                                                setExcludedAllergens((prev) =>
                                                                    prev.includes(tag.id)
                                                                        ? prev.filter((id) => id !== tag.id)
                                                                        : [...prev, tag.id],
                                                                )
                                                            }
                                                            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                                                                excludedAllergens.includes(tag.id)
                                                                    ? 'bg-error text-white'
                                                                    : 'bg-surface-strong text-muted dark:bg-gray-700 dark:text-gray-300'
                                                            }`}
                                                        >
                                                            {tag.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {activeFilterCount > 0 && (
                                            <button
                                                onClick={() => {
                                                    setRequiredDietary([]);
                                                    setExcludedAllergens([]);
                                                }}
                                                className="text-xs font-medium text-muted underline"
                                            >
                                                Clear filters
                                            </button>
                                        )}
                                    </div>
                                </PopoverContent>
                            </Popover>
                        ) : (
                            <span />
                        )}

                        {supportedLanguages.length > 0 && (
                            <Select value={lang || 'en'} onValueChange={(v) => changeLang(v === 'en' ? '' : v)}>
                                <SelectTrigger className="!min-h-[36px] w-auto gap-1.5 !py-1.5 text-xs">
                                    <Globe className="h-3.5 w-3.5 text-muted" aria-hidden />
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="en">EN</SelectItem>
                                    {supportedLanguages.map((code) => {
                                        const label = AVAILABLE_LANGUAGES.find((l) => l.code === code)?.code.toUpperCase() ?? code.toUpperCase();
                                        return <SelectItem key={code} value={code}>{label}</SelectItem>;
                                    })}
                                </SelectContent>
                            </Select>
                        )}
                    </div>
                )}
            </div>

            <div className="space-y-8 px-4 py-4">
                {menu.categories.map((category: any) => {
                    const filteredItems =
                        category.items.filter(
                            itemPassesFilters
                        );

                    return (
                        <section
                            key={category.id}
                            id={`cat-${category.id}`}
                        >
                            <h2 className="text-lg">
                                {category.name}
                            </h2>

                            {category.description && (
                                <p className="text-sm text-muted">
                                    {category.description}
                                </p>
                            )}

                            <div className="mt-3 space-y-3">
                                {filteredItems.length === 0 &&
                                    activeFilterCount > 0 && (
                                        <p className="text-sm text-muted-soft">
                                            {t(
                                                'menu.noItemsMatchFilters'
                                            )}
                                        </p>
                                    )}

                                {filteredItems.map(
                                    (
                                        item: PublicMenuItem
                                    ) => (
                                        <button
                                            key={item.id}
                                            onClick={() =>
                                                item.isAvailable &&
                                                setActiveItem(item)
                                            }
                                            disabled={
                                                !item.isAvailable
                                            }
                                            className={`flex w-full items-center gap-3 rounded-xl border border-hairline bg-canvas p-3 text-left dark:border-gray-700 dark:bg-surface-dark-elevated ${
                                                !item.isAvailable
                                                    ? 'opacity-50'
                                                    : 'active:scale-[0.99]'
                                            }`}
                                        >
                                            {item.photoUrl ? (
                                                <img
                                                    src={
                                                        item.photoUrl
                                                    }
                                                    alt={item.name}
                                                    className="h-16 w-16 shrink-0 rounded-lg object-cover"
                                                />
                                            ) : (
                                                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-hairline bg-surface-card dark:border-gray-700 dark:bg-surface-dark">
                                                    <UtensilsCrossed className="h-5 w-5 text-muted-soft" aria-hidden />
                                                </div>
                                            )}

                                            <div className="min-w-0 flex-1">
                                                <p className="truncate font-medium text-ink dark:text-white">
                                                    {item.name}
                                                </p>

                                                {item.description && (
                                                    <p className="line-clamp-2 text-sm text-muted">
                                                        {
                                                            item.description
                                                        }
                                                    </p>
                                                )}

                                                <div className="mt-1 flex items-center gap-2">
                                                    <span className="text-sm font-semibold text-ink dark:text-white">
                                                        {formatCents(
                                                            item.priceCents,
                                                            menu.venue
                                                                .currency
                                                        )}
                                                    </span>

                                                    {!item.isAvailable && (
                                                        <span className="text-xs font-medium text-error">
                                                            {t(
                                                                'menu.unavailable'
                                                            )}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </button>
                                    )
                                )}
                            </div>
                        </section>
                    );
                })}
            </div>

            {activeItem && (
                <ItemDetailModal
                    item={activeItem}
                    currency={menu.venue.currency}
                    onClose={() =>
                        setActiveItem(null)
                    }
                />
            )}
        </div>
    );
}