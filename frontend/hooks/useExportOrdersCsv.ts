'use client';

import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface ExportRange {
    since?: string; // ISO date string, e.g. "2026-01-01"
    until?: string;
}

export function useExportOrdersCsv(venueId: string) {
    return useMutation({
        mutationFn: async (range: ExportRange = {}) => {
            const params = new URLSearchParams();
            if (range.since) params.set('since', range.since);
            if (range.until) params.set('until', range.until);
            const query = params.toString() ? `?${params.toString()}` : '';

            const blob = await api.getBlob(`/venues/${venueId}/analytics/export.csv${query}`);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `orders-export-${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        },
    });
}