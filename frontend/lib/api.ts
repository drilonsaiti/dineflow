import { getAccessToken } from './supabase';

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

/** Carries the full parsed error body, not just its message — callers that
 * need extra fields (e.g. unavailableMenuItemIds from a rejected order)
 * read them off `.body` instead of falling back to raw fetch. */
export class ApiError extends Error {
    status: number;
    body: any;
    constructor(message: string, status: number, body: any) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.body = body;
    }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = await getAccessToken();
    const res = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}), // omitted entirely for anonymous customer-facing calls — harmless, backend routes marked @Public() don't require it
            ...options.headers,
        },
    });

    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new ApiError(body.message ?? `Request failed: ${res.status}`, res.status, body);
    }
    return res.status === 204 ? (undefined as T) : res.json();
}

async function requestBlob(path: string): Promise<Blob> {
    const token = await getAccessToken();
    const res = await fetch(`${API_URL}${path}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new ApiError(body.message ?? `Request failed: ${res.status}`, res.status, body);
    }
    return res.blob();
}

export const api = {
    get: <T>(path: string) => request<T>(path),
    post: <T>(path: string, body?: unknown) =>
        request<T>(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }),
    patch: <T>(path: string, body?: unknown) =>
        request<T>(path, { method: 'PATCH', body: body !== undefined ? JSON.stringify(body) : undefined }),
    delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
    getBlob: (path: string) => requestBlob(path),
};