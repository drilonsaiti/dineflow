// Generates a short beep using the Web Audio API instead of requiring a
// static MP3 file — works everywhere immediately, no asset pipeline, and
// can't 404. Two distinct tones so "new order" and "table request" are
// audibly different without needing two separate audio files.
export function playNotificationSound(kind: 'order' | 'table-request') {
    try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.connect(gain);
        gain.connect(ctx.destination);

        oscillator.frequency.value = kind === 'order' ? 880 : 660; // A5 vs E5 — distinct pitch per event type
        oscillator.type = 'sine';
        gain.gain.setValueAtTime(0.15, ctx.currentTime); // quiet — this plays constantly on a busy dashboard
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.3);

        // Second beep for table requests — a slightly more attention-grabbing double-beep since it's guest-facing urgency
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
    } catch {
        // Web Audio unsupported/blocked — non-fatal, same as before
    }
}