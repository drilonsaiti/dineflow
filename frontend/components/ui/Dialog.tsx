'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import {cn} from '@/lib/utils';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;

export const DialogContent = React.forwardRef<
    React.ElementRef<typeof DialogPrimitive.Content>,
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({className, children, ...props}, ref) => (
    <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/50 data-[state=open]:animate-in data-[state=open]:fade-in" />

        <DialogPrimitive.Content
            ref={ref}
            className={cn(
                'fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2',
                'rounded-xl border border-hairline bg-canvas p-6 shadow-elevated',
                'dark:border-gray-700 dark:bg-surface-dark-elevated',
                className,
            )}
            {...props}
        >
            {children}
        </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
));

DialogContent.displayName = 'DialogContent';

export const DialogTitle = ({
                                className,
                                ...props
                            }: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>) => (
    <DialogPrimitive.Title
        className={cn(
            'text-lg font-semibold text-ink dark:text-white',
            className,
        )}
        {...props}
    />
);

export const DialogDescription = ({
                                      className,
                                      ...props
                                  }: React.ComponentPropsWithoutRef<
    typeof DialogPrimitive.Description
>) => (
    <DialogPrimitive.Description
        className={cn('mt-2 text-sm text-muted', className)}
        {...props}
    />
);

export const DialogClose = DialogPrimitive.Close;