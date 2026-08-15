"use client";

import * as SelectPrimitive from "@radix-ui/react-select";
import type {ComponentPropsWithoutRef, ElementRef} from "react";
import {forwardRef} from "react";

export const Select = SelectPrimitive.Root;
export const SelectValue = SelectPrimitive.Value;

export const SelectTrigger = forwardRef<
    ElementRef<typeof SelectPrimitive.Trigger>,
    ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({className = "", children, ...props}, ref) => (
    <SelectPrimitive.Trigger
        ref={ref}
        className={`input flex items-center justify-between gap-2 [&>span]:truncate
      data-[placeholder]:text-muted-soft
      focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2
      ${className}`}
        {...props}
    >
        {children}

        <SelectPrimitive.Icon asChild>
            <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="shrink-0 opacity-60"
            >
                <path d="m6 9 6 6 6-6"/>
            </svg>
        </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
));

SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

export const SelectContent = forwardRef<
    ElementRef<typeof SelectPrimitive.Content>,
    ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({className = "", children, ...props}, ref) => (
    <SelectPrimitive.Portal>
        <SelectPrimitive.Content
            ref={ref}
            position="popper"
            sideOffset={6}
            className={`z-50 overflow-hidden rounded-lg border border-hairline bg-canvas shadow-elevated
        dark:border-gray-700 dark:bg-surface-dark-elevated
        ${className}`}
            {...props}
        >
            <SelectPrimitive.Viewport className="p-1">
                {children}
            </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
));

SelectContent.displayName = SelectPrimitive.Content.displayName;

export const SelectItem = forwardRef<
    ElementRef<typeof SelectPrimitive.Item>,
    ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({className = "", children, ...props}, ref) => (
    <SelectPrimitive.Item
        ref={ref}
        className={`relative flex min-h-[36px] cursor-pointer select-none items-center rounded-md px-3 py-1.5 pr-8 text-sm text-ink
      outline-none
      data-[highlighted]:bg-surface-card
      dark:text-gray-100
      dark:data-[highlighted]:bg-white/10
      ${className}`}
        {...props}
    >
        <SelectPrimitive.ItemText>
            {children}
        </SelectPrimitive.ItemText>

        <SelectPrimitive.ItemIndicator className="absolute right-2 flex items-center justify-center">
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
                <path d="M5 12l4 4L19 8"/>
            </svg>
        </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
));

SelectItem.displayName = SelectPrimitive.Item.displayName;