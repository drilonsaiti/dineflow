export interface AnalyticsSummary {
    ordersToday: number;
    revenueTodayCents: number;
    ordersThisWeek: number;
    revenueThisWeekCents: number;
}

export interface BestSeller {
    menuItemId: string;
    name: string;
    quantitySold: number;
    revenueCents: number;
}

export interface BusiestTable {
    tableId: string;
    label: string;
    orderCount: number;
}

export interface BusiestHour {
    hour: number;
    count: number;
}