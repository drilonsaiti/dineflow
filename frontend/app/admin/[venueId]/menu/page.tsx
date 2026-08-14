'use client';

import { use, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api';
import { formatCents } from '@/lib/money';
import { MenuCategory } from '@/types/menu';
import { CategoryForm } from '@/components/CategoryForm';
import { ItemForm } from '@/components/ItemForm';
import { Switch } from '@/components/ui/Switch';
import { useToast } from '@/components/ui/Toast';
import { TagManager } from '@/components/TagManager';

import {
    useMenuCategories,
    useToggleItemAvailability,
    useDeleteCategory,
    useDeleteItem,
} from '@/hooks/useMenu';
import {queryKeys} from "@/lib/query-keys";

export default function MenuAdminPage({
                                          params,
                                      }: {
    params: { venueId: string };
}) {
    const { venueId } = params;

    const queryClient = useQueryClient();

    const {
        data: categories = [],
        isLoading,
    } = useMenuCategories(venueId);

    const [addingItemTo, setAddingItemTo] = useState<string | null>(null);

    const [editingItem, setEditingItem] = useState<{
        categoryId: string;
        item: any;
    } | null>(null);

    const [venueTags, setVenueTags] = useState<any[]>([]);

    const showToast = useToast();

    const toggleAvailabilityMutation =
        useToggleItemAvailability(venueId);

    const deleteCategoryMutation =
        useDeleteCategory(venueId);

    const deleteItemMutation =
        useDeleteItem(venueId);

    async function refreshTags() {
        try {
            const tags = await api.get<any[]>(
                `/venues/${venueId}/menu/tags`,
            );
            setVenueTags(tags);
        } catch (err: unknown) {
            showToast(
                err instanceof Error
                    ? err.message
                    : 'Failed to load menu tags',
                'error',
            );
        }
    }

    useEffect(() => {
        refreshTags();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [venueId]);

    function invalidateCategories() {
        queryClient.invalidateQueries({
            queryKey: queryKeys.menuCategories(venueId),
        });
    }

    function toggleAvailability(
        itemId: string,
        isAvailable: boolean,
    ) {
        toggleAvailabilityMutation.mutate({
            itemId,
            isAvailable: !isAvailable,
        });
    }

    function deleteItem(itemId: string) {
        if (!confirm('Delete this menu item?')) {
            return;
        }

        deleteItemMutation.mutate(itemId);
    }

    function deleteCategory(categoryId: string) {
        if (!confirm('Delete this category? It must be empty first.')) {
            return;
        }

        deleteCategoryMutation.mutate(categoryId);
    }

    if (isLoading) {
        return (
            <div className="p-8 text-gray-500">
                Loading menu…
            </div>
        );
    }

    const lowStockItems = categories
        .flatMap((category) => category.items)
        .filter(
            (item: any) =>
                item.stockCount != null &&
                item.stockCount <= (item.lowStockThreshold ?? 5),
        );

    return (
        <div className="mx-auto max-w-3xl space-y-8 p-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl">Menu</h1>
            </div>

            {lowStockItems.length > 0 && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
                    ⚠️ Running low:{' '}
                    {lowStockItems
                        .map(
                            (item: any) =>
                                `${item.name} (${item.stockCount} left)`,
                        )
                        .join(', ')}
                </div>
            )}

            <CategoryForm
                venueId={venueId}
                onCreated={invalidateCategories}
            />

            <TagManager
                venueId={venueId}
                onChange={refreshTags}
            />

            {categories.length === 0 && (
                <p className="text-muted">
                    No categories yet — add one above to get started.
                </p>
            )}

            <div className="space-y-6">
                {categories.map((category: MenuCategory) => (
                    <div
                        key={category.id}
                        className="card"
                    >
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg">
                                {category.name}
                            </h2>

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
                                        deleteCategory(category.id)
                                    }
                                    disabled={
                                        deleteCategoryMutation.isPending
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
                                venueTags={venueTags}
                                onDone={() => {
                                    setAddingItemTo(null);
                                    invalidateCategories();
                                }}
                            />
                        )}

                        <ul className="mt-4 divide-y divide-hairline-soft dark:divide-gray-800">
                            {category.items.map((item: any) => (
                                <li
                                    key={item.id}
                                    className="py-3"
                                >
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
                                                            item.priceCents,
                                                        )}
                                                    </span>
                                                </p>

                                                {item.description && (
                                                    <p className="text-sm text-muted">
                                                        {item.description}
                                                    </p>
                                                )}

                                                {item.modifierGroups.length >
                                                    0 && (
                                                        <p className="mt-1 text-xs text-muted-soft">
                                                            {item.modifierGroups
                                                                .map(
                                                                    (group: {
                                                                        name: string;
                                                                    }) =>
                                                                        group.name,
                                                                )
                                                                .join(' · ')}
                                                        </p>
                                                    )}
                                            </div>

                                            <div className="flex shrink-0 items-center gap-2 text-sm">
                                                <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-muted">
                                                    Available

                                                    <Switch
                                                        checked={
                                                            item.isAvailable
                                                        }
                                                        onCheckedChange={() =>
                                                            toggleAvailability(
                                                                item.id,
                                                                item.isAvailable,
                                                            )
                                                        }
                                                        disabled={
                                                            toggleAvailabilityMutation.isPending
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
                                                        deleteItem(item.id)
                                                    }
                                                    disabled={
                                                        deleteItemMutation.isPending
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
        </div>
    );
}