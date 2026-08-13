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
        const { data, error } = await this.adminClient.auth.admin.inviteUserByEmail(dto.email, {
            redirectTo: `${process.env.PUBLIC_APP_URL ?? 'http://localhost:3000'}/admin`,
        });

        let userId: string;
        if (error) {
            // Most common failure here is "user already registered" — look them
            // up and add membership instead of treating it as a hard failure.
            const { data: existing } = await this.adminClient.auth.admin.listUsers();
            const found = existing.users.find((u) => u.email === dto.email);
            if (!found) throw new BadRequestException(error.message);
            userId = found.id;
        } else {
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