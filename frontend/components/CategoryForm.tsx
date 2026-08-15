'use client';

import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { useCreateCategory } from '@/hooks/useMenu';
import { useToast } from '@/components/ui/Toast';

export function CategoryForm({ venueId }: { venueId: string }) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [station, setStation] = useState('');
    const createMutation = useCreateCategory(venueId);
    const showToast = useToast();

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        if (!name.trim()) return;
        try {
            await createMutation.mutateAsync({ name, description: description || undefined, station: station || undefined });
            setName('');
            setDescription('');
            setStation('');
        } catch (err: unknown) {
            showToast(err instanceof Error ? err.message : 'Failed to create category', 'error');
        }
    }

    return (
        <form onSubmit={submit} className="flex flex-wrap items-end gap-3 rounded-xl border border-dashed border-hairline p-4 dark:border-gray-700">
            <div className="flex-1 min-w-[160px]">
                <label className="block text-xs font-medium text-muted">Category name</label>
                <input className="input mt-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="Starters" />
            </div>
            <div className="flex-1 min-w-[160px]">
                <label className="block text-xs font-medium text-muted">Description (optional)</label>
                <input className="input mt-1" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div>
                <label className="block text-xs font-medium text-muted">Station (optional)</label>
                <Select value={station} onValueChange={(v) => setStation(v === 'all' ? '' : v)}>
                    <SelectTrigger className="mt-1 w-36">
                        <SelectValue placeholder="All stations" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All stations</SelectItem>
                        <SelectItem value="kitchen">Kitchen</SelectItem>
                        <SelectItem value="bar">Bar</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <button type="submit" disabled={createMutation.isPending} className="btn-primary">
                {createMutation.isPending ? 'Adding…' : 'Add category'}
            </button>
        </form>
    );
}