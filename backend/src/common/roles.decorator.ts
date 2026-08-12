import { SetMetadata } from '@nestjs/common';
import { VenueRole } from '@prisma/client';

export const ROLES_KEY = 'roles';

/** Restricts a route to members with one of the given venue roles. */
export const Roles = (...roles: VenueRole[]) => SetMetadata(ROLES_KEY, roles);
