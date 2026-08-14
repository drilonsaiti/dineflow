// Centralized query keys — every hook below imports from here instead of
// inlining key arrays, so a typo can't silently create a second, unrelated
// cache entry for "the same" data.
export const queryKeys = {
    venue: (venueId: string) => ['venue', venueId] as const,
    venuesMine: () => ['venues', 'mine'] as const,
    orders: (venueId: string, station?: string) => ['orders', venueId, station ?? 'all'] as const,
    order: (venueId: string, orderId: string) => ['order', venueId, orderId] as const,
    menuCategories: (venueId: string) => ['menu-categories', venueId] as const,
    menuTags: (venueId: string) => ['menu-tags', venueId] as const,
    tables: (venueId: string) => ['tables', venueId] as const,
    areas: (venueId: string) => ['areas', venueId] as const,
    staff: (venueId: string) => ['staff', venueId] as const,
    tableAssignments: (venueId: string) => ['table-assignments', venueId] as const,
    tableRequests: (venueId: string) => ['table-requests', venueId] as const,
    analyticsSummary: (venueId: string) => ['analytics', 'summary', venueId] as const,
    myMembership: (venueId: string) => ['my-membership', venueId] as const,
};