import { clsx } from "clsx";
import { type TextareaHTMLAttributes, forwardRef } from "react";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={clsx(
          "w-full resize-none rounded-lg border border-border-cool bg-pure-white px-3 py-2 text-sm text-cohere-black placeholder:text-muted-slate transition-colors",
          "focus:border-focus-purple focus:outline-2 focus:outline-interaction-blue focus:outline-offset-0",
          "disabled:opacity-50",
          className
        )}
        {...props}
      />
    );
  }
);

Textarea.displayName = "Textarea";
