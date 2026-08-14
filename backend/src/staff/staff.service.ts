import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { PrismaService } from '../prisma/prisma.service';
import { InviteStaffDto } from './dto/invite-staff.dto';

@Injectable()
export class StaffService {
    private readonly adminClient: SupabaseClient;

    constructor(
        private readonly prisma: PrismaService,
        config: ConfigService,
    ) {
        // service_role key — same one StorageService already uses — required for
        // the admin.inviteUserByEmail / admin.listUsers calls below. Never sent
        // to the frontend.
        this.adminClient = createClient(
            config.getOrThrow('SUPABASE_URL'),
            config.getOrThrow('SUPABASE_SERVICE_ROLE_KEY'),
        );
    }

    async list(venueId: string) {
        return this.prisma.withVenueScope(venueId, (tx) =>
            tx.venueMembership.findMany({
                where: { venueId },
                include: { user: { select: { id: true, email: true, fullName: true } } },
                orderBy: { createdAt: 'asc' },
            }),
        );
    }

    /** Invites by email via Supabase's admin API — creates the auth user if
     * they don't exist yet and sends them a magic-link-style invite email,
     * then grants venue membership immediately so clicking the link drops
     * them straight into the venue rather than a separate "accept" step. */
    async invite(venueId: string, dto: InviteStaffDto) {
        const venue = await this.prisma.venue.findUniqueOrThrow({ where: { id: venueId } });
        const currentCount = await this.prisma.venueMembership.count({ where: { venueId } });
        if (currentCount >= venue.maxStaff) {
            throw new BadRequestException(
                `Your plan (${venue.plan}) allows up to ${venue.maxStaff} staff members. Upgrade to add more.`,
            );
        }

        // Look up first — inviteUserByEmail errors if the email already has an
        // account (e.g. they're staff at another venue on this platform).
        const { data: existing } = await this.adminClient.auth.admin.listUsers();
        const found = existing.users.find((u) => u.email === dto.email);

        let userId: string;
        if (found) {
            // Reset their password to the new PIN so the owner's freshly-set PIN
            // is always the one that works, even if they already had an account.
            await this.adminClient.auth.admin.updateUserById(found.id, { password: dto.pin });
            userId = found.id;
        } else {
            const { data, error } = await this.adminClient.auth.admin.createUser({
                email: dto.email,
                password: dto.pin,
                email_confirm: true, // skip the confirmation-email step entirely — owner is vouching for this person directly
            });
            if (error || !data.user) throw new BadRequestException(error?.message ?? 'Could not create account');
            userId = data.user.id;
        }

        await this.prisma.user.upsert({
            where: { id: userId },
            update: { email: dto.email },
            create: { id: userId, email: dto.email },
        });

        return this.prisma.withVenueScope(venueId, (tx) =>
            tx.venueMembership.upsert({
                where: { userId_venueId: { userId, venueId } },
                update: { role: dto.role },
                create: { userId, venueId, role: dto.role },
            }),
        );
    }

    async remove(venueId: string, membershipUserId: string, requestingUserId: string) {
        if (membershipUserId === requestingUserId) {
            throw new BadRequestException("You can't remove yourself from the venue.");
        }
        return this.prisma.withVenueScope(venueId, (tx) =>
            tx.venueMembership.delete({ where: { userId_venueId: { userId: membershipUserId, venueId } } }),
        );
    }
}