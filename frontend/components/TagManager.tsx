'use client';

import {useState} from 'react';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/Select';
import {useCreateTag, useDeleteTag, useMenuTags} from '@/hooks/useMenu';
import {useToast} from '@/components/ui/Toast';

export function TagManager({venueId}: { venueId: string }) {
    const {data: tags = []} = useMenuTags(venueId);
    const createMutation = useCreateTag(venueId);
    const deleteMutation = useDeleteTag(venueId);
    const showToast = useToast();

    const [label, setLabel] = useState('');
    const [kind, setKind] = useState('dietary');

    async function addTag(e: React.FormEvent) {
        e.preventDefault();
        if (!label.trim()) return;
        try {
            await createMutation.mutateAsync({label, kind});
            setLabel('');
        } catch (err: unknown) {
            showToast(err instanceof Error ? err.message : 'Failed to add tag', 'error');
        }
    }

    return (
        <div className="rounded-xl border border-dashed border-hairline p-4 dark:border-gray-700">
            <p className="text-sm font-medium">Tags (dietary, allergens, etc.)</p>
            <form onSubmit={addTag} className="mt-2 flex flex-wrap items-end gap-2">
                <input
                    className="input"
                    placeholder="e.g. Vegetarian, Gluten-free, Spicy"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                />
                <Select value={kind} onValueChange={setKind}>
                    <SelectTrigger className="w-32">
                        <SelectValue/>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="dietary">Dietary</SelectItem>
                        <SelectItem value="allergen">Allergen</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                </Select>
                <button type="submit" disabled={createMutation.isPending} className="btn-secondary text-sm">
                    {createMutation.isPending ? 'Adding…' : 'Add tag'}
                </button>
            </form>
            <div className="mt-2 flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                    <span key={tag.id}
                          className="flex items-center gap-1 rounded-full bg-surface-strong px-2.5 py-1 text-xs dark:bg-gray-700">
            {tag.label}
                        <button
                            onClick={() => deleteMutation.mutate(tag.id)}
                            className="text-muted hover:text-error"
                            aria-label={`Delete ${tag.label}`}
                        >
              ✕
            </button>
          </span>
                ))}
                {tags.length === 0 && <p className="text-xs text-muted-soft">No tags yet.</p>}
            </div>
        </div>
    );
}