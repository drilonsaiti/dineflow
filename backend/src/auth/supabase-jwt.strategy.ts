import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

export interface SupabaseJwtPayload {
  sub: string; // Supabase auth.users.id
  email: string;
  role?: string;
  [key: string]: unknown;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
}

/**
 * Verifies the Supabase-issued JWT's signature against Supabase's own JWT
 * secret (not a secret we mint). This is the single gate every authenticated
 * request passes through before any controller/service code runs — see
 * ARCHITECTURE.md section 2, step 1.
 *
 * We do NOT reimplement sign-up/login/magic-link here — Supabase Auth owns
 * that flow entirely on the frontend; this strategy only ever *verifies*.
 */
@Injectable()
export class SupabaseJwtStrategy extends PassportStrategy(Strategy, 'supabase-jwt') {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('SUPABASE_JWT_SECRET'),
      algorithms: ['HS256'],
    });
  }

  async validate(payload: SupabaseJwtPayload): Promise<AuthenticatedUser> {
    // Upsert a local shadow row so we have a stable FK target for
    // VenueMembership / OrderStatusEvent.changedBy without owning auth data.
    await this.prisma.user.upsert({
      where: { id: payload.sub },
      update: { email: payload.email },
      create: { id: payload.sub, email: payload.email },
    });

    return { id: payload.sub, email: payload.email };
  }
}
