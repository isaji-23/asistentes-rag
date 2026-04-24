"use client";

import * as RadixDialog from "@radix-ui/react-dialog";
import { clsx } from "clsx";
import { X } from "lucide-react";
import { type ReactNode } from "react";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: ReactNode;
  title: string;
  description?: string;
  children: ReactNode;
}

export function Dialog({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  children,
}: DialogProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <RadixDialog.Trigger asChild>{trigger}</RadixDialog.Trigger>}
      <RadixDialog.Portal>
        <RadixDialog.Overlay
          className={clsx(
            "fixed inset-0 z-40 bg-black/30 backdrop-blur-sm",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          )}
        />
        <RadixDialog.Content
          className={clsx(
            "fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2",
            "w-full max-w-lg rounded-[8px] border border-border-cool bg-pure-white p-6",
            "focus:outline-none",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "data-[state=closed]:slide-out-to-left-1/2 data-[state=open]:slide-in-from-left-1/2",
            "data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-top-[48%]"
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <RadixDialog.Title className="font-display text-xl font-normal text-cohere-black">
                {title}
              </RadixDialog.Title>
              {description && (
                <RadixDialog.Description className="mt-1 text-sm text-muted-slate">
                  {description}
                </RadixDialog.Description>
              )}
            </div>
            <RadixDialog.Close
              className="rounded p-1 text-muted-slate transition-colors hover:text-cohere-black focus:outline-2 focus:outline-interaction-blue"
              aria-label="Cerrar"
            >
              <X size={18} />
            </RadixDialog.Close>
          </div>
          <div className="mt-5">{children}</div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
