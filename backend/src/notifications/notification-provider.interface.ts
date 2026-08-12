/**
 * The seam a real integration plugs into (section 15). Nothing in
 * NotificationsService talks to Twilio/SendGrid/Slack directly — it only
 * calls these interfaces, so swapping a stub for a real provider is a
 * one-file change (implement the interface, update the module's provider
 * binding), never a rewrite of call sites.
 */
export interface SmsProvider {
    send(toPhoneNumber: string, message: string): Promise<{ ok: boolean; detail?: string }>;
}

export interface WebhookProvider {
    post(url: string, payload: unknown): Promise<{ ok: boolean; detail?: string }>;
}

export const SMS_PROVIDER = Symbol('SMS_PROVIDER');
export const WEBHOOK_PROVIDER = Symbol('WEBHOOK_PROVIDER');