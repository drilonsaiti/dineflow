'use client';

import {use, useEffect, useState} from 'react';
import {
    useCreateCheckoutSession,
    useCreatePortalSession,
    useUpdateVenueSettings,
    useVenueSettings,
} from '@/hooks/useVenueSettings';
import {Checkbox} from '@/components/ui/Checkbox';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/Select';
import {useToast} from '@/components/ui/Toast';
import {RequireOwnerOrManager} from "@/components/RequireOwnerOrManager";
import {AVAILABLE_LANGUAGES} from "@/lib/languages";

export default function VenueSettingsPage({params}: { params: Promise<{ venueId: string }> }) {
    const {venueId} = use(params);
    const {data: venue, isLoading} = useVenueSettings(venueId);
    const updateMutation = useUpdateVenueSettings(venueId);
    const checkoutMutation = useCreateCheckoutSession(venueId);
    const portalMutation = useCreatePortalSession(venueId);
    const showToast = useToast();

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
    const [latitude, setLatitude] = useState('');
    const [longitude, setLongitude] = useState('');
    const [supportedLanguages, setSupportedLanguages] = useState<string[]>([]);

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
        setLatitude(venue.latitude?.toString() ?? '');
        setLongitude(venue.longitude?.toString() ?? '');
        setSupportedLanguages(venue.supportedLanguages ?? []);
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
                headers: {Authorization: `Bearer ${token}`},
                body: formData,
            });
            if (!res.ok) throw new Error((await res.json()).message ?? 'Upload failed');
            const {url} = await res.json();
            setLogoUrl(url);
            showToast('Logo uploaded', 'success');
        } catch (err: any) {
            showToast(err.message ?? 'Upload failed', 'error');
        } finally {
            setUploadingLogo(false);
        }
    }

    async function save(e: React.FormEvent) {
        e.preventDefault();
        try {
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
                latitude: latitude ? Number(latitude) : undefined,
                longitude: longitude ? Number(longitude) : undefined,
                supportedLanguages
            });
            showToast('Settings saved', 'success');
        } catch (err: any) {
            showToast(err.message ?? 'Failed to save settings', 'error');
        }
    }

    async function upgrade(plan: 'PRO' | 'BUSINESS') {
        try {
            const {url} = await checkoutMutation.mutateAsync(plan);
            window.location.href = url;
        } catch (err: any) {
            showToast(err.message ?? 'Failed to start checkout', 'error');
        }
    }

    async function manageBilling() {
        try {
            const {url} = await portalMutation.mutateAsync();
            window.location.href = url;
        } catch (err: any) {
            showToast(err.message ?? 'Failed to open billing portal', 'error');
        }
    }

    if (isLoading) return <div className="p-8 text-muted-soft">Loading settings…</div>;

    return (
        <RequireOwnerOrManager venueId={venueId}>
            <div className="mx-auto max-w-lg p-6 space-y-8">
                <div className="flex flex-wrap gap-4">
                    <div>
                        <label className="block text-sm font-medium text-ink dark:text-white">Brand color</label>
                        <input type="color" className="mt-1 h-10 w-16 rounded border border-hairline dark:border-gray-700" value={brandColor} onChange={(e) => setBrandColor(e.target.value)} />
                    </div>
                    <div className="min-w-[140px] flex-1">
                        <label className="block text-sm font-medium text-ink dark:text-white">Currency</label>
                        <Select value={currency} onValueChange={setCurrency}>
                            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {['USD', 'EUR', 'GBP', 'CHF', 'CAD', 'AUD', 'MKD'].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="min-w-[140px] flex-1">
                        <label className="block text-sm font-medium text-ink dark:text-white">Timezone</label>
                        <input className="input mt-1" value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="Europe/Zurich" />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-ink dark:text-white">Menu languages</label>
                    <p className="mt-1 text-xs text-muted">
                        English (your default menu text) is always shown. Pick any additional languages you've
                        translated menu items into — translations are added per-item on the Menu page.
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                        {AVAILABLE_LANGUAGES.map((lang) => {
                            const checked = supportedLanguages.includes(lang.code);
                            return (
                                <button
                                    key={lang.code}
                                    type="button"
                                    onClick={() =>
                                        setSupportedLanguages((prev) =>
                                            checked ? prev.filter((c) => c !== lang.code) : [...prev, lang.code],
                                        )
                                    }
                                    className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                                        checked ? 'bg-ink text-white dark:bg-white dark:text-ink' : 'bg-surface-strong text-muted dark:bg-gray-700'
                                    }`}
                                >
                                    {lang.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="flex flex-wrap items-end gap-4">
                    <div className="w-24">
                        <label className="block text-sm font-medium text-ink dark:text-white">Tax rate % (optional)</label>
                        <input type="number" step="0.1" className="input mt-1 w-24" value={taxRatePercent} onChange={(e) => setTaxRatePercent(e.target.value)} />
                    </div>
                    <label className="flex cursor-pointer select-none items-center gap-2 pb-2.5 text-sm text-ink dark:text-white">
                        <Checkbox checked={taxInclusive} onCheckedChange={(c) => setTaxInclusive(c === true)} />
                        Prices include tax
                    </label>
                </div>

                <div className="mt-6 space-y-2">
                    <p className="text-sm font-medium text-ink dark:text-white">Venue location</p>
                    <div className="flex flex-wrap items-end gap-4">
                        <div>
                            <label className="block text-sm font-medium text-ink dark:text-white">Latitude</label>
                            <input className="input mt-1 w-32" value={latitude} onChange={(e) => setLatitude(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-ink dark:text-white">Longitude</label>
                            <input className="input mt-1 w-32" value={longitude} onChange={(e) => setLongitude(e.target.value)} />
                        </div>
                        <button
                            type="button"
                            onClick={() => navigator.geolocation.getCurrentPosition((p) => {
                                setLatitude(p.coords.latitude.toString());
                                setLongitude(p.coords.longitude.toString());
                            })}
                            className="pb-2.5 text-sm font-medium text-ink underline dark:text-white"
                        >
                            Use my current location
                        </button>
                    </div>
                    <p className="text-xs text-muted">
                        Used only as a soft signal flagging orders placed far from the venue — never blocks an order.
                    </p>
                </div>

                <form onSubmit={save} className="space-y-5 border-t border-hairline pt-6 dark:border-gray-800">
                    <h2 className="text-lg">Notification settings</h2>
                    <div>
                        <label className="block text-sm font-medium text-ink dark:text-white">Staff alert webhook
                            URL</label>
                        <p className="mb-1 text-xs text-muted">
                            A Slack "Incoming Webhook" URL. Staff get pinged here when an order or table request sits
                            unattended past the threshold below.
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
                        <label className="block text-sm font-medium text-ink dark:text-white">Late order threshold
                            (minutes)</label>
                        <input
                            type="number"
                            min={1}
                            className="input w-24"
                            value={thresholdMinutes}
                            onChange={(e) => setThresholdMinutes(Number(e.target.value))}
                        />
                    </div>

                    <div className="border-t border-hairline pt-4 dark:border-gray-800">
                        <h3 className="text-sm font-semibold text-ink dark:text-white">Kitchen printing</h3>
                        <label
                            className="mt-2 flex cursor-pointer select-none items-center gap-2 text-sm text-ink dark:text-white">
                            <Checkbox checked={autoPrintTickets}
                                      onCheckedChange={(c) => setAutoPrintTickets(c === true)}/>
                            Auto-open a print ticket for every new order
                        </label>
                        <div className="mt-3">
                            <label className="block text-sm font-medium text-ink dark:text-white">
                                ESC/POS bridge URL <span
                                className="font-normal text-muted-soft">(advanced, optional)</span>
                            </label>
                            <input
                                className="input mt-1"
                                placeholder="http://192.168.1.50:10100"
                                value={printerBridgeUrl}
                                onChange={(e) => setPrinterBridgeUrl(e.target.value)}
                            />
                        </div>
                    </div>

                    <button type="submit" disabled={updateMutation.isPending} className="btn-primary">
                        {updateMutation.isPending ? 'Saving…' : 'Save'}
                    </button>
                </form>

                <div className="border-t border-hairline pt-6 dark:border-gray-800">
                    <h2 className="text-lg">Plan & billing</h2>
                    <p className="mt-1 text-sm text-muted">Free plan includes up to 10 tables and 30 days of analytics
                        history.</p>
                    <div className="mt-3 flex gap-3">
                        <button onClick={() => upgrade('PRO')} disabled={checkoutMutation.isPending}
                                className="btn-primary">
                            Upgrade to Pro
                        </button>
                        <button onClick={manageBilling} disabled={portalMutation.isPending} className="btn-secondary">
                            Manage billing
                        </button>
                    </div>
                </div>
            </div>
        </RequireOwnerOrManager>
    );
}