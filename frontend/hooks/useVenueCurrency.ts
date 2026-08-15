'use client';

import {useVenueBasics} from './useVenueBasics';

/** Currency rarely changes — cached long, shared across every page that
 * calls formatCents(). Defaults to 'USD' only while the query is still
 * loading, never as a silent permanent fallback. */
export function useVenueCurrency(venueId: string): string {
    const {data} = useVenueBasics(venueId);
    return data?.currency ?? 'USD';
}