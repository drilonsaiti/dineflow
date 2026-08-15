'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

interface ZReport {
    date: string;
    currency: string;
    ordersCount: number;
    cancelledCount: number;
    grossSalesCents: number;
    netSalesCents: number;
    taxCents: number | null;
    taxRatePercent: number | null;
    averageOrderValueCents: number;
    bestSellerName: string | null;
    busiestHour: number | null;
    note: string;
}

export function useZReport(venueId: string, date: string) {
    return useQuery({
        queryKey: queryKeys.zReport(venueId, date),
        queryFn: () => api.get<ZReport>(`/venues/${venueId}/analytics/z-report?date=${date}`),
    });
}