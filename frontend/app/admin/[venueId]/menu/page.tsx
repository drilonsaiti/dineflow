'use client';

import { use, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatCents } from '@/lib/money';
import { MenuCategory } from '@/types/menu';
import { CategoryForm } from '@/components/CategoryForm';
import { ItemForm } from '@/components/ItemForm';
import { Switch } from '@/components/ui/Switch';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';

export default function MenuAdminPage({
                                          params,
                                      }: {
    params: Promise<{ venueId: string }>;
}) {
    const { venueId } = use(params);

    const [categories, setCategories] = useState<MenuCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [addingItemTo, setAddingItemTo] = useState<string | null>(null);
    const [editingItem, setEditingItem] = useState<{
        categoryId: string;
        item: any;
    } | null>(null);

    const [confirmDeleteItem, setConfirmDeleteItem] = useState<string | null>(null);
    const [confirmDeleteCategory, setConfirmDeleteCategory] = useState<string | null>(null);

    const showToast = useToast();

    async function refresh() {
        setLoading(true);

        try {
            const data = await api.get<MenuCategory[]>(
                `/venues/${venueId}/menu/categories`
            );

            setCategories(data);
        } catch (err: unknown) {
            showToast(
                err instanceof Error ? err.message : 'Failed to load menu',
                'error'
            );
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [venueId]);

    async function toggleAvailability(
        itemId: string,
        isAvailable: boolean
    ) {
        try {
            await api.patch(
                `/venues/${venueId}/menu/items/${itemId}/availability`,
                {
                    isAvailable: !isAvailable,
                }
            );

            await refresh();
        } catch (err: unknown) {
            showToast(
                err instanceof Error
                    ? err.message
                    : 'Failed to update availability',
                'error'
            );
        }
    }

    async function deleteItem(itemId: string) {
        try {
            await api.delete(`/venues/${venueId}/menu/items/${itemId}`);
            await refresh();

            showToast('Menu item deleted successfully', 'success');
        } catch (err: unknown) {
            showToast(
                err instanceof Error
                    ? err.message
                    : 'Failed to delete menu item',
                'error'
            );
        }
    }

    async function deleteCategory(categoryId: string) {
        try {
            await api.delete(
                `/venues/${venueId}/menu/categories/${categoryId}`
            );

            await refresh();

            showToast('Category deleted successfully', 'success');
        } catch (err: unknown) {
            showToast(
                err instanceof Error
                    ? err.message
                    : 'Failed to delete category',
                'error'
            );
        }
    }

    if (loading) {
        return (
            <div className="p-8 text-muted-soft">
                Loading menu…
            </div>
        );
    }

    const lowStockItems = categories
        .flatMap((c) => c.items)
        .filter((i: any) => i.stockCount != null && i.stockCount <= (i.lowStockThreshold ?? 5));

    return (
        <div className="mx-auto max-w-3xl space-y-8 p-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl">Menu</h1>
            </div>

            {lowStockItems.length > 0 && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
                    ⚠️ Running low: {lowStockItems.map((i: any) => `${i.name} (${i.stockCount} left)`).join(', ')}
                </div>
            )}

            <CategoryForm
                venueId={venueId}
                onCreated={refresh}
            />

            {categories.length === 0 && (
                <p className="text-muted">
                    No categories yet — add one above to get started.
                </p>
            )}

            <div className="space-y-6">
                {categories.map((category) => (
                    <div key={category.id} className="card">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg">{category.name}</h2>

                            <div className="flex items-center gap-2">
                                <button
                                    className="btn-secondary !min-h-[36px] !px-3 !py-1.5"
                                    onClick={() =>
                                        setAddingItemTo(category.id)
                                    }
                                >
                                    + Add item
                                </button>

                                <button
                                    className="btn-ghost-danger"
                                    onClick={() =>
                                        setConfirmDeleteCategory(category.id)
                                    }
                                >
                                    Delete category
                                </button>
                            </div>
                        </div>

                        {addingItemTo === category.id && (
                            <ItemForm
                                venueId={venueId}
                                categoryId={category.id}
                                onDone={() => {
                                    setAddingItemTo(null);
                                    refresh();
                                }}
                            />
                        )}

                        <ul className="mt-4 divide-y divide-hairline-soft dark:divide-gray-800">
                            {category.items.map((item) => (
                                <li key={item.id} className="py-3">
                                    {editingItem?.item.id === item.id ? (
                                        <ItemForm
                                            venueId={venueId}
                                            categoryId={category.id}
                                            existing={item}
                                            onDone={() => {
                                                setEditingItem(null);
                                                refresh();
                                            }}
                                        />
                                    ) : (
                                        <div className="flex items-center justify-between gap-4">
                                            <div
                                                className={
                                                    !item.isAvailable
                                                        ? 'opacity-50'
                                                        : ''
                                                }
                                            >
                                                <p className="font-medium text-ink dark:text-white">
                                                    {item.name}{' '}
                                                    <span className="font-normal text-muted">
                                                        {formatCents(
                                                            item.priceCents
                                                        )}
                                                    </span>
                                                </p>

                                                {item.description && (
                                                    <p className="text-sm text-muted">
                                                        {item.description}
                                                    </p>
                                                )}

                                                {item.modifierGroups.length > 0 && (
                                                    <p className="mt-1 text-xs text-muted-soft">
                                                        {item.modifierGroups
                                                            .map((g) => g.name)
                                                            .join(' · ')}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="flex shrink-0 items-center gap-2 text-sm">
                                                <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-muted">
                                                    Available

                                                    <Switch
                                                        checked={item.isAvailable}
                                                        onCheckedChange={() =>
                                                            toggleAvailability(
                                                                item.id,
                                                                item.isAvailable
                                                            )
                                                        }
                                                    />
                                                </label>

                                                <button
                                                    className="btn-ghost"
                                                    onClick={() =>
                                                        setEditingItem({
                                                            categoryId:
                                                            category.id,
                                                            item,
                                                        })
                                                    }
                                                >
                                                    Edit
                                                </button>

                                                <button
                                                    className="btn-ghost-danger"
                                                    onClick={() =>
                                                        setConfirmDeleteItem(
                                                            item.id
                                                        )
                                                    }
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </li>
                            ))}

                            {category.items.length === 0 && (
                                <p className="py-2 text-sm text-muted-soft">
                                    No items in this category yet.
                                </p>
                            )}
                        </ul>
                    </div>
                ))}
            </div>

            <ConfirmDialog
                open={!!confirmDeleteItem}
                onOpenChange={(open) => {
                    if (!open) setConfirmDeleteItem(null);
                }}
                title="Delete menu item?"
                description="This menu item will be permanently deleted. This action cannot be undone."
                confirmLabel="Delete"
                danger
                onConfirm={async () => {
                    if (!confirmDeleteItem) return;

                    const itemId = confirmDeleteItem;
                    setConfirmDeleteItem(null);

                    await deleteItem(itemId);
                }}
            />

            <ConfirmDialog
                open={!!confirmDeleteCategory}
                onOpenChange={(open) => {
                    if (!open) setConfirmDeleteCategory(null);
                }}
                title="Delete category?"
                description="This category must be empty before it can be deleted. This action cannot be undone."
                confirmLabel="Delete"
                danger
                onConfirm={async () => {
                    if (!confirmDeleteCategory) return;

                    const categoryId = confirmDeleteCategory;
                    setConfirmDeleteCategory(null);

                    await deleteCategory(categoryId);
                }}
            />
        </div>
    );
}