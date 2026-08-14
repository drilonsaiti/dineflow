import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 10_000, // most of this app's data changes via socket push, not polling — a short staleTime avoids redundant refetches on remount
            refetchOnWindowFocus: true, // useful for staff switching tabs mid-shift
            retry: 1,
        },
    },
});