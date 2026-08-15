import {createParamDecorator, ExecutionContext} from '@nestjs/common';
import {AuthenticatedUser} from '../auth/supabase-jwt.strategy';

export const CurrentUser = createParamDecorator(
    (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
        const req = ctx.switchToHttp().getRequest();
        return req.user;
    },
);

/** Set by VenueScopeGuard once membership is verified — the venue id every
 * downstream service/query should scope to, resolved server-side, never
 * trusted blindly from a client-supplied param (see ARCHITECTURE.md). */
export const CurrentVenue = createParamDecorator(
    (_data: unknown, ctx: ExecutionContext): { venueId: string; role: string } => {
        const req = ctx.switchToHttp().getRequest();
        return req.venueScope;
    },
);
