import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer inline-flex h-7 w-14 shrink-0 cursor-pointer items-center rounded-full border-2 transition-all duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3F5E96]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
      "data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-[#3F5E96] data-[state=checked]:to-[#5A7FBA] data-[state=checked]:border-[#3F5E96] data-[state=checked]:shadow-[0_0_16px_rgba(63,94,150,0.45)]",
      "data-[state=unchecked]:bg-[#E8ECF0] data-[state=unchecked]:border-[#D1D9E4]",
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-elevation-2 ring-0 transition-all duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
        "data-[state=checked]:translate-x-7 data-[state=checked]:shadow-[0_2px_8px_rgba(0,0,0,0.15)]",
        "data-[state=unchecked]:translate-x-1 data-[state=unchecked]:bg-white"
      )}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };