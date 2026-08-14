'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Tag {
    id: string;
    label: string;
    kind: string;
}

export function TagManager({ venueId, onChange }: { venueId: string; onChange?: () => void }) {
    const [tags, setTags] = useState<Tag[]>([]);
    const [label, setLabel] = useState('');
    const [kind, setKind] = useState('dietary');

    async function refresh() {
        const data = await api.get<Tag[]>(`/venues/${venueId}/menu/tags`);
        setTags(data);
        onChange?.();
    }

    useEffect(() => {
        refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [venueId]);

    async function addTag(e: React.FormEvent) {
        e.preventDefault();
        if (!label.trim()) return;
        await api.post(`/venues/${venueId}/menu/tags`, { label, kind });
        setLabel('');
        refresh();
    }

    async function deleteTag(id: string) {
        await api.delete(`/venues/${venueId}/menu/tags/${id}`);
        refresh();
    }

    return (
        <div className="rounded-xl border border-dashed border-gray-300 p-4">
            <p className="text-sm font-medium">Tags (dietary, allergens, etc.)</p>
            <form onSubmit={addTag} className="mt-2 flex flex-wrap items-end gap-2">
                <input
                    className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                    placeholder="e.g. Vegetarian, Gluten-free, Spicy"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                />
                <select className="rounded-md border border-gray-300 px-2 py-1.5 text-sm" value={kind} onChange={(e) => setKind(e.target.value)}>
                    <option value="dietary">Dietary</option>
                    <option value="allergen">Allergen</option>
                    <option value="other">Other</option>
                </select>
                <button className="rounded-md border border-gray-300 px-3 py-1.5 text-sm">Add tag</button>
            </form>
            <div className="mt-2 flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                    <span key={tag.id} className="flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs">
            {tag.label}
                        <button onClick={() => deleteTag(tag.id)} className="text-gray-400 hover:text-red-500" aria-label={`Delete ${tag.label}`}>
              ✕
            </button>
          </span>
                ))}
                {tags.length === 0 && <p className="text-xs text-gray-400">No tags yet.</p>}
            </div>
        </div>
    );
}