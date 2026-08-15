'use client';

import * as SwitchPrimitive from '@radix-ui/react-switch';
import * as React from 'react';

const Switch = React.forwardRef<
    React.ElementRef<typeof SwitchPrimitive.Root>,
    React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({className = '', ...props}, ref) => (
    <SwitchPrimitive.Root
        ref={ref}
        className={`relative h-6 w-11 shrink-0 rounded-full border border-hairline bg-surface-strong transition-colors
      data-[state=checked]:border-success data-[state=checked]:bg-success
      dark:border-gray-700 dark:bg-gray-700
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink
      focus-visible:ring-offset-2
      disabled:cursor-not-allowed disabled:opacity-50
      ${className}`}
        {...props}
    >
        <SwitchPrimitive.Thumb
            className="block h-4 w-4 translate-x-0.5 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-[22px]"
        />
    </SwitchPrimitive.Root>
));

Switch.displayName = SwitchPrimitive.Root.displayName;

export {Switch};