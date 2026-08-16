'use client';

import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import {cn} from '@/lib/utils';

export const Select = SelectPrimitive.Root;
export const SelectValue = SelectPrimitive.Value;

export const SelectTrigger = React.forwardRef<
    React.ElementRef<typeof SelectPrimitive.Trigger>,
    React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({className, children, ...props}, ref) => (
    <SelectPrimitive.Trigger
        ref={ref}
        className={cn(
            'input flex items-center justify-between gap-2 [&>span]:truncate',
            'data-[placeholder]:text-muted-soft',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2',
            className,
        )}
        {...props}
    >
        {children}

        <SelectPrimitive.Icon>
            <svg
                viewBox="0 0 12 8"
                className="h-2.5 w-3 shrink-0 text-muted"
                fill="none"
                aria-hidden="true"
            >
                <path
                    d="M1 1.5L6 6.5L11 1.5"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
        </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
));

SelectTrigger.displayName = 'SelectTrigger';

export const SelectContent = React.forwardRef<
    React.ElementRef<typeof SelectPrimitive.Content>,
    React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({className, children, ...props}, ref) => (
    <SelectPrimitive.Portal>
        <SelectPrimitive.Content
            ref={ref}
            position="popper"
            sideOffset={6}
            className={cn(
                'z-50 overflow-hidden rounded-lg border border-hairline bg-canvas shadow-elevated',
                'dark:border-gray-700 dark:bg-surface-dark-elevated',
                className,
            )}
            {...props}
        >
            <SelectPrimitive.Viewport className="p-1">
                {children}
            </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
));

SelectContent.displayName = 'SelectContent';

export const SelectItem = React.forwardRef<
    React.ElementRef<typeof SelectPrimitive.Item>,
    React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({className, children, ...props}, ref) => (
    <SelectPrimitive.Item
        ref={ref}
        className={cn(
            'relative flex min-h-[36px] cursor-pointer select-none items-center rounded-md px-3 py-1.5 text-sm text-ink',
            'outline-none data-[highlighted]:bg-surface-card',
            'dark:text-gray-100 dark:data-[highlighted]:bg-white/10',
            className,
        )}
        {...props}
    >
        <SelectPrimitive.ItemText>
            {children}
        </SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
));

SelectItem.displayName = 'SelectItem';