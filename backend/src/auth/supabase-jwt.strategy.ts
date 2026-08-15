import {Injectable} from '@nestjs/common';
import {PassportStrategy} from '@nestjs/passport';
import {ExtractJwt, Strategy} from 'passport-jwt';
import {ConfigService} from '@nestjs/config';
import {passportJwtSecret} from 'jwks-rsa';
import {PrismaService} from '../prisma/prisma.service';

export interface SupabaseJwtPayload {
    sub: string;
    email: string;

    [key: string]: unknown;
}

export interface AuthenticatedUser {
    id: string;
    email: string;
}

/**
 * Verifies the Supabase-issued JWT against Supabase's published JWKS
 * (asymmetric ES256/RS256 — the current default signing scheme for new
 * Supabase projects, superseding the old shared-secret HS256 approach).
 * Keys are fetched by `kid` from `${SUPABASE_URL}/auth/v1/.well-known/jwks.json`
 * and cached, so there's no static secret to rotate or leak on our side.
 */
@Injectable()
export class SupabaseJwtStrategy extends PassportStrategy(Strategy, 'supabase-jwt') {
    constructor(
        config: ConfigService,
        private readonly prisma: PrismaService,
    ) {
        const supabaseUrl = config.getOrThrow<string>('SUPABASE_URL');

        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            algorithms: ['ES256', 'RS256'],
            secretOrKeyProvider: passportJwtSecret({
                cache: true,
                rateLimit: true,
                jwksRequestsPerMinute: 5,
                jwksUri: `${supabaseUrl}/auth/v1/.well-known/jwks.json`,
            }),
        });
    }

    async validate(payload: SupabaseJwtPayload): Promise<AuthenticatedUser> {
        await this.prisma.user.upsert({
            where: {id: payload.sub},
            update: {email: payload.email},
            create: {id: payload.sub, email: payload.email},
        });
        return {id: payload.sub, email: payload.email};
    }
}