import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVenueDto } from './dto/create-venue.dto';
import { VenueRole } from '@prisma/client';

const MAX_FREE_VENUES = 1;

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

@Injectable()
export class VenuesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Creates a venue and makes the calling user its OWNER, atomically.
   * This is the one place venue creation happens outside the venue-scoped
   * guard (there's no venue yet to scope to) — every other route on this
   * venue requires the membership row created here. */
  async create(userId: string, dto: CreateVenueDto) {
    const ownedCount = await this.prisma.venueMembership.count({
      where: { userId, role: VenueRole.OWNER },
    });
    if (ownedCount >= MAX_FREE_VENUES) {
      const paidVenue = await this.prisma.venue.findFirst({
        where: { memberships: { some: { userId, role: VenueRole.OWNER } }, plan: { not: 'FREE' } },
      });
      if (!paidVenue) {
        throw new ConflictException(
            `Your account already has a venue on the free plan. Upgrade that venue's plan to add another.`,
        );
      }
    }

    const slug = dto.slug ? slugify(dto.slug) : slugify(dto.name);
    const existing = await this.prisma.venue.findUnique({ where: { slug } });
    if (existing) throw new ConflictException(`Slug "${slug}" is already taken`);

    return this.prisma.venue.create({
      data: {
        name: dto.name,
        slug,
        type: dto.type,
        brandColor: dto.brandColor,
        currency: dto.currency ?? 'USD',
        timezone: dto.timezone ?? 'UTC',
        memberships: { create: { userId, role: VenueRole.OWNER } },
      },
    });
  }

  /** Venues the caller belongs to, across all their memberships (section 3:
   * a user can belong to multiple venues). */
  async listForUser(userId: string) {
    return this.prisma.venue.findMany({
      where: { memberships: { some: { userId } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Already-guarded by VenueScopeGuard by the time this runs — venueId is trusted. */
  async getById(venueId: string) {
    const venue = await this.prisma.venue.findUnique({ where: { id: venueId } });
    if (!venue) throw new NotFoundException('Venue not found');
    return venue;
  }

  async updateSettings(venueId: string, dto: { staffAlertWebhookUrl?: string; lateOrderThresholdMinutes?: number }) {
    return this.prisma.venue.update({ where: { id: venueId }, data: dto });
  }
}
