import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

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
   * `app.current_venue_id` set to `venueId`. RLS policies (see
   * prisma/migrations/*_enable_rls) key off this variable as the backstop
   * described in ARCHITECTURE.md — NestJS has already verified the caller's
   * membership before this is ever called; this makes that guarantee hold
   * even if a query inside `work` forgets its own WHERE venueId clause.
   */
  async withVenueScope<T>(venueId: string, work: (tx: PrismaClient) => Promise<T>): Promise<T> {
    return this.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SET LOCAL app.current_venue_id = '${venueId}'`);
      return work(tx as unknown as PrismaClient);
    });
  }
}
