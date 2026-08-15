'use client';

import { useQueries } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

export function useAnalytics(venueId: string) {
    const results = useQueries({
        queries: [
            { queryKey: queryKeys.analyticsSummary(venueId), queryFn: () => api.get<any>(`/venues/${venueId}/analytics/summary`) },
            { queryKey: queryKeys.analyticsAvgReady(venueId), queryFn: () => api.get<any>(`/venues/${venueId}/analytics/avg-time-to-ready`) },
            { queryKey: queryKeys.analyticsBestSellers(venueId), queryFn: () => api.get<any[]>(`/venues/${venueId}/analytics/best-sellers`) },
            { queryKey: queryKeys.analyticsBusiestTables(venueId), queryFn: () => api.get<any[]>(`/venues/${venueId}/analytics/busiest-tables`) },
            { queryKey: queryKeys.analyticsBusiestHours(venueId), queryFn: () => api.get<any[]>(`/venues/${venueId}/analytics/busiest-hours`) },
            { queryKey: queryKeys.analyticsFeedback(venueId), queryFn: () => api.get<any>(`/venues/${venueId}/analytics/feedback`) },
        ],
    });

    const [summary, avgReady, bestSellers, busiestTables, busiestHours, feedback] = results;

    return {
        isLoading: results.some((r) => r.isLoading),
        summary: summary.data,
        avgReady: avgReady.data,
        bestSellers: bestSellers.data ?? [],
        busiestTables: busiestTables.data ?? [],
        busiestHours: busiestHours.data ?? [],
        feedback: feedback.data,
    };
}