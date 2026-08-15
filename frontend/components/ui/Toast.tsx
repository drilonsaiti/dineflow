'use client';

import * as ToastPrimitive from '@radix-ui/react-toast';
import {createContext, useCallback, useContext, useState} from 'react';

type ToastMessage = { id: number; title: string; variant: 'default' | 'error' | 'success' };
const ToastCtx = createContext<(title: string, variant?: ToastMessage['variant']) => void>(() => {
});

export function useToast() {
    return useContext(ToastCtx);
}

export function ToastProvider({children}: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const showToast = useCallback((title: string, variant: ToastMessage['variant'] = 'default') => {
        const id = Date.now();
        setToasts((prev) => [...prev, {id, title, variant}]);
    }, []);

    return (
        <ToastCtx.Provider value={showToast}>
            <ToastPrimitive.Provider swipeDirection="right">
                {children}
                {toasts.map((t) => (
                    <ToastPrimitive.Root
                        key={t.id}
                        duration={4000}
                        onOpenChange={(open) => !open && setToasts((prev) => prev.filter((x) => x.id !== t.id))}
                        className={`rounded-lg border px-4 py-3 text-sm font-medium shadow-elevated
    data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-2
    data-[state=closed]:animate-out data-[state=closed]:fade-out
    ${t.variant === 'error'
                            ? 'border-error/30 bg-error/5 text-error'
                            : t.variant === 'success'
                                ? 'border-success/30 bg-success/5 text-success'
                                : 'border-hairline bg-canvas text-ink dark:border-gray-700 dark:bg-surface-dark-elevated dark:text-white'}`}
                    >
                        <ToastPrimitive.Title>{t.title}</ToastPrimitive.Title>
                    </ToastPrimitive.Root>
                ))}
                <ToastPrimitive.Viewport className="fixed bottom-4 right-4 z-50 flex w-80 flex-col gap-2 outline-none"/>
            </ToastPrimitive.Provider>
        </ToastCtx.Provider>
    );
}