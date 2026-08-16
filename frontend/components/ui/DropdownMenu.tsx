'use client';

import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { forwardRef } from 'react';

export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

export const DropdownMenuContent = forwardRef<
    React.ElementRef<typeof DropdownMenuPrimitive.Content>,
    React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className = '', ...props }, ref) => (
    <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
            ref={ref}
            sideOffset={6}
            align="start"
            className={`z-50 min-w-[180px] overflow-hidden rounded-lg border border-hairline bg-canvas p-1 shadow-elevated
        dark:border-gray-700 dark:bg-surface-dark-elevated ${className}`}
            {...props}
        />
    </DropdownMenuPrimitive.Portal>
));

DropdownMenuContent.displayName = 'DropdownMenuContent';

export const DropdownMenuItem = forwardRef<
    React.ElementRef<typeof DropdownMenuPrimitive.Item>,
    React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item>
>(({ className = '', ...props }, ref) => (
    <DropdownMenuPrimitive.Item
        ref={ref}
        className={`flex min-h-[36px] cursor-pointer select-none items-center rounded-md px-3 py-1.5 text-sm text-ink
      outline-none data-[highlighted]:bg-surface-card
      dark:text-gray-100 dark:data-[highlighted]:bg-white/10 ${className}`}
        {...props}
    />
));

DropdownMenuItem.displayName = 'DropdownMenuItem';