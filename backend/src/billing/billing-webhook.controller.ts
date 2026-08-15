import {Controller, Headers, Post, RawBodyRequest, Req} from '@nestjs/common';
import {Request} from 'express';
import {Public} from '../auth/public.decorator';
import {BillingService} from "./biling.service";

// Stripe posts here directly — no venue scope, authenticated by signature
// verification against STRIPE_WEBHOOK_SECRET instead of a JWT.
@Controller('billing/webhook')
export class BillingWebhookController {
    constructor(private readonly billingService: BillingService) {
    }

    @Public()
    @Post()
    handle(@Req() req: RawBodyRequest<Request>, @Headers('stripe-signature') signature: string) {
        return this.billingService.handleWebhook(req, signature);
    }
}