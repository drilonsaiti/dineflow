// Generates a short beep using the Web Audio API instead of requiring a
// static MP3 file — works everywhere immediately, no asset pipeline, and
// can't 404. Two distinct tones so "new order" and "table request" are
// audibly different without needing two separate audio files.
export function playNotificationSound(kind: 'order' | 'table-request' | 'ready') {
    try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.connect(gain);
        gain.connect(ctx.destination);

        // 'ready' gets its own pitch — distinct from a new-order alert (880Hz)
        // and a table-request double-beep (660Hz), so a waiter can tell which
        // kind of event just happened without looking at the screen.
        oscillator.frequency.value = kind === 'order' ? 880 : kind === 'ready' ? 1046 : 660;
        oscillator.type = 'sine';
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.3);

        if (kind === 'table-request') {
            const oscillator2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            oscillator2.connect(gain2);
            gain2.connect(ctx.destination);
            oscillator2.frequency.value = 880;
            oscillator2.type = 'sine';
            gain2.gain.setValueAtTime(0.15, ctx.currentTime + 0.35);
            gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
            oscillator2.start(ctx.currentTime + 0.35);
            oscillator2.stop(ctx.currentTime + 0.6);
        }

        // 'ready' gets a quick double-chime too — a plate sitting under the
        // heat lamp is more time-sensitive than a passive "order created" ping,
        // worth being a little more attention-grabbing.
        if (kind === 'ready') {
            const oscillator2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            oscillator2.connect(gain2);
            gain2.connect(ctx.destination);
            oscillator2.frequency.value = 1318;
            oscillator2.type = 'sine';
            gain2.gain.setValueAtTime(0.15, ctx.currentTime + 0.15);
            gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
            oscillator2.start(ctx.currentTime + 0.15);
            oscillator2.stop(ctx.currentTime + 0.45);
        }
    } catch {
        // Web Audio unsupported/blocked — non-fatal
    }
}