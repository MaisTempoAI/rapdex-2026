import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold font-display transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:bg-disabled-background disabled:text-disabled-foreground [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.97]",
  {
    variants: {
      variant: {
        default:
          "bg-[#3F5E96] text-white hover:bg-[#4A6FA8] shadow-elevation-2 hover:shadow-elevation-4 hover:-translate-y-0.5",
        filled:
          "bg-[#3F5E96] text-white hover:bg-[#4A6FA8] shadow-elevation-2 hover:shadow-elevation-4 hover:-translate-y-0.5",
        gradient:
          "bg-gradient-to-r from-[#141E30] via-[#243B55] to-[#3F5E96] text-white shadow-elevation-3 hover:shadow-glow hover:-translate-y-0.5 bg-[length:200%_100%] hover:bg-right transition-all duration-500",
        outlined:
          "border-2 border-[#3F5E96] text-[#3F5E96] bg-transparent hover:bg-[#3F5E96]/10 shadow-elevation-1 hover:shadow-elevation-2",
        outline:
          "border-2 border-[#3F5E96] text-[#3F5E96] bg-transparent hover:bg-[#3F5E96]/10 shadow-elevation-1 hover:shadow-elevation-2",
        text: "text-[#3F5E96] hover:bg-[#3F5E96]/10",
        secondary:
          "bg-[#243B55] text-white hover:bg-[#2E4A6A] shadow-elevation-2 hover:shadow-elevation-3",
        success:
          "bg-success text-white hover:bg-success/90 shadow-elevation-2 hover:-translate-y-0.5",
        error:
          "bg-error text-white hover:bg-error/90 shadow-elevation-2 hover:-translate-y-0.5",
        ghost: "hover:bg-[#3F5E96]/10 hover:text-[#3F5E96]",
        glass:
          "bg-white/15 backdrop-blur-md text-white border border-white/25 hover:bg-white/25 hover:border-white/40",
        premium:
          "bg-gradient-to-br from-[#3F5E96] via-[#5A7FBA] to-[#3F5E96] text-white shadow-elevation-3 hover:shadow-glow hover:-translate-y-1 bg-[length:200%_200%] animate-gradient",
      },
      size: {
        default: "h-11 px-6 py-2.5",
        sm: "h-9 rounded-lg px-4 text-xs",
        lg: "h-12 rounded-xl px-8 text-base",
        xl: "h-14 rounded-2xl px-10 text-lg",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };