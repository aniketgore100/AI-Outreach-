"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";

import { motion, subtleSpring } from "@/components/motion/motion";
import { cn } from "@/lib/utils";

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      "inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-transparent px-0.5 transition-colors duration-200",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      "disabled:cursor-not-allowed disabled:opacity-50",
      "data-[state=unchecked]:justify-start data-[state=checked]:justify-end",
      "data-[state=unchecked]:bg-muted data-[state=checked]:bg-success",
      className
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb asChild>
      <motion.span layout transition={subtleSpring} className="block h-4 w-4 rounded-full bg-white shadow-sm" />
    </SwitchPrimitive.Thumb>
  </SwitchPrimitive.Root>
));
Switch.displayName = SwitchPrimitive.Root.displayName;

export { Switch };
