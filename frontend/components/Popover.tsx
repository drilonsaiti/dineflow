'use client';

import * as PopoverPrimitive from '@radix-ui/react-popover';
import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;

export const PopoverContent = forwardRef<
    React.ElementRef<typeof PopoverPrimitive.Content>,
    React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, ...props }, ref) => (
    <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
            ref={ref}
            sideOffset={8}
            align="start"
            className={cn(
                'z-50 w-72 rounded-lg border border-hairline bg-canvas p-3 shadow-elevated',
                'dark:border-gray-700 dark:bg-surface-dark-elevated',
                'data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:zoom-in-95',
                className,
            )}
            {...props}
        />
    </PopoverPrimitive.Portal>
));

PopoverContent.displayName = 'PopoverContent';