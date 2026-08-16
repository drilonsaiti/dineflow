'use client';

import {use, useState} from 'react';
import {useQueryClient} from '@tanstack/react-query';
import {TriangleAlert} from 'lucide-react';
import {
    useDeleteCategory,
    useDeleteItem,
    useMenuCategories,
    useMenuTags,
    useToggleItemAvailability
} from '@/hooks/useMenu';
import {formatCents} from '@/lib/money';
import {useVenueCurrency} from '@/hooks/useVenueCurrency';
import {useToast} from '@/components/ui/Toast';
import {ConfirmDialog} from '@/components/ui/ConfirmDialog';
import {Switch} from '@/components/ui/Switch';
import {CategoryForm} from "@/components/CategoryForm";
import {TagManager} from "@/components/TagManager";
import {ItemForm} from "@/components/ItemForm";
import {queryKeys} from "@/lib/query-keys";
import {RequireOwnerOrManager} from "@/components/RequireOwnerOrManager";

export default function MenuAdminPage({params}: { params: Promise<{ venueId: string }> }) {
    const {venueId} = use(params);
    const currency = useVenueCurrency(venueId);
    const showToast = useToast();
    const queryClient = useQueryClient();

    const {data: categories = [], isLoading} = useMenuCategories(venueId);
    const {data: venueTags = [], refetch: refetchTags} = useMenuTags(venueId);

    const toggleAvailabilityMutation = useToggleItemAvailability(venueId);
    const deleteCategoryMutation = useDeleteCategory(venueId);
    const deleteItemMutation = useDeleteItem(venueId);

    const [addingItemTo, setAddingItemTo] = useState<string | null>(null);
    const [editingItem, setEditingItem] = useState<{ categoryId: string; item: any } | null>(null);
    const [confirmDeleteItem, setConfirmDeleteItem] = useState<string | null>(null);
    const [confirmDeleteCategory, setConfirmDeleteCategory] = useState<string | null>(null);

    function invalidateCategories() {
        queryClient.invalidateQueries({queryKey: queryKeys.menuCategories(venueId)});
    }

    function toggleAvailability(itemId: string, isAvailable: boolean) {
        toggleAvailabilityMutation.mutate({itemId, isAvailable: !isAvailable});
    }

    if (isLoading) return <div className="p-8 text-muted-soft">Loading menu…</div>;

    const lowStockItems = categories
        .flatMap((c) => c.items)
        .filter((item: any) => item.stockCount != null && item.stockCount <= (item.lowStockThreshold ?? 5));

    return (
        <RequireOwnerOrManager venueId={venueId}>
            <div className="mx-auto max-w-3xl space-y-8 p-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl">Menu</h1>
                </div>

                {lowStockItems.length > 0 && (
                    <div
                        className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-warning">
                        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden/>
                        <span>Running low: {lowStockItems.map((i: any) => `${i.name} (${i.stockCount} left)`).join(', ')}</span>
                    </div>
                )}

                <CategoryForm venueId={venueId} onCreated={invalidateCategories}/>
                <TagManager venueId={venueId} onChange={() => refetchTags()}/>

                {categories.length === 0 &&
                    <p className="text-muted">No categories yet — add one above to get started.</p>}

                <div className="space-y-6">
                    {categories.map((category) => (
                        <div key={category.id} className="card">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg">{category.name}</h2>
                                <div className="flex items-center gap-3">
                                    <button className="btn-secondary !min-h-[36px] !px-3 !py-1.5"
                                            onClick={() => setAddingItemTo(category.id)}>
                                        + Add item
                                    </button>
                                    <button className="text-sm font-medium text-error hover:underline"
                                            onClick={() => setConfirmDeleteCategory(category.id)}>
                                        Delete category
                                    </button>
                                </div>
                            </div>

                            {addingItemTo === category.id && (
                                <ItemForm venueId={venueId} categoryId={category.id} venueTags={venueTags}
                                          onDone={() => {
                                              setAddingItemTo(null);
                                              invalidateCategories();
                                          }}/>
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
                                                onDone={() => {
                                                    setEditingItem(null);
                                                    invalidateCategories();
                                                }}
                                            />
                                        ) : (
                                            <div className="flex items-center justify-between gap-4">
                                                <div className={!item.isAvailable ? 'opacity-50' : ''}>
                                                    <p className="font-medium text-ink dark:text-white">
                                                        {item.name} <span
                                                        className="font-normal text-muted">{formatCents(item.priceCents, currency)}</span>
                                                    </p>
                                                    {item.description &&
                                                        <p className="text-sm text-muted">{item.description}</p>}
                                                    {item.modifierGroups.length > 0 && (
                                                        <p className="mt-1 text-xs text-muted-soft">{item.modifierGroups.map((g: any) => g.name).join(' · ')}</p>
                                                    )}
                                                </div>
                                                <div className="flex shrink-0 items-center gap-3 text-sm">
                                                    <label
                                                        className="flex cursor-pointer select-none items-center gap-2 text-muted">
                                                        Available
                                                        <Switch
                                                            checked={item.isAvailable}
                                                            onCheckedChange={() => toggleAvailability(item.id, item.isAvailable)}
                                                        />
                                                    </label>
                                                    <button
                                                        className="font-medium text-ink hover:underline dark:text-white"
                                                        onClick={() => setEditingItem({categoryId: category.id, item})}>
                                                        Edit
                                                    </button>
                                                    <button className="font-medium text-error hover:underline"
                                                            onClick={() => setConfirmDeleteItem(item.id)}>
                                                        Delete
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </li>
                                ))}
                                {category.items.length === 0 &&
                                    <p className="py-2 text-sm text-muted-soft">No items in this category yet.</p>}
                            </ul>
                        </div>
                    ))}
                </div>

                <ConfirmDialog
                    open={!!confirmDeleteItem}
                    onOpenChange={(open) => !open && setConfirmDeleteItem(null)}
                    title="Delete this menu item?"
                    description="This can't be undone."
                    confirmLabel="Delete"
                    danger
                    onConfirm={async () => {
                        if (!confirmDeleteItem) return;
                        try {
                            await deleteItemMutation.mutateAsync(confirmDeleteItem);
                        } catch (err: unknown) {
                            showToast(err instanceof Error ? err.message : 'Failed to delete item', 'error');
                        }
                    }}
                />

                <ConfirmDialog
                    open={!!confirmDeleteCategory}
                    onOpenChange={(open) => !open && setConfirmDeleteCategory(null)}
                    title="Delete this category?"
                    description="It must be empty first."
                    confirmLabel="Delete"
                    danger
                    onConfirm={async () => {
                        if (!confirmDeleteCategory) return;
                        try {
                            await deleteCategoryMutation.mutateAsync(confirmDeleteCategory);
                        } catch (err: unknown) {
                            showToast(err instanceof Error ? err.message : 'Failed to delete category', 'error');
                        }
                    }}
                />
            </div>
        </RequireOwnerOrManager>
    );
}