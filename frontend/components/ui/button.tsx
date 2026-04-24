"use client";

import { clsx } from "clsx";
import { type ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "ghost" | "solid" | "outlined";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  pill?: boolean;
}

const variantClasses: Record<Variant, string> = {
  ghost:
    "bg-transparent text-cohere-black hover:text-interaction-blue focus-visible:outline-2 focus-visible:outline-interaction-blue",
  solid:
    "bg-cohere-black text-pure-white hover:bg-near-black focus-visible:outline-2 focus-visible:outline-interaction-blue",
  outlined:
    "bg-transparent border border-border-cool text-cohere-black hover:border-interaction-blue hover:text-interaction-blue focus-visible:outline-2 focus-visible:outline-interaction-blue",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-5 py-2.5 text-base",
  lg: "px-6 py-3 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "ghost", size = "md", pill = false, className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={clsx(
          "inline-flex cursor-pointer items-center justify-center gap-2 font-body font-normal transition-colors duration-150 focus-visible:outline focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-40",
          variantClasses[variant],
          sizeClasses[size],
          pill ? "rounded-full" : "rounded-lg",
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
