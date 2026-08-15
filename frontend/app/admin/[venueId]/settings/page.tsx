'use client';

import { useEffect, useState } from 'react';
import {
    useVenueSettings,
    useUpdateVenueSettings,
    useCreateCheckoutSession,
    useCreatePortalSession,
} from '@/hooks/useVenueSettings';

export default function VenueSettingsPage({ params }: { params: { venueId: string } }) {
    const { venueId } = params;
    const { data: venue, isLoading } = useVenueSettings(venueId);
    const updateMutation = useUpdateVenueSettings(venueId);
    const checkoutMutation = useCreateCheckoutSession(venueId);
    const portalMutation = useCreatePortalSession(venueId);

    const [webhookUrl, setWebhookUrl] = useState('');
    const [thresholdMinutes, setThresholdMinutes] = useState(10);
    const [type, setType] = useState('restaurant');
    const [logoUrl, setLogoUrl] = useState('');
    const [brandColor, setBrandColor] = useState('#111111');
    const [currency, setCurrency] = useState('USD');
    const [timezone, setTimezone] = useState('UTC');
    const [taxRatePercent, setTaxRatePercent] = useState('');
    const [taxInclusive, setTaxInclusive] = useState(true);
    const [autoPrintTickets, setAutoPrintTickets] = useState(false);
    const [printerBridgeUrl, setPrinterBridgeUrl] = useState('');
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [saved, setSaved] = useState(false);

    // Seed local form state once the query resolves — a form needs editable
    // local state distinct from server cache, so this doesn't collapse into
    // "just read venue.* directly" the way a read-only display would.
    useEffect(() => {
        if (!venue) return;
        setWebhookUrl(venue.staffAlertWebhookUrl ?? '');
        setThresholdMinutes(venue.lateOrderThresholdMinutes ?? 10);
        setType(venue.type ?? 'restaurant');
        setLogoUrl(venue.logoUrl ?? '');
        setBrandColor(venue.brandColor ?? '#111111');
        setCurrency(venue.currency ?? 'USD');
        setTimezone(venue.timezone ?? 'UTC');
        setTaxRatePercent(venue.taxRatePercent?.toString() ?? '');
        setTaxInclusive(venue.taxInclusive ?? true);
        setAutoPrintTickets(venue.autoPrintTickets ?? false);
        setPrinterBridgeUrl(venue.printerBridgeUrl ?? '');
    }, [venue]);

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

    async function save(e: React.FormEvent) {
        e.preventDefault();
        setSaved(false);
        await updateMutation.mutateAsync({
            staffAlertWebhookUrl: webhookUrl || undefined,
            lateOrderThresholdMinutes: thresholdMinutes,
            type,
            logoUrl: logoUrl || undefined,
            brandColor,
            currency,
            timezone,
            taxRatePercent: taxRatePercent ? Number(taxRatePercent) : undefined,
            taxInclusive,
            autoPrintTickets,
            printerBridgeUrl: printerBridgeUrl || undefined,
        });
        setSaved(true);
    }

    async function upgrade(plan: 'PRO' | 'BUSINESS') {
        const { url } = await checkoutMutation.mutateAsync(plan);
        window.location.href = url;
    }

    async function manageBilling() {
        try {
            const { url } = await portalMutation.mutateAsync();
            window.location.href = url;
        } catch (err: any) {
            alert(err.message);
        }
    }

    if (isLoading) return <div className="p-8 text-gray-500">Loading settings…</div>;

    return (
        <div className="mx-auto max-w-lg p-6 space-y-8">
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
                                {['USD', 'EUR', 'GBP', 'CHF', 'CAD', 'AUD'].map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div className="flex-1">
                            <label className="block text-sm font-medium">Timezone</label>
                            <input className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="Europe/Zurich" />
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div>
                            <label className="block text-sm font-medium">Tax rate % (optional)</label>
                            <input type="number" step="0.1" className="mt-1 w-24 rounded-md border border-gray-300 px-3 py-2 text-sm" value={taxRatePercent} onChange={(e) => setTaxRatePercent(e.target.value)} />
                        </div>
                        <div className="flex items-end pb-2">
                            <label className="flex items-center gap-2 text-sm">
                                <input type="checkbox" checked={taxInclusive} onChange={(e) => setTaxInclusive(e.target.checked)} />
                                Prices include tax
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            <form onSubmit={save} className="space-y-5 border-t border-gray-200 pt-6">
                <h2 className="text-lg font-semibold">Notification settings</h2>
                <div>
                    <label className="block text-sm font-medium">Staff alert webhook URL</label>
                    <p className="text-xs text-gray-500 mb-1">A Slack "Incoming Webhook" URL. Staff get pinged here when an order or table request sits unattended past the threshold below.</p>
                    <input type="url" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" placeholder="https://hooks.slack.com/services/…" value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} />
                </div>
                <div>
                    <label className="block text-sm font-medium">Late order threshold (minutes)</label>
                    <input type="number" min={1} className="w-24 rounded-md border border-gray-300 px-3 py-2 text-sm" value={thresholdMinutes} onChange={(e) => setThresholdMinutes(Number(e.target.value))} />
                </div>

                <div className="border-t border-gray-200 pt-4">
                    <h3 className="text-sm font-semibold">Kitchen printing</h3>
                    <label className="mt-2 flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={autoPrintTickets} onChange={(e) => setAutoPrintTickets(e.target.checked)} />
                        Auto-open a print ticket for every new order
                    </label>
                    <div className="mt-3">
                        <label className="block text-sm font-medium">ESC/POS bridge URL <span className="text-gray-400 font-normal">(advanced, optional)</span></label>
                        <input className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" placeholder="http://192.168.1.50:10100" value={printerBridgeUrl} onChange={(e) => setPrinterBridgeUrl(e.target.value)} />
                    </div>
                </div>

                <button type="submit" disabled={updateMutation.isPending} className="min-h-[44px] rounded-md bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                    {updateMutation.isPending ? 'Saving…' : 'Save'}
                </button>
                {saved && <p className="text-sm text-green-600">Saved.</p>}
            </form>

            <div className="border-t border-gray-200 pt-6">
                <h2 className="text-lg font-semibold">Plan & billing</h2>
                <p className="text-sm text-gray-500 mt-1">Free plan includes up to 10 tables and 30 days of analytics history.</p>
                <div className="mt-3 flex gap-3">
                    <button onClick={() => upgrade('PRO')} disabled={checkoutMutation.isPending} className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                        Upgrade to Pro
                    </button>
                    <button onClick={manageBilling} disabled={portalMutation.isPending} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium disabled:opacity-50">
                        Manage billing
                    </button>
                </div>
            </div>
        </div>
    );
}