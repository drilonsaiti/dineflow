'use client';

import {use, useEffect} from 'react';
import {useOrder} from '@/hooks/useOrders';
import {useVenueCurrency} from '@/hooks/useVenueCurrency';
import {formatCents} from '@/lib/money';

export default function PrintTicketPage({params}: { params: Promise<{ venueId: string; orderId: string }> }) {
    const {venueId, orderId} = use(params);
    const {data: order} = useOrder(venueId, orderId);
    const currency = useVenueCurrency(venueId);

    useEffect(() => {
        if (order) setTimeout(() => window.print(), 300);
    }, [order]);

    if (!order) return null;

    return (
        <div className="mx-auto w-[300px] bg-white p-2 font-mono text-xs text-black">
            <p className="text-center text-sm font-bold">ORDER #{order.dailyNumber}</p>
            <p className="text-center">{order.table.label}</p>
            <p className="text-center text-gray-500">{new Date(order.createdAt).toLocaleTimeString()}</p>
            {order.customerName && <p className="text-center">{order.customerName}</p>}
            <hr className="my-2 border-dashed border-black"/>
            {order.items.map((item: any, i: number) => (
                <div key={i} className="mb-1">
                    <p className="font-semibold">{item.quantity}x {item.menuItem.name}</p>
                    {item.modifiers.length > 0 && (
                        <p className="pl-2 text-gray-600">{item.modifiers.map((m: any) => m.modifierOption?.name).filter(Boolean).join(', ')}</p>
                    )}
                    {item.note && <p className="pl-2">** {item.note}</p>}
                </div>
            ))}
            <hr className="my-2 border-dashed border-black"/>
            <p className="text-right font-bold">{formatCents(order.totalCents, currency)}</p>
        </div>
    );
}