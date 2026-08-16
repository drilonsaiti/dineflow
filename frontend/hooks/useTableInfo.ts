'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { setSessionToken } from '@/lib/session';

export function useTableInfo(token: string) {
    const query = useQuery({
        queryKey: queryKeys.tableInfo(token),
        queryFn: () => api.get<any>(`/public/tables/${token}`),
        retry: false, // a deactivated/unrecognized table won't fix itself on retry
        staleTime: Infinity,
    });

    useEffect(() => {
        if (query.data?.sessionToken) setSessionToken(token, query.data.sessionToken);
    }, [query.data, token]);

    return query;
}