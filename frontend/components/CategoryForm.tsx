'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

export function CategoryForm({
                                 venueId,
                                 onCreated,
                             }: {
    venueId: string;
    onCreated: () => void;
}) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        if (!name.trim()) return;
        setSubmitting(true);
        try {
            await api.post(`/venues/${venueId}/menu/categories`, {
                name,
                description: description || undefined,
            });
            setName('');
            setDescription('');
            onCreated();
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <form onSubmit={submit} className="flex flex-wrap items-end gap-3 rounded-xl border border-dashed border-hairline p-4 dark:border-gray-700">
            <div className="flex-1 min-w-[160px]">
                <label className="block text-xs font-medium text-muted">Category name</label>
                <input
                    className="input mt-1"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Starters"
                />
            </div>
            <div className="flex-1 min-w-[160px]">
                <label className="block text-xs font-medium text-muted">Description (optional)</label>
                <input
                    className="input mt-1"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                />
            </div>
            <button type="submit" disabled={submitting} className="btn-primary">
                Add category
            </button>
        </form>
    );
}