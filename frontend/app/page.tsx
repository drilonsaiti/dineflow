import Link from 'next/link';
import {ThemeToggle} from '@/components/ThemeToggle';

export default function HomePage() {
    return (
        <div className="min-h-screen bg-canvas font-sans text-body dark:bg-surface-dark dark:text-gray-100">
            <style>{`
                @keyframes stamp {
                    0%, 8%   { opacity: 0.3; transform: scale(0.94); }
                    12%, 28% { opacity: 1; transform: scale(1); }
                    32%, 100% { opacity: 0.3; transform: scale(0.94); }
                }
                .stamp-received { animation: stamp 3.6s infinite; animation-delay: 0s; }
                .stamp-preparing { animation: stamp 3.6s infinite; animation-delay: 1.2s; }
                .stamp-ready { animation: stamp 3.6s infinite; animation-delay: 2.4s; }
                @media (prefers-reduced-motion: reduce) {
                    .stamp-received, .stamp-preparing, .stamp-ready {
                        animation: none; opacity: 1; transform: none;
                    }
                }
            `}</style>

            {/* Nav */}
            <nav
                className="sticky top-0 z-10 border-b border-hairline bg-canvas dark:border-gray-800 dark:bg-surface-dark">
                <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
                    <span className="font-display text-lg font-semibold tracking-tight text-ink dark:text-white">
                        DineFlow
                    </span>
                    <div className="hidden items-center gap-8 text-sm font-medium text-muted sm:flex">
                        <a href="#how" className="hover:text-ink dark:hover:text-white">How it works</a>
                        <a href="#features" className="hover:text-ink dark:hover:text-white">Features</a>
                        <a href="#pricing" className="hover:text-ink dark:hover:text-white">Pricing</a>
                    </div>
                    <div className="flex items-center gap-3">
                        <ThemeToggle/>
                        <Link href="/admin/login"
                              className="hidden text-sm font-medium text-muted hover:text-ink dark:hover:text-white sm:block">
                            Sign in
                        </Link>
                        <Link href="/admin/login" className="btn-primary">
                            Create your venue — free
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero */}
            <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 sm:py-section lg:grid-cols-12">
                <div className="lg:col-span-7">
                    <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
                        No app. No login. No hardware.
                    </p>
                    <h1 className="mt-4 text-4xl leading-[1.05] sm:text-5xl">
                        Every table, a menu.<br/>Every order, live.
                    </h1>
                    <p className="mt-5 max-w-md text-body dark:text-gray-300">
                        Print a QR code for each table. Customers order from their phone in one tap.
                        Your kitchen sees it the second it lands — no runner, no notepad, no missed order.
                    </p>
                    <div className="mt-8 flex flex-wrap gap-4">
                        <Link href="/admin/login" className="btn-primary">
                            Create your venue — free
                        </Link>
                        <Link href="#how" className="btn-secondary">
                            See how it works
                        </Link>
                    </div>
                </div>

                {/* Signature: live order ticket, styled as a hero-app-mockup-card */}
                <div className="flex justify-center lg:col-span-5 lg:justify-end">
                    <div
                        className="w-72 rounded-xl border border-hairline bg-canvas p-6 shadow-elevated dark:border-gray-800 dark:bg-surface-dark-elevated">
                        <p className="font-mono text-xs tracking-wide text-muted-soft">
                            TABLE 04 · ORDER #0032
                        </p>
                        <div className="my-3 border-t border-dashed border-hairline dark:border-gray-700"/>
                        <ul className="space-y-1.5 font-mono text-sm text-ink dark:text-gray-100">
                            <li className="flex justify-between"><span>1× Margherita</span><span>9.50</span></li>
                            <li className="flex justify-between"><span>1× Iced Latte</span><span>4.00</span></li>
                        </ul>
                        <div className="my-3 border-t border-dashed border-hairline dark:border-gray-700"/>
                        <div className="flex justify-between font-mono text-sm font-medium text-ink dark:text-gray-100">
                            <span>TOTAL</span><span>13.50</span>
                        </div>
                        <div className="mt-5 flex gap-2">
                            <span
                                className="stamp-received rounded-sm border border-muted-soft px-2 py-1 font-mono text-[10px] uppercase tracking-wide text-muted">
                                Received
                            </span>
                            <span
                                className="stamp-preparing rounded-sm border border-warning px-2 py-1 font-mono text-[10px] uppercase tracking-wide text-warning">
                                Preparing
                            </span>
                            <span
                                className="stamp-ready rounded-sm border border-success px-2 py-1 font-mono text-[10px] uppercase tracking-wide text-success">
                                Ready
                            </span>
                        </div>
                    </div>
                </div>
            </section>

            {/* How it works */}
            <section id="how" className="border-t border-hairline px-6 py-section dark:border-gray-800">
                <div className="mx-auto max-w-6xl">
                    <h2 className="text-2xl">How it works</h2>
                    <div className="mt-10 grid gap-6 sm:grid-cols-3">
                        {[
                            {
                                n: '01',
                                t: 'Scan',
                                d: 'The customer scans the code taped to their table. No download, no account.'
                            },
                            {
                                n: '02',
                                t: 'Order',
                                d: 'They browse the menu and send the order straight to your kitchen.'
                            },
                            {
                                n: '03',
                                t: 'Track',
                                d: 'They watch it move from received to ready, right on their phone.'
                            },
                        ].map((s) => (
                            <div key={s.n} className="card-soft">
                                <span className="font-mono text-sm text-muted">{s.n}</span>
                                <h3 className="mt-3 text-lg">{s.t}</h3>
                                <p className="mt-2 text-sm text-muted">{s.d}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features */}
            <section id="features" className="border-t border-hairline px-6 py-section dark:border-gray-800">
                <div className="mx-auto max-w-6xl">
                    <h2 className="text-2xl">Built for a live kitchen</h2>
                    <div className="mt-10 grid gap-6 sm:grid-cols-2">
                        {[
                            {
                                t: 'Instant QR codes',
                                d: 'Generate and download a code per table in seconds. Print it, tape it, done.'
                            },
                            {
                                t: 'Live kitchen line',
                                d: 'Orders land on your staff dashboard the moment they\u2019re placed, table by table.'
                            },
                            {
                                t: 'No app, no login',
                                d: 'Customers order from their own browser. One tap, no friction, no drop-off.'
                            },
                            {
                                t: 'Menu changes instantly',
                                d: 'Mark an item unavailable or update a price without reprinting anything.'
                            },
                        ].map((f) => (
                            <div key={f.t} className="card-soft">
                                <h3 className="text-base font-semibold text-ink dark:text-white">{f.t}</h3>
                                <p className="mt-2 text-sm text-muted">{f.d}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing */}
            <section id="pricing" className="border-t border-hairline px-6 py-section dark:border-gray-800">
                <div className="mx-auto max-w-6xl">
                    <h2 className="text-2xl">Pricing</h2>
                    <div className="mt-10 grid gap-6 sm:grid-cols-3">
                        {[
                            {
                                name: 'Starter',
                                price: 'Free',
                                d: 'Up to 6 tables',
                                items: ['Live order dashboard', 'QR code generation', 'Menu & category editor']
                            },
                            {
                                name: 'Growth',
                                price: '$29/mo',
                                d: 'Up to 20 tables',
                                items: ['Everything in Starter', 'Analytics & best-sellers', 'Priority support'],
                                featured: true
                            },
                            {
                                name: 'Multi-venue',
                                price: 'Custom',
                                d: 'Unlimited tables',
                                items: ['Everything in Growth', 'Multiple venues', 'Roles & permissions']
                            },
                        ].map((p) => (
                            <div
                                key={p.name}
                                className={
                                    p.featured
                                        ? 'rounded-lg bg-surface-dark p-8 text-white'
                                        : 'card'
                                }
                            >
                                <h3 className="text-lg font-semibold">{p.name}</h3>
                                <p className="mt-3 font-display text-3xl font-semibold">{p.price}</p>
                                <p className={`mt-1 text-sm ${p.featured ? 'text-gray-400' : 'text-muted'}`}>{p.d}</p>
                                <ul className={`mt-5 space-y-2 text-sm ${p.featured ? 'text-gray-300' : 'text-muted'}`}>
                                    {p.items.map((i) => <li key={i}>· {i}</li>)}
                                </ul>
                                <Link
                                    href="/admin/login"
                                    className={`mt-6 block rounded-md px-4 py-2.5 text-center text-sm font-semibold ${
                                        p.featured ? 'bg-white text-ink' : 'btn-primary'
                                    }`}
                                >
                                    {p.price === 'Custom' ? 'Talk to us' : 'Get started'}
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Footer — always dark, per spec, regardless of page theme */}
            <footer className="bg-surface-dark px-6 py-16 text-gray-400">
                <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm sm:flex-row">
                    <span className="font-display font-semibold text-white">DineFlow</span>
                    <div className="flex gap-6">
                        <Link href="/admin/login" className="hover:text-white">Sign in</Link>
                        <a href="#pricing" className="hover:text-white">Pricing</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}