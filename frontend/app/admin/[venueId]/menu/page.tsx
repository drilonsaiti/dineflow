'use client';

import { use, useState } from 'react';
import { useMenuCategories, useMenuTags, useToggleItemAvailability, useDeleteCategory, useDeleteItem } from '@/hooks/useMenu';
import { formatCents } from '@/lib/money';
import { useVenueCurrency } from '@/hooks/useVenueCurrency';
import { useToast } from '@/components/ui/Toast';
import {CategoryForm} from "@/components/CategoryForm";
import {TagManager} from "@/components/TagManager";
import {ItemForm} from "@/components/ItemForm";

export default function MenuAdminPage({ params }: { params: Promise<{ venueId: string }> }) {
    const { venueId } = use(params);
    const currency = useVenueCurrency(venueId);
    const showToast = useToast();

    const { data: categories = [], isLoading } = useMenuCategories(venueId);
    const { data: venueTags = [] } = useMenuTags(venueId);

    const toggleAvailabilityMutation = useToggleItemAvailability(venueId);
    const deleteCategoryMutation = useDeleteCategory(venueId);
    const deleteItemMutation = useDeleteItem(venueId);

    const [addingItemTo, setAddingItemTo] = useState<string | null>(null);
    const [editingItem, setEditingItem] = useState<{ categoryId: string; item: any } | null>(null);

    function toggleAvailability(itemId: string, isAvailable: boolean) {
        toggleAvailabilityMutation.mutate({ itemId, isAvailable: !isAvailable });
    }

    async function deleteItem(itemId: string) {
        if (!confirm('Delete this menu item?')) return;
        try {
            await deleteItemMutation.mutateAsync(itemId);
        } catch (err: unknown) {
            showToast(err instanceof Error ? err.message : 'Failed to delete item', 'error');
        }
    }

    async function deleteCategory(categoryId: string) {
        if (!confirm('Delete this category? It must be empty first.')) return;
        try {
            await deleteCategoryMutation.mutateAsync(categoryId);
        } catch (err: unknown) {
            showToast(err instanceof Error ? err.message : 'Failed to delete category', 'error');
        }
    }

    if (isLoading) return <div className="p-8 text-muted-soft">Loading menu…</div>;

    const lowStockItems = categories
        .flatMap((c) => c.items)
        .filter((item: any) => item.stockCount != null && item.stockCount <= (item.lowStockThreshold ?? 5));

    return (
        <div className="mx-auto max-w-3xl space-y-8 p-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-display font-semibold">Menu</h1>
            </div>

            {lowStockItems.length > 0 && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
                    ⚠️ Running low: {lowStockItems.map((i: any) => `${i.name} (${i.stockCount} left)`).join(', ')}
                </div>
            )}

            <CategoryForm venueId={venueId} />
            <TagManager venueId={venueId} />

            {categories.length === 0 && <p className="text-muted-soft">No categories yet — add one above to get started.</p>}

            <div className="space-y-6">
                {categories.map((category) => (
                    <div key={category.id} className="card">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-display font-semibold">{category.name}</h2>
                            <div className="flex items-center gap-3">
                                <button className="btn-secondary !min-h-[36px] !px-3 !py-1.5" onClick={() => setAddingItemTo(category.id)}>
                                    + Add item
                                </button>
                                <button className="text-sm text-error hover:underline" onClick={() => deleteCategory(category.id)}>
                                    Delete category
                                </button>
                            </div>
                        </div>

                        {addingItemTo === category.id && (
                            <ItemForm venueId={venueId} categoryId={category.id} venueTags={venueTags} onDone={() => setAddingItemTo(null)} />
                        )}

                        <ul className="mt-4 divide-y divide-hairline dark:divide-gray-800">
                            {category.items.map((item: any) => (
                                <li key={item.id} className="py-3">
                                    {editingItem?.item.id === item.id ? (
                                        <ItemForm
                                            venueId={venueId}
                                            categoryId={category.id}
                                            existing={item}
                                            venueTags={venueTags}
                                            onDone={() => setEditingItem(null)}
                                        />
                                    ) : (
                                        <div className="flex items-center justify-between gap-4">
                                            <div className={!item.isAvailable ? 'opacity-50' : ''}>
                                                <p className="font-medium">
                                                    {item.name} <span className="font-normal text-muted">{formatCents(item.priceCents, currency)}</span>
                                                </p>
                                                {item.description && <p className="text-sm text-muted">{item.description}</p>}
                                                {item.modifierGroups.length > 0 && (
                                                    <p className="mt-1 text-xs text-muted-soft">{item.modifierGroups.map((g: any) => g.name).join(' · ')}</p>
                                                )}
                                            </div>
                                            <div className="flex shrink-0 items-center gap-3 text-sm">
                                                <label className="flex cursor-pointer select-none items-center gap-1.5">
                                                    <input type="checkbox" checked={item.isAvailable} onChange={() => toggleAvailability(item.id, item.isAvailable)} />
                                                    Available
                                                </label>
                                                <button className="text-ink hover:underline dark:text-white" onClick={() => setEditingItem({ categoryId: category.id, item })}>
                                                    Edit
                                                </button>
                                                <button className="text-error hover:underline" onClick={() => deleteItem(item.id)}>
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </li>
                            ))}
                            {category.items.length === 0 && <p className="py-2 text-sm text-muted-soft">No items in this category yet.</p>}
                        </ul>
                    </div>
                ))}
            </div>
        </div>
    );
}