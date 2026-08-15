import {ShoppingCart} from 'lucide-react';
import {useCart} from "@/components/CartContext";
import Link from "next/link";
import {TableInfo} from "@/app/r/[venueSlug]/t/[token]/layout";

export function HeaderCartLink({
                                   venueSlug,
                                   token,
                                   info
                               }: {
    venueSlug: string;
    token: string;
    info: TableInfo
}) {
    const {count} = useCart();

    return (
        <Link
            href={`/r/${venueSlug}/t/${token}/cart`}
            aria-label={`View cart, ${count} item${count === 1 ? "" : "s"}`}
            className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15"
        >
            <ShoppingCart className="h-5 w-5 text-white" aria-hidden/>

            {count > 0 && (
                <div
                    style={
                        {
                            '--brand-color': info.venue.brandColor ?? '#EA580C',
                        } as React.CSSProperties
                    }
                >
    <span
        className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-bold text-white"
        style={{
            backgroundColor: 'var(--brand-color)',
        }}
    >
        {count}
    </span>
                </div>
            )}
        </Link>
    );
}