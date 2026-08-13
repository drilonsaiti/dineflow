"use client";

import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { forwardRef } from "react";
import type { ComponentPropsWithoutRef, ElementRef } from "react";

export const Checkbox = forwardRef<
    ElementRef<typeof CheckboxPrimitive.Root>,
    ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className = "", ...props }, ref) => (
    <CheckboxPrimitive.Root
        ref={ref}
        className={`peer h-5 w-5 shrink-0 rounded-[6px] border border-hairline bg-canvas transition-colors
      data-[state=checked]:border-ink data-[state=checked]:bg-ink
      dark:border-gray-700 dark:bg-surface-dark-elevated
      dark:data-[state=checked]:border-white dark:data-[state=checked]:bg-white
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2
      disabled:cursor-not-allowed disabled:opacity-50
      ${className}`}
        {...props}
    >
        <CheckboxPrimitive.Indicator className="flex items-center justify-center text-white dark:text-ink">
            <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
            >
                <path d="M5 12l4 4L19 8" />
            </svg>
        </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
));

Checkbox.displayName = CheckboxPrimitive.Root.displayName;