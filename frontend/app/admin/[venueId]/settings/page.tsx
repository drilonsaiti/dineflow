'use client';

import { use, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';

export default function VenueSettingsPage({ params }: { params: Promise<{ venueId: string }> }) {
    const { venueId } = use(params);
    const [webhookUrl, setWebhookUrl] = useState('');
    const [thresholdMinutes, setThresholdMinutes] = useState(10);
    const [saving, setSaving] = useState(false);
    const [type, setType] = useState('restaurant');
    const [logoUrl, setLogoUrl] = useState('');
    const [brandColor, setBrandColor] = useState('#111111');
    const [currency, setCurrency] = useState('USD');
    const [timezone, setTimezone] = useState('UTC');
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const showToast = useToast();

    useEffect(() => {
        api.get<any>(`/venues/${venueId}`).then((venue) => {
            setWebhookUrl(venue.staffAlertWebhookUrl ?? '');
            setThresholdMinutes(venue.lateOrderThresholdMinutes);
            setType(venue.type ?? 'restaurant');
            setLogoUrl(venue.logoUrl ?? '');
            setBrandColor(venue.brandColor ?? '#111111');
            setCurrency(venue.currency ?? 'USD');
            setTimezone(venue.timezone ?? 'UTC');
        });
    }, [venueId]);

    async function save(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        try {
            await api.post(`/venues/${venueId}/settings`, {
                staffAlertWebhookUrl: webhookUrl || undefined,
                lateOrderThresholdMinutes: thresholdMinutes,
                type,
                logoUrl: logoUrl || undefined,
                brandColor,
                currency,
                timezone,
            });
            showToast('Settings saved');
        } catch (err: unknown) {
            showToast(err instanceof Error ? err.message : 'Failed to save settings', 'error');
        } finally {
            setSaving(false);
        }
    }

    async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingLogo(true);
        try {
            const token = await (await import('@/lib/supabase')).getAccessToken();
            const formData = new FormData();
            formData.append('file', file);
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/venues/${venueId}/uploads/image`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });
            if (!res.ok) throw new Error((await res.json()).message ?? 'Upload failed');
            const { url } = await res.json();
            setLogoUrl(url);
        } catch (err: any) {
            alert(err.message);
        } finally {
            setUploadingLogo(false);
        }
    }

    return (
        <div className="mx-auto max-w-lg p-6">
            <h1 className="text-2xl">Notification settings</h1>
            <form onSubmit={save} className="mt-6 space-y-5">
                <div>
                    <h1 className="text-2xl font-semibold">Venue profile</h1>
                    <div className="mt-4 space-y-4">
                        <div>
                            <label className="block text-sm font-medium">Venue type</label>
                            <select className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={type} onChange={(e) => setType(e.target.value)}>
                                <option value="restaurant">Restaurant</option>
                                <option value="cafe">Café</option>
                                <option value="bar">Bar</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Logo</label>
                            <div className="mt-1 flex items-center gap-3">
                                {logoUrl ? <img src={logoUrl} alt="" className="h-12 w-12 rounded-full object-cover" /> : <div className="h-12 w-12 rounded-full bg-gray-200" />}
                                <label className="rounded-md border border-gray-300 px-3 py-1.5 text-sm cursor-pointer">
                                    {uploadingLogo ? 'Uploading…' : 'Upload logo'}
                                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                                </label>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div>
                                <label className="block text-sm font-medium">Brand color</label>
                                <input type="color" className="mt-1 h-10 w-16 rounded border border-gray-300" value={brandColor} onChange={(e) => setBrandColor(e.target.value)} />
                            </div>
                            <div className="flex-1">
                                <label className="block text-sm font-medium">Currency</label>
                                <select className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                                    {['DEN','USD', 'EUR', 'GBP', 'CHF', 'CAD', 'AUD'].map((c) => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className="flex-1">
                                <label className="block text-sm font-medium">Timezone</label>
                                <input className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="Europe/Zurich" />
                            </div>
                        </div>
                    </div>
                </div>

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

                <div className="border-t border-gray-200 pt-6">
                    <h2 className="text-lg font-semibold">Plan & billing</h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Free plan includes up to 10 tables and 30 days of analytics history.
                    </p>
                    <div className="mt-3 flex gap-3">
                        <button
                            onClick={async () => {
                                const { url } = await api.post<{ url: string }>(`/venues/${venueId}/billing/checkout-session`, { plan: 'PRO' });
                                window.location.href = url;
                            }}
                            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white"
                        >
                            Upgrade to Pro
                        </button>
                        <button
                            onClick={async () => {
                                try {
                                    const { url } = await api.post<{ url: string }>(`/venues/${venueId}/billing/portal-session`, {});
                                    window.location.href = url;
                                } catch (err: any) {
                                    alert(err.message);
                                }
                            }}
                            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium"
                        >
                            Manage billing
                        </button>
                    </div>
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