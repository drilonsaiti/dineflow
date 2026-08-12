'use client';
import { useState,useRef } from 'react';
import { api } from '@/lib/api';
import { centsToInput, inputToCents } from '@/lib/money';
import {MenuItem} from "@/types/menu";
import {ModifierGroup} from "@/types/modifier";

type Props = {
    venueId: string;
    categoryId: string;
    existing?: MenuItem;
    onDone: () => void;
};

// New groups/options have no id yet — the backend replaces the item's whole
// modifier tree on every save (see MenuService.replaceModifierGroups), so
// this form doesn't need to track add/remove diffs, only the current tree.
type DraftGroup = Omit<ModifierGroup, 'id' | 'options'> & {
    id?: string;
    options: (Omit<ModifierGroup['options'][number], 'id'> & { id?: string })[];
};

export function ItemForm({ venueId, categoryId, existing, onDone }: Props) {
    const [name, setName] = useState(existing?.name ?? '');
    const [description, setDescription] = useState(existing?.description ?? '');
    const [price, setPrice] = useState(existing ? centsToInput(existing.priceCents) : '');
    const [groups, setGroups] = useState<DraftGroup[]>(
        existing?.modifierGroups.map((g) => ({ ...g })) ?? [],
    );
    const [submitting, setSubmitting] = useState(false);
    const [photoUrl, setPhotoUrl] = useState(existing?.photoUrl ?? '');
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    function addGroup() {
        setGroups([
            ...groups,
            { name: '', isRequired: false, minSelect: 0, maxSelect: 1, displayOrder: groups.length, options: [] },
        ]);
    }

    function updateGroup(index: number, patch: Partial<DraftGroup>) {
        setGroups(groups.map((g, i) => (i === index ? { ...g, ...patch } : g)));
    }

    function removeGroup(index: number) {
        setGroups(groups.filter((_, i) => i !== index));
    }

    function addOption(groupIndex: number) {
        updateGroup(groupIndex, {
            options: [
                ...groups[groupIndex].options,
                { name: '', priceDeltaCents: 0, displayOrder: groups[groupIndex].options.length },
            ],
        });
    }

    function updateOption(groupIndex: number, optionIndex: number, patch: Record<string, any>) {
        const options = groups[groupIndex].options.map((o, i) =>
            i === optionIndex ? { ...o, ...patch } : o,
        );
        updateGroup(groupIndex, { options });
    }

    function removeOption(groupIndex: number, optionIndex: number) {
        updateGroup(groupIndex, {
            options: groups[groupIndex].options.filter((_, i) => i !== optionIndex),
        });
    }

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        if (!name.trim() || !price) return;
        setSubmitting(true);
        try {
            const payload = {
                categoryId,
                name,
                description: description || undefined,
                photoUrl: photoUrl || undefined,
                priceCents: inputToCents(price),
                modifierGroups: groups.map((g) => ({
                    name: g.name,
                    isRequired: g.isRequired,
                    minSelect: g.minSelect,
                    maxSelect: g.maxSelect,
                    options: g.options.map((o) => ({ name: o.name, priceDeltaCents: o.priceDeltaCents })),
                })),
            };

            if (existing) {
                await api.patch(`/venues/${venueId}/menu/items/${existing.id}`, payload);
            } else {
                await api.post(`/venues/${venueId}/menu/items`, payload);
            }
            onDone();
        } finally {
            setSubmitting(false);
        }
    }

    async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const token = await (await import('@/lib/supabase')).getAccessToken();
            const formData = new FormData();
            formData.append('file', file);
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/venues/${venueId}/uploads/image`,
                { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData },
            );
            if (!res.ok) throw new Error((await res.json()).message ?? 'Upload failed');
            const { url } = await res.json();
            setPhotoUrl(url);
        } catch (err: any) {
            alert(err.message);
        } finally {
            setUploading(false);
        }
    }

    return (
        <form onSubmit={submit} className="mt-3 space-y-4 rounded-lg bg-gray-50 p-4">
            <div className="flex gap-3">
                <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-500">Item name</label>
                    <input
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                </div>
                <div className="w-28">
                    <label className="block text-xs font-medium text-gray-500">Price</label>
                    <input
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder="12.50"
                        inputMode="decimal"
                    />
                </div>
            </div>

            <div>
                <label className="block text-xs font-medium text-gray-500">Description</label>
                <textarea
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                />
            </div>

            <div>
                <label className="block text-xs font-medium text-gray-500">Photo</label>
                <div className="mt-1 flex items-center gap-3">
                    {photoUrl ? (
                        <img src={photoUrl} alt="" className="h-16 w-16 rounded-md object-cover" />
                    ) : (
                        <div className="h-16 w-16 rounded-md bg-gray-200" />
                    )}
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50"
                    >
                        {uploading ? 'Uploading…' : photoUrl ? 'Replace photo' : 'Upload photo'}
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={handleFileSelected}
                    />
                </div>
            </div>

            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-gray-500">Modifier groups (size, add-ons…)</p>
                    <button type="button" className="text-sm text-brand hover:underline" onClick={addGroup}>
                        + Add group
                    </button>
                </div>

                {groups.map((group, gi) => (
                    <div key={gi} className="rounded-md border border-gray-200 bg-white p-3 space-y-2 dark:border-gray-800 dark:bg-gray-900">
                        <div className="flex items-center gap-2">
                            <input
                                className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-sm"
                                placeholder="Group name, e.g. Size"
                                value={group.name}
                                onChange={(e) => updateGroup(gi, { name: e.target.value })}
                            />
                            <label className="flex items-center gap-1 text-xs">
                                <input
                                    type="checkbox"
                                    checked={group.isRequired}
                                    onChange={(e) => updateGroup(gi, { isRequired: e.target.checked })}
                                />
                                Required
                            </label>
                            <input
                                type="number"
                                className="w-14 rounded-md border border-gray-300 px-2 py-1 text-xs"
                                value={group.minSelect}
                                onChange={(e) => updateGroup(gi, { minSelect: Number(e.target.value) })}
                                title="Min select"
                            />
                            <input
                                type="number"
                                className="w-14 rounded-md border border-gray-300 px-2 py-1 text-xs"
                                value={group.maxSelect}
                                onChange={(e) => updateGroup(gi, { maxSelect: Number(e.target.value) })}
                                title="Max select"
                            />
                            <button
                                type="button"
                                className="text-xs text-red-600"
                                onClick={() => removeGroup(gi)}
                            >
                                Remove
                            </button>
                        </div>

                        <div className="space-y-1 pl-2">
                            {group.options.map((option, oi) => (
                                <div key={oi} className="flex items-center gap-2">
                                    <input
                                        className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-sm"
                                        placeholder="Option name, e.g. Large"
                                        value={option.name}
                                        onChange={(e) => updateOption(gi, oi, { name: e.target.value })}
                                    />
                                    <input
                                        className="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm"
                                        placeholder="+1.50"
                                        value={centsToInput(option.priceDeltaCents)}
                                        onChange={(e) =>
                                            updateOption(gi, oi, { priceDeltaCents: inputToCents(e.target.value || '0') })
                                        }
                                    />
                                    <button
                                        type="button"
                                        className="text-xs text-red-600"
                                        onClick={() => removeOption(gi, oi)}
                                    >
                                        Remove
                                    </button>
                                </div>
                            ))}
                            <button
                                type="button"
                                className="text-xs text-brand hover:underline"
                                onClick={() => addOption(gi)}
                            >
                                + Add option
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex gap-2">
                <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                    {existing ? 'Save changes' : 'Add item'}
                </button>
                <button type="button" className="text-sm text-gray-500" onClick={onDone}>
                    Cancel
                </button>
            </div>
        </form>
    );
}