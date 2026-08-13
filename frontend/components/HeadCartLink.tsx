import { useCart } from "@/components/CartContext";
import Link from "next/link";

export function HeaderCartLink({
                                   venueSlug,
                                   token,
                               }: {
    venueSlug: string;
    token: string;
}) {
    const { count } = useCart();

    return (
        <Link
            href={`/r/${venueSlug}/t/${token}/cart`}
            aria-label={`View cart, ${count} item${count === 1 ? "" : "s"}`}
            className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15"
        >
            🛒

            {count > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-error px-1 text-xs font-bold text-white">
          {count}
        </span>
            )}
        </Link>
    );
}