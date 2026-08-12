'use client';

import { use, useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function VenueSettingsPage({ params }: { params: Promise<{ venueId: string }> }) {
    const { venueId } = use(params);
    const [webhookUrl, setWebhookUrl] = useState('');
    const [thresholdMinutes, setThresholdMinutes] = useState(10);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

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
        setSaved(false);
        try {
            await api.post(`/venues/${venueId}/settings`, {
                staffAlertWebhookUrl: webhookUrl || undefined,
                lateOrderThresholdMinutes: thresholdMinutes,
            });
            setSaved(true);
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="mx-auto max-w-lg p-6">
            <h1 className="text-2xl font-semibold">Notification settings</h1>
            <form onSubmit={save} className="mt-6 space-y-5">
                <div>
                    <label className="block text-sm font-medium">Staff alert webhook URL</label>
                    <p className="text-xs text-gray-500 mb-1">
                        A Slack "Incoming Webhook" URL (or any endpoint that accepts a JSON POST). Staff
                        get pinged here when an order sits unattended past the threshold below.
                    </p>
                    <input
                        type="url"
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        placeholder="https://hooks.slack.com/services/…"
                        value={webhookUrl}
                        onChange={(e) => setWebhookUrl(e.target.value)}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium">Late order threshold (minutes)</label>
                    <input
                        type="number"
                        min={1}
                        className="w-24 rounded-md border border-gray-300 px-3 py-2 text-sm"
                        value={thresholdMinutes}
                        onChange={(e) => setThresholdMinutes(Number(e.target.value))}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Also controls the "sitting too long" highlight on the staff dashboard.
                    </p>
                </div>
                <button
                    type="submit"
                    disabled={saving}
                    className="min-h-[44px] rounded-md bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                    {saving ? 'Saving…' : 'Save'}
                </button>
                {saved && <p className="text-sm text-green-600">Saved.</p>}
            </form>
        </div>
    );
}