'use client';

import {useQuery} from '@tanstack/react-query';
import {useEffect} from 'react';
import {queryKeys} from '@/lib/query-keys';
import {setSessionToken} from '@/lib/session';

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

export function useTableInfo(token: string) {
    const query = useQuery({
        queryKey: queryKeys.tableInfo(token),
        queryFn: async () => {
            const res = await fetch(`${API_URL}/public/tables/${token}`);
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.message ?? 'This QR code could not be loaded.');
            }
            return res.json();
        },
        retry: false, // a deactivated/unrecognized table won't fix itself on retry
        staleTime: Infinity, // table/venue identity is stable for the life of this tab
    });

    // Store the session token the moment it's resolved — same side effect
    // the old manual fetch had, just triggered off query success instead.
    useEffect(() => {
        if (query.data?.sessionToken) setSessionToken(token, query.data.sessionToken);
    }, [query.data, token]);

    return query;
}