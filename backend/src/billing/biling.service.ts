import {BadRequestException, Injectable, RawBodyRequest} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';
import {Request} from 'express';
import Stripe from 'stripe';
import {PrismaService} from '../prisma/prisma.service';

const PLAN_LIMITS = {
    FREE: {maxTables: 10, analyticsHistoryDays: 30},
    PRO: {maxTables: 30, analyticsHistoryDays: 90},
    BUSINESS: {maxTables: 100, analyticsHistoryDays: 365},
} as const;

@Injectable()
export class BillingService {
    private readonly stripe: Stripe;

    constructor(
        private readonly prisma: PrismaService,
        private readonly config: ConfigService,
    ) {
        this.stripe = new Stripe(config.getOrThrow('STRIPE_SECRET_KEY'));
    }

    private priceIdFor(plan: 'PRO' | 'BUSINESS'): string {
        const key = plan === 'PRO' ? 'STRIPE_PRICE_PRO' : 'STRIPE_PRICE_BUSINESS';
        return this.config.getOrThrow(key);
    }

    async createCheckoutSession(venueId: string, plan: 'PRO' | 'BUSINESS', userEmail: string) {
        const venue = await this.prisma.venue.findUniqueOrThrow({where: {id: venueId}});
        const frontendUrl = this.config.get('PUBLIC_APP_URL') ?? 'http://localhost:3000';

        const session = await this.stripe.checkout.sessions.create({
            mode: 'subscription',
            customer: venue.stripeCustomerId ?? undefined,
            customer_email: venue.stripeCustomerId ? undefined : userEmail,
            line_items: [{price: this.priceIdFor(plan), quantity: 1}],
            // metadata lands on the session AND (via subscription_data) on the
            // subscription itself, so the webhook can resolve venueId either way.
            metadata: {venueId},
            subscription_data: {metadata: {venueId}},
            success_url: `${frontendUrl}/admin/${venueId}/settings?billing=success`,
            cancel_url: `${frontendUrl}/admin/${venueId}/settings?billing=cancelled`,
        });

        return {url: session.url};
    }

    async createPortalSession(venueId: string) {
        const venue = await this.prisma.venue.findUniqueOrThrow({where: {id: venueId}});
        if (!venue.stripeCustomerId) {
            throw new BadRequestException('No billing account yet — upgrade first.');
        }
        const frontendUrl = this.config.get('PUBLIC_APP_URL') ?? 'http://localhost:3000';
        const session = await this.stripe.billingPortal.sessions.create({
            customer: venue.stripeCustomerId,
            return_url: `${frontendUrl}/admin/${venueId}/settings`,
        });
        return {url: session.url};
    }

    async handleWebhook(req: RawBodyRequest<Request>, signature: string) {
        if (!req.rawBody) throw new BadRequestException('Missing raw body');

        let event: Stripe.Event;
        try {
            event = this.stripe.webhooks.constructEvent(
                req.rawBody,
                signature,
                this.config.getOrThrow('STRIPE_WEBHOOK_SECRET'),
            );
        } catch (err) {
            throw new BadRequestException(`Webhook signature verification failed: ${(err as Error).message}`);
        }

        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                const venueId = session.metadata?.venueId;
                if (venueId && session.customer && session.subscription) {
                    await this.prisma.venue.update({
                        where: {id: venueId},
                        data: {
                            stripeCustomerId: session.customer as string,
                            stripeSubscriptionId: session.subscription as string,
                        },
                    });
                }
                break;
            }
            case 'customer.subscription.created':
            case 'customer.subscription.updated': {
                await this.syncSubscription(event.data.object as Stripe.Subscription);
                break;
            }
            case 'customer.subscription.deleted': {
                const sub = event.data.object as Stripe.Subscription;
                await this.prisma.venue.updateMany({
                    where: {stripeSubscriptionId: sub.id},
                    data: {plan: 'FREE', subscriptionStatus: 'CANCELLED', ...PLAN_LIMITS.FREE},
                });
                break;
            }
            default:
                break; // ignore event types we don't act on
        }

        return {received: true};
    }

    private async syncSubscription(sub: Stripe.Subscription) {
        const priceId = sub.items.data[0]?.price.id;
        const plan =
            priceId === this.config.get('STRIPE_PRICE_BUSINESS')
                ? 'BUSINESS'
                : priceId === this.config.get('STRIPE_PRICE_PRO')
                    ? 'PRO'
                    : 'FREE';

        const subscriptionStatus =
            sub.status === 'active' ? 'ACTIVE' : sub.status === 'past_due' ? 'PAST_DUE' : 'TRIALING';

        await this.prisma.venue.updateMany({
            where: {stripeSubscriptionId: sub.id},
            data: {plan, subscriptionStatus, ...PLAN_LIMITS[plan]},
        });
    }
}