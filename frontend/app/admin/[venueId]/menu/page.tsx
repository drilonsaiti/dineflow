'use client';

import { use,useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatCents } from '@/lib/money';
import {MenuCategory} from "@/types/menu";
import {CategoryForm} from "@/components/CategoryForm";
import {ItemForm} from "@/components/ItemForm";

export default function MenuAdminPage({ params }: { params: Promise<{ venueId: string }> }) {
    const { venueId } = use(params);
    const [categories, setCategories] = useState<MenuCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [addingItemTo, setAddingItemTo] = useState<string | null>(null);
    const [editingItem, setEditingItem] = useState<{ categoryId: string; item: any } | null>(null);

    async function refresh() {
        setLoading(true);
        const data = await api.get<MenuCategory[]>(`/venues/${venueId}/menu/categories`);
        setCategories(data);
        setLoading(false);
    }

    useEffect(() => {
        refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [venueId]);

    async function toggleAvailability(itemId: string, isAvailable: boolean) {
        await api.patch(`/venues/${venueId}/menu/items/${itemId}/availability`, {
            isAvailable: !isAvailable,
        });
        refresh();
    }

    async function deleteItem(itemId: string) {
        if (!confirm('Delete this menu item?')) return;
        await api.delete(`/venues/${venueId}/menu/items/${itemId}`);
        refresh();
    }

    async function deleteCategory(categoryId: string) {
        if (!confirm('Delete this category? It must be empty first.')) return;
        await api.delete(`/venues/${venueId}/menu/categories/${categoryId}`);
        refresh();
    }

    if (loading) return <div className="p-8 text-gray-500">Loading menu…</div>;

    return (
        <div className="mx-auto max-w-3xl p-6 space-y-8">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold">Menu</h1>
            </div>

            <CategoryForm venueId={venueId} onCreated={refresh} />

            {categories.length === 0 && (
                <p className="text-gray-500">No categories yet — add one above to get started.</p>
            )}

            <div className="space-y-6">
                {categories.map((category) => (
                    <div key={category.id} className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-medium">{category.name}</h2>
                            <div className="flex gap-3 text-sm">
                                <button
                                    className="text-brand hover:underline"
                                    onClick={() => setAddingItemTo(category.id)}
                                >
                                    + Add item
                                </button>
                                <button
                                    className="text-red-600 hover:underline"
                                    onClick={() => deleteCategory(category.id)}
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

                        <ul className="mt-4 divide-y divide-gray-100">
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
                                            <div className={!item.isAvailable ? 'opacity-50' : ''}>
                                                <p className="font-medium">
                                                    {item.name}{' '}
                                                    <span className="text-gray-500 font-normal">
                            {formatCents(item.priceCents)}
                          </span>
                                                </p>
                                                {item.description && (
                                                    <p className="text-sm text-gray-500">{item.description}</p>
                                                )}
                                                {item.modifierGroups.length > 0 && (
                                                    <p className="text-xs text-gray-400 mt-1">
                                                        {item.modifierGroups.map((g) => g.name).join(' · ')}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex shrink-0 items-center gap-3 text-sm">
                                                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                                                    <input
                                                        type="checkbox"
                                                        checked={item.isAvailable}
                                                        onChange={() => toggleAvailability(item.id, item.isAvailable)}
                                                    />
                                                    Available
                                                </label>
                                                <button
                                                    className="text-brand hover:underline"
                                                    onClick={() => setEditingItem({ categoryId: category.id, item })}
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    className="text-red-600 hover:underline"
                                                    onClick={() => deleteItem(item.id)}
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </li>
                            ))}
                            {category.items.length === 0 && (
                                <p className="py-2 text-sm text-gray-400">No items in this category yet.</p>
                            )}
                        </ul>
                    </div>
                ))}
            </div>
        </div>
    );
}