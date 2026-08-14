function key(tableToken: string) {
    return `qr-saas:session:${tableToken}`;
}

export function getSessionToken(tableToken: string): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(key(tableToken));
}

export function setSessionToken(tableToken: string, sessionToken: string) {
    localStorage.setItem(key(tableToken), sessionToken);
}