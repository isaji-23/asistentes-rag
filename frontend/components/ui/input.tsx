import { clsx } from "clsx";
import { type InputHTMLAttributes, forwardRef } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={clsx(
          "w-full rounded-lg border border-border-cool bg-pure-white px-3 py-2 text-sm text-cohere-black placeholder:text-muted-slate transition-colors",
          "focus:border-focus-purple focus:outline-2 focus:outline-interaction-blue focus:outline-offset-0",
          "disabled:opacity-50",
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";
