import Link from 'next/link';

export default function HomePage() {
    return (
        <div className="min-h-screen bg-[#14130F] text-[#FBF8F0] [font-family:'Inter',sans-serif]">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');

                @keyframes stamp {
                    0%, 8%   { opacity: 0.25; transform: scale(0.94); }
                    12%, 28% { opacity: 1; transform: scale(1); }
                    32%, 100% { opacity: 0.25; transform: scale(0.94); }
                }
                .stamp-received { animation: stamp 3.6s infinite; animation-delay: 0s; }
                .stamp-preparing { animation: stamp 3.6s infinite; animation-delay: 1.2s; }
                .stamp-ready { animation: stamp 3.6s infinite; animation-delay: 2.4s; }

                @media (prefers-reduced-motion: reduce) {
                    .stamp-received, .stamp-preparing, .stamp-ready {
                        animation: none;
                        opacity: 1;
                        transform: none;
                    }
                }
            `}</style>

            {/* Nav */}
            <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
                <span className="[font-family:'Space_Grotesk',sans-serif] text-lg font-bold tracking-tight">
                    DineFlow
                </span>
                <div className="hidden items-center gap-8 text-sm text-[#B8B3A4] sm:flex">
                    <a href="#how" className="hover:text-[#FBF8F0]">How it works</a>
                    <a href="#features" className="hover:text-[#FBF8F0]">Features</a>
                    <a href="#pricing" className="hover:text-[#FBF8F0]">Pricing</a>
                </div>
                <div className="flex items-center gap-4">
                    <Link href="/admin/login" className="hidden text-sm text-[#B8B3A4] hover:text-[#FBF8F0] sm:block">
                        Sign in
                    </Link>
                    <Link
                        href="/admin/login"
                        className="rounded-md bg-[#2E9E6C] px-4 py-2 text-sm font-medium text-[#0F1410] hover:bg-[#37B37D]"
                    >
                        Get started free
                    </Link>
                </div>
            </nav>

            {/* Hero */}
            <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 sm:py-24 lg:grid-cols-2">
                <div>
                    <p className="[font-family:'IBM_Plex_Mono',monospace] text-xs uppercase tracking-[0.2em] text-[#2E9E6C]">
                        No app. No login. No hardware.
                    </p>
                    <h1 className="mt-4 [font-family:'Space_Grotesk',sans-serif] text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
                        Every table, a menu.<br />Every order, live.
                    </h1>
                    <p className="mt-5 max-w-md text-[#B8B3A4]">
                        Print a QR code for each table. Customers order from their phone in one tap.
                        Your kitchen sees it the second it lands — no runner, no notepad, no missed order.
                    </p>
                    <div className="mt-8 flex flex-wrap gap-4">
                        <Link
                            href="/admin/login"
                            className="flex min-h-[44px] items-center rounded-md bg-[#2E9E6C] px-6 py-3 font-medium text-[#0F1410] hover:bg-[#37B37D]"
                        >
                            Get started free
                        </Link>
                        <Link
                            href="#how"
                            className="flex min-h-[44px] items-center rounded-md border border-[#3A362C] px-6 py-3 font-medium text-[#FBF8F0] hover:bg-[#1E1C17]"
                        >
                            See how it works
                        </Link>
                    </div>
                </div>

                {/* Signature: live order ticket */}
                <div className="flex justify-center lg:justify-end">
                    <div className="w-72 rounded-lg bg-[#FBF8F0] p-6 text-[#14130F] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)]">
                        <p className="[font-family:'IBM_Plex_Mono',monospace] text-xs tracking-wide text-[#8A8371]">
                            TABLE 04 · ORDER #0032
                        </p>
                        <div className="my-3 border-t border-dashed border-[#D9D2BC]" />
                        <ul className="[font-family:'IBM_Plex_Mono',monospace] space-y-1.5 text-sm">
                            <li className="flex justify-between"><span>1× Margherita</span><span>9.50</span></li>
                            <li className="flex justify-between"><span>1× Iced Latte</span><span>4.00</span></li>
                        </ul>
                        <div className="my-3 border-t border-dashed border-[#D9D2BC]" />
                        <div className="flex justify-between [font-family:'IBM_Plex_Mono',monospace] text-sm font-medium">
                            <span>TOTAL</span><span>13.50</span>
                        </div>
                        <div className="mt-5 flex gap-2">
                            <span className="stamp-received rounded border border-[#8A8371] px-2 py-1 [font-family:'IBM_Plex_Mono',monospace] text-[10px] uppercase tracking-wide text-[#8A8371]">
                                Received
                            </span>
                            <span className="stamp-preparing rounded border border-[#F2A93C] px-2 py-1 [font-family:'IBM_Plex_Mono',monospace] text-[10px] uppercase tracking-wide text-[#B87A1E]">
                                Preparing
                            </span>
                            <span className="stamp-ready rounded border border-[#2E9E6C] px-2 py-1 [font-family:'IBM_Plex_Mono',monospace] text-[10px] uppercase tracking-wide text-[#1E6E4E]">
                                Ready
                            </span>
                        </div>
                    </div>
                </div>
            </section>

            {/* How it works */}
            <section id="how" className="border-t border-[#221F19] px-6 py-20">
                <div className="mx-auto max-w-6xl">
                    <h2 className="[font-family:'Space_Grotesk',sans-serif] text-2xl font-bold">How it works</h2>
                    <div className="mt-10 grid gap-6 sm:grid-cols-3">
                        {[
                            { n: '01', t: 'Scan', d: 'The customer scans the code taped to their table. No download, no account.' },
                            { n: '02', t: 'Order', d: 'They browse the menu and send the order straight to your kitchen.' },
                            { n: '03', t: 'Track', d: 'They watch it move from received to ready, right on their phone.' },
                        ].map((s) => (
                            <div key={s.n} className="rounded-lg border border-[#221F19] p-6">
                                <span className="[font-family:'IBM_Plex_Mono',monospace] text-sm text-[#2E9E6C]">{s.n}</span>
                                <h3 className="mt-3 [font-family:'Space_Grotesk',sans-serif] text-lg font-bold">{s.t}</h3>
                                <p className="mt-2 text-sm text-[#B8B3A4]">{s.d}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features */}
            <section id="features" className="border-t border-[#221F19] px-6 py-20">
                <div className="mx-auto max-w-6xl">
                    <h2 className="[font-family:'Space_Grotesk',sans-serif] text-2xl font-bold">Built for a live kitchen</h2>
                    <div className="mt-10 grid gap-6 sm:grid-cols-2">
                        {[
                            { t: 'Instant QR codes', d: 'Generate and download a code per table in seconds. Print it, tape it, done.' },
                            { t: 'Live kitchen line', d: 'Orders land on your staff dashboard the moment they\u2019re placed, table by table.' },
                            { t: 'No app, no login', d: 'Customers order from their own browser. One tap, no friction, no drop-off.' },
                            { t: 'Menu changes instantly', d: 'Mark an item unavailable or update a price without reprinting anything.' },
                        ].map((f) => (
                            <div key={f.t} className="rounded-lg bg-[#1A1811] p-6">
                                <h3 className="[font-family:'Space_Grotesk',sans-serif] font-bold">{f.t}</h3>
                                <p className="mt-2 text-sm text-[#B8B3A4]">{f.d}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing */}
            <section id="pricing" className="border-t border-[#221F19] px-6 py-20">
                <div className="mx-auto max-w-6xl">
                    <h2 className="[font-family:'Space_Grotesk',sans-serif] text-2xl font-bold">Pricing</h2>
                    <div className="mt-10 grid gap-6 sm:grid-cols-3">
                        {[
                            { name: 'Starter', price: 'Free', d: 'Up to 6 tables', items: ['Live order dashboard', 'QR code generation', 'Menu & category editor'] },
                            { name: 'Growth', price: '$29/mo', d: 'Up to 20 tables', items: ['Everything in Starter', 'Analytics & best-sellers', 'Priority support'], highlight: true },
                            { name: 'Multi-venue', price: 'Custom', d: 'Unlimited tables', items: ['Everything in Growth', 'Multiple venues', 'Roles & permissions'] },
                        ].map((p) => (
                            <div
                                key={p.name}
                                className={`rounded-lg border p-6 ${p.highlight ? 'border-[#2E9E6C] bg-[#1A1811]' : 'border-[#221F19]'}`}
                            >
                                <h3 className="[font-family:'Space_Grotesk',sans-serif] font-bold">{p.name}</h3>
                                <p className="mt-3 text-3xl font-bold">{p.price}</p>
                                <p className="mt-1 text-sm text-[#8A8371]">{p.d}</p>
                                <ul className="mt-5 space-y-2 text-sm text-[#B8B3A4]">
                                    {p.items.map((i) => <li key={i}>· {i}</li>)}
                                </ul>
                                <Link
                                    href="/admin/login"
                                    className={`mt-6 block rounded-md px-4 py-2.5 text-center text-sm font-medium ${
                                        p.highlight ? 'bg-[#2E9E6C] text-[#0F1410]' : 'border border-[#3A362C] text-[#FBF8F0]'
                                    }`}
                                >
                                    {p.price === 'Custom' ? 'Talk to us' : 'Get started'}
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-[#221F19] px-6 py-10">
                <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-[#8A8371] sm:flex-row">
                    <span>© {new Date().getFullYear()} DineFlow</span>
                    <div className="flex gap-6">
                        <Link href="/admin/login" className="hover:text-[#FBF8F0]">Sign in</Link>
                        <a href="#pricing" className="hover:text-[#FBF8F0]">Pricing</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}