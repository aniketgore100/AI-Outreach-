"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";

import { MotionDropdownSurface } from "@/components/motion/motion";
import { cn } from "@/lib/utils";

const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;
const PopoverAnchor = PopoverPrimitive.Anchor;

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "start", sideOffset = 8, children, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content ref={ref} align={align} sideOffset={sideOffset} asChild forceMount {...props}>
      <MotionDropdownSurface
        className={cn(
          "z-50 w-72 overflow-hidden rounded-md border border-border bg-popover p-3 text-popover-foreground shadow-md",
          className
        )}
      >
        {children}
      </MotionDropdownSurface>
    </PopoverPrimitive.Content>
  </PopoverPrimitive.Portal>
));
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

export { Popover, PopoverTrigger, PopoverAnchor, PopoverContent };
