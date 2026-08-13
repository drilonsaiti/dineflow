'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/Select";

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
    const [station, setStation] = useState('');

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        if (!name.trim()) return;
        setSubmitting(true);
        try {
            await api.post(`/venues/${venueId}/menu/categories`, {
                name,
                description: description || undefined,
                station: station || undefined,
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

            <Select value={station} onValueChange={setStation}>
                <SelectTrigger className="w-36">
                    <SelectValue placeholder="All stations" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="">All stations</SelectItem>
                    <SelectItem value="kitchen">Kitchen</SelectItem>
                    <SelectItem value="bar">Bar</SelectItem>
                </SelectContent>
            </Select>
            <button type="submit" disabled={submitting} className="btn-primary">
                Add category
            </button>
        </form>
    );
}