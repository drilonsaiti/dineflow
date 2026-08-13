'use client';

import { use, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';

export default function VenueSettingsPage({ params }: { params: Promise<{ venueId: string }> }) {
    const { venueId } = use(params);
    const [webhookUrl, setWebhookUrl] = useState('');
    const [thresholdMinutes, setThresholdMinutes] = useState(10);
    const [saving, setSaving] = useState(false);
    const showToast = useToast();

    useEffect(() => {
        api.get<{ staffAlertWebhookUrl: string | null; lateOrderThresholdMinutes: number }>(
            `/venues/${venueId}`,
        ).then((venue) => {
            setWebhookUrl(venue.staffAlertWebhookUrl ?? '');
            setThresholdMinutes(venue.lateOrderThresholdMinutes);
        });
    }, [venueId]);

    async function save(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        try {
            await api.post(`/venues/${venueId}/settings`, {
                staffAlertWebhookUrl: webhookUrl || undefined,
                lateOrderThresholdMinutes: thresholdMinutes,
            });
            showToast('Settings saved');
        } catch (err: unknown) {
            showToast(err instanceof Error ? err.message : 'Failed to save settings', 'error');
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="mx-auto max-w-lg p-6">
            <h1 className="text-2xl">Notification settings</h1>
            <form onSubmit={save} className="mt-6 space-y-5">
                <div>
                    <label className="block text-sm font-medium text-ink dark:text-white">Staff alert webhook URL</label>
                    <p className="text-xs text-muted mb-1">
                        A Slack "Incoming Webhook" URL (or any endpoint that accepts a JSON POST). Staff
                        get pinged here when an order sits unattended past the threshold below.
                    </p>
                    <input
                        type="url"
                        className="input"
                        placeholder="https://hooks.slack.com/services/…"
                        value={webhookUrl}
                        onChange={(e) => setWebhookUrl(e.target.value)}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-ink dark:text-white">Late order threshold (minutes)</label>
                    <input
                        type="number"
                        min={1}
                        className="input w-24"
                        value={thresholdMinutes}
                        onChange={(e) => setThresholdMinutes(Number(e.target.value))}
                    />
                    <p className="text-xs text-muted mt-1">
                        Also controls the "sitting too long" highlight on the staff dashboard.
                    </p>
                </div>
                <button type="submit" disabled={saving} className="btn-primary">
                    {saving ? 'Saving…' : 'Save'}
                </button>
            </form>
        </div>
    );
}