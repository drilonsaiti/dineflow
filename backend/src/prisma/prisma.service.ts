import {BadRequestException, Injectable, OnModuleDestroy, OnModuleInit} from '@nestjs/common';
import {PrismaClient} from '@prisma/client';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    async onModuleInit() {
        await this.$connect();
    }

    async onModuleDestroy() {
        await this.$disconnect();
    }

    /**
     * Runs `work` inside a transaction with the Postgres session variable
     * `app.current_venue_id` set to `venueId`. This is the RLS backstop
     * described in ARCHITECTURE.md.
     *
     * SECURITY: `SET LOCAL` cannot use bind parameters (Postgres's simple
     * `SET` command isn't part of the parameterized-query protocol the way
     * `SELECT`/`INSERT`/etc are), so this is the one place in the codebase
     * that builds a raw SQL string from a variable. The mitigation is strict
     * validation, not parameterization: venueId is rejected outright unless
     * it's a syntactically valid UUID, which makes it impossible for this
     * string to contain SQL syntax regardless of where the caller's venueId
     * originated. Every caller of this method gets venueId from
     * VenueScopeGuard's verified membership lookup or a Prisma-returned
     * record — never raw, unvalidated user input — but this check holds even
     * if that ever changes.
     */
    async withVenueScope<T>(venueId: string, work: (tx: PrismaClient) => Promise<T>): Promise<T> {
        if (!UUID_RE.test(venueId)) {
            throw new BadRequestException('Invalid venue id');
        }
        return this.$transaction(async (tx) => {
            await tx.$executeRawUnsafe(`SET LOCAL app.current_venue_id = '${venueId}'`);
            return work(tx as unknown as PrismaClient);
        });
    }
}