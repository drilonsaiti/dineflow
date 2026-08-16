'use client';

import {useRef, useState} from 'react';
import {centsToInput, inputToCents} from '@/lib/money';
import {MenuItem} from '@/types/menu';
import {ModifierGroup} from '@/types/modifier';
import {useToast} from '@/components/ui/Toast';
import {Checkbox} from '@/components/ui/Checkbox';
import {useSaveItem} from '@/hooks/useMenu';
import {useVenueBasics} from "@/hooks/useVenueBasics";

type Props = {
    venueId: string;
    categoryId: string;
    existing?: MenuItem;
    venueTags: { id: string; label: string; kind: string }[];
    onDone: () => void;
};

type DraftGroup = Omit<ModifierGroup, 'id' | 'options'> & {
    id?: string;
    options: (Omit<ModifierGroup['options'][number], 'id'> & { id?: string })[];
};

export function ItemForm({venueId, categoryId, existing, venueTags, onDone}: Props) {
    const [name, setName] = useState(existing?.name ?? '');
    const [description, setDescription] = useState(existing?.description ?? '');
    const [price, setPrice] = useState(existing ? centsToInput(existing.priceCents) : '');
    const [groups, setGroups] = useState<DraftGroup[]>(existing?.modifierGroups.map((g) => ({...g})) ?? []);
    const [selectedTagIds, setSelectedTagIds] = useState<string[]>(existing?.tags.map((t) => t.tag.id) ?? []);
    const [photoUrl, setPhotoUrl] = useState(existing?.photoUrl ?? '');
    const [uploading, setUploading] = useState(false);
    const [stockCount, setStockCount] = useState(existing?.stockCount?.toString() ?? '');
    const [lowStockThreshold, setLowStockThreshold] = useState(existing?.lowStockThreshold?.toString() ?? '');
    const [availableFrom, setAvailableFrom] = useState(existing?.availableFrom ?? '');
    const [availableTo, setAvailableTo] = useState(existing?.availableTo ?? '');
    const [translations, setTranslations] = useState<Record<string, { name?: string; description?: string }>>(existing?.translations ?? {});
    const [translationLang, setTranslationLang] = useState('es');
    const { data: venueBasics } = useVenueBasics(venueId);
    const configuredLanguages = venueBasics?.supportedLanguages ?? [];

    const fileInputRef = useRef<HTMLInputElement>(null);
    const showToast = useToast();
    const saveItemMutation = useSaveItem(venueId);

    function addGroup() {
        setGroups([
            ...groups,
            {name: '', isRequired: false, minSelect: 0, maxSelect: 1, displayOrder: groups.length, options: []},
        ]);
    }

    function updateGroup(index: number, patch: Partial<DraftGroup>) {
        setGroups(groups.map((g, i) => (i === index ? {...g, ...patch} : g)));
    }

    function removeGroup(index: number) {
        setGroups(groups.filter((_, i) => i !== index));
    }

    function addOption(groupIndex: number) {
        updateGroup(groupIndex, {
            options: [...groups[groupIndex].options, {
                name: '',
                priceDeltaCents: 0,
                displayOrder: groups[groupIndex].options.length
            }],
        });
    }

    function updateOption(groupIndex: number, optionIndex: number, patch: Record<string, any>) {
        const options = groups[groupIndex].options.map((o, i) => (i === optionIndex ? {...o, ...patch} : o));
        updateGroup(groupIndex, {options});
    }

    function removeOption(groupIndex: number, optionIndex: number) {
        updateGroup(groupIndex, {options: groups[groupIndex].options.filter((_, i) => i !== optionIndex)});
    }

    async function submit(e: React.FormEvent) {
        e.preventDefault();

        if (!name.trim() || !price) {
            showToast('Item name and price are required', 'error');
            return;
        }

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
                options: g.options.map((o) => ({name: o.name, priceDeltaCents: o.priceDeltaCents})),
            })),
            stockCount: stockCount === '' ? null : Number(stockCount),
            lowStockThreshold: lowStockThreshold === '' ? null : Number(lowStockThreshold),
            tagIds: selectedTagIds,
            availableFrom: availableFrom || undefined,
            availableTo: availableTo || undefined,
        };

        try {
            await saveItemMutation.mutateAsync({itemId: existing?.id, payload});
            showToast(existing ? 'Menu item updated successfully' : 'Menu item created successfully', 'success');
            onDone();
        } catch (err: unknown) {
            showToast(
                err instanceof Error ? err.message : existing ? 'Failed to update menu item' : 'Failed to create menu item',
                'error',
            );
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

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/venues/${venueId}/uploads/image`, {
                method: 'POST',
                headers: {Authorization: `Bearer ${token}`},
                body: formData,
            });

            if (!res.ok) {
                const data = await res.json().catch(() => null);
                throw new Error(data?.message ?? 'Upload failed');
            }

            const {url} = await res.json();
            setPhotoUrl(url);
            showToast('Photo uploaded successfully', 'success');
        } catch (err: unknown) {
            showToast(err instanceof Error ? err.message : 'Failed to upload photo', 'error');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    }

    return (
        <form onSubmit={submit} className="mt-3 space-y-4 rounded-lg bg-surface-card p-4 dark:bg-surface-dark-elevated">
            <div className="flex gap-3">
                <div className="flex-1">
                    <label className="block text-xs font-medium text-muted">Item name</label>
                    <input className="input mt-1" value={name} onChange={(e) => setName(e.target.value)}/>
                </div>
                <div className="w-28">
                    <label className="block text-xs font-medium text-muted">Price</label>
                    <input className="input mt-1" value={price} onChange={(e) => setPrice(e.target.value)}
                           placeholder="12.50" inputMode="decimal"/>
                </div>
            </div>

            <div className="flex gap-3">
                <div className="flex-1">
                    <label className="block text-xs font-medium text-muted">Available from (optional)</label>
                    <input type="time" className="input mt-1" value={availableFrom}
                           onChange={(e) => setAvailableFrom(e.target.value)}/>
                </div>
                <div className="flex-1">
                    <label className="block text-xs font-medium text-muted">Available until</label>
                    <input type="time" className="input mt-1" value={availableTo}
                           onChange={(e) => setAvailableTo(e.target.value)}/>
                </div>
            </div>

            <div>
                <label className="block text-xs font-medium text-muted">Description</label>
                <textarea className="input mt-1" value={description} onChange={(e) => setDescription(e.target.value)}
                          rows={2}/>
            </div>

            <div>
                <label className="block text-xs font-medium text-muted">Photo</label>
                <div className="mt-1 flex items-center gap-3">
                    {photoUrl ? (
                        <img src={photoUrl} alt="" className="h-16 w-16 rounded-md object-cover"/>
                    ) : (
                        <div className="h-16 w-16 rounded-md bg-surface-strong"/>
                    )}
                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
                            className="btn-secondary px-3 py-1.5 text-sm">
                        {uploading ? 'Uploading…' : photoUrl ? 'Replace photo' : 'Upload photo'}
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                           onChange={handleFileSelected}/>
                </div>
            </div>

            <div className="flex gap-3">
                <div className="flex-1">
                    <label className="block text-xs font-medium text-muted">Track stock? (optional)</label>
                    <input type="number" min={0} className="input mt-1" placeholder="Leave blank = unlimited"
                           value={stockCount} onChange={(e) => setStockCount(e.target.value)}/>
                </div>
                {stockCount !== '' && (
                    <div className="w-32">
                        <label className="block text-xs font-medium text-muted">Low stock warning at</label>
                        <input type="number" min={0} className="input mt-1" placeholder="5" value={lowStockThreshold}
                               onChange={(e) => setLowStockThreshold(e.target.value)}/>
                    </div>
                )}
            </div>

            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-muted">Modifier groups (size, add-ons…)</p>
                    <button type="button" className="text-sm font-medium text-ink hover:underline dark:text-white"
                            onClick={addGroup}>
                        + Add group
                    </button>
                </div>

                {groups.map((group, gi) => (
                    <div key={gi} className="card space-y-2 p-3">
                        <div className="flex items-center gap-2">
                            <input className="input flex-1 py-1 text-sm" placeholder="Group name, e.g. Size"
                                   value={group.name} onChange={(e) => updateGroup(gi, {name: e.target.value})}/>
                            <label className="flex cursor-pointer select-none items-center gap-1.5 text-xs text-muted">
                                <Checkbox checked={group.isRequired}
                                          onCheckedChange={(checked) => updateGroup(gi, {isRequired: checked === true})}/>
                                Required
                            </label>
                            <input type="number" className="input w-14 py-1 text-xs" value={group.minSelect}
                                   onChange={(e) => updateGroup(gi, {minSelect: Number(e.target.value)})}
                                   title="Min select"/>
                            <input type="number" className="input w-14 py-1 text-xs" value={group.maxSelect}
                                   onChange={(e) => updateGroup(gi, {maxSelect: Number(e.target.value)})}
                                   title="Max select"/>
                            <button type="button" className="text-xs font-medium text-error"
                                    onClick={() => removeGroup(gi)}>Remove
                            </button>
                        </div>

                        <div className="space-y-1 pl-2">
                            {group.options.map((option, oi) => (
                                <div key={oi} className="flex items-center gap-2">
                                    <input className="input flex-1 py-1 text-sm" placeholder="Option name, e.g. Large"
                                           value={option.name}
                                           onChange={(e) => updateOption(gi, oi, {name: e.target.value})}/>
                                    <input
                                        className="input w-20 py-1 text-sm"
                                        placeholder="+1.50"
                                        value={centsToInput(option.priceDeltaCents)}
                                        onChange={(e) => updateOption(gi, oi, {priceDeltaCents: inputToCents(e.target.value || '0')})}
                                    />
                                    <button type="button" className="text-xs font-medium text-error"
                                            onClick={() => removeOption(gi, oi)}>Remove
                                    </button>
                                </div>
                            ))}
                            <button type="button"
                                    className="text-xs font-medium text-ink hover:underline dark:text-white"
                                    onClick={() => addOption(gi)}>
                                + Add option
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {venueTags.length > 0 && (
                <div>
                    <p className="text-xs font-medium text-muted">Tags</p>
                    <div className="mt-1 flex flex-wrap gap-2">
                        {venueTags.map((tag) => {
                            const checked = selectedTagIds.includes(tag.id);
                            return (
                                <button
                                    key={tag.id}
                                    type="button"
                                    onClick={() => setSelectedTagIds((prev) => (checked ? prev.filter((id) => id !== tag.id) : [...prev, tag.id]))}
                                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                                        checked ? 'bg-ink text-white dark:bg-white dark:text-ink' : 'bg-surface-strong text-muted dark:bg-gray-700 dark:text-gray-300'
                                    }`}
                                >
                                    {tag.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            <div>
                <p className="text-xs font-medium text-gray-500">Translations (optional)</p>
                {configuredLanguages.length === 0 ? (
                    <p className="text-xs text-gray-400">
                        No additional languages configured yet — add some in venue Settings to enable translations.
                    </p>
                ) : (
                <div className="mt-1 flex gap-2">
                    {configuredLanguages.map((l) => (
                        <button key={l} type="button" onClick={() => setTranslationLang(l)} className={`rounded-full px-3 py-1 text-xs ${translationLang === l ? 'bg-ink text-white dark:bg-white dark:text-ink' : 'bg-surface-strong'}`}>
                            {l.toUpperCase()}
                        </button>
                    ))}
                </div>
                )}
                <input
                    className="input mt-2"
                    placeholder={`Name in ${translationLang.toUpperCase()}`}
                    value={translations[translationLang]?.name ?? ''}
                    onChange={(e) => setTranslations((prev) => ({ ...prev, [translationLang]: { ...prev[translationLang], name: e.target.value } }))}
                />
                <textarea
                    className="input mt-2"
                    rows={2}
                    placeholder={`Description in ${translationLang.toUpperCase()}`}
                    value={translations[translationLang]?.description ?? ''}
                    onChange={(e) => setTranslations((prev) => ({ ...prev, [translationLang]: { ...prev[translationLang], description: e.target.value } }))}
                />
            </div>

            <div className="flex gap-2">
                <button type="submit" disabled={saveItemMutation.isPending} className="btn-primary">
                    {saveItemMutation.isPending ? 'Saving…' : existing ? 'Save changes' : 'Add item'}
                </button>
                <button type="button" className="text-sm text-muted" onClick={onDone}>Cancel</button>
            </div>
        </form>
    );
}