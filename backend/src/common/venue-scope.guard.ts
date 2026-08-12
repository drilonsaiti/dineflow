import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { ROLES_KEY } from './roles.decorator';
import { VenueRole } from '@prisma/client';

/**
 * The single guard every venue-scoped route runs through (section 12).
 *
 * 1. Reads `:venueId` from the route params — this is the ONLY place a
 *    client-supplied venue id is trusted, and only after step 2 verifies it.
 * 2. Looks up the caller's VenueMembership for (userId, venueId). No row =
 *    403, full stop — a venue id in a URL/body is never enough on its own.
 * 3. If the route carries @Roles(...), the membership's role must be one of
 *    them, or 403.
 * 4. Attaches `{ venueId, role }` to the request as `req.venueScope`, which
 *    every controller/service reads via @CurrentVenue() instead of ever
 *    re-parsing the param themselves — one resolved, trusted source.
 *
 * Services then query through PrismaService.withVenueScope(venueId, ...),
 * which both scopes the Prisma query and sets the RLS session variable
 * described in ARCHITECTURE.md — belt and suspenders, not either/or.
 */
@Injectable()
export class VenueScopeGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const venueId: string | undefined = req.params?.venueId;
    const user = req.user;

    if (!venueId) {
      throw new ForbiddenException('Route is missing a venueId param');
    }
    if (!user) {
      // Should be unreachable — JwtAuthGuard runs first — but never assume.
      throw new ForbiddenException('No authenticated user');
    }

    const membership = await this.prisma.venueMembership.findUnique({
      where: { userId_venueId: { userId: user.id, venueId } },
    });

    if (!membership) {
      throw new ForbiddenException('Not a member of this venue');
    }

    const requiredRoles = this.reflector.getAllAndOverride<VenueRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (requiredRoles?.length && !requiredRoles.includes(membership.role)) {
      throw new ForbiddenException(`Requires one of: ${requiredRoles.join(', ')}`);
    }

    req.venueScope = { venueId, role: membership.role };
    return true;
  }
}
