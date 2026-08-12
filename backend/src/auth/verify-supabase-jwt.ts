import { JwksClient } from 'jwks-rsa';
import * as jwt from 'jsonwebtoken';

let client: JwksClient | null = null;

function getClient(supabaseUrl: string) {
    if (!client) {
        client = new JwksClient({
            jwksUri: `${supabaseUrl}/auth/v1/.well-known/jwks.json`,
            cache: true,
            rateLimit: true,
        });
    }
    return client;
}

/** Same verification SupabaseJwtStrategy does for REST requests, exposed as
 * a plain function for OrdersGateway — Socket.io's `join_venue` handler
 * can't use a Passport guard, but must trust the exact same keys. */
export async function verifySupabaseJwt(
    token: string,
    supabaseUrl: string,
): Promise<{ sub: string; email: string }> {
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || typeof decoded === 'string' || !decoded.header.kid) {
        throw new Error('Invalid token');
    }
    const key = await getClient(supabaseUrl).getSigningKey(decoded.header.kid);
    const payload = jwt.verify(token, key.getPublicKey(), { algorithms: ['ES256', 'RS256'] });
    if (typeof payload === 'string') throw new Error('Invalid token payload');
    return { sub: payload.sub as string, email: payload.email as string };
}