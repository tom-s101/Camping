"use client";

import { useEffect, type ReactNode } from "react";
import { CloseIcon } from "@/components/icons";

export default function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-xl bg-white shadow-xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-navy-900/10 px-5 py-4">
          <h3 className="text-base font-bold text-navy-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1 text-navy-900/50 hover:bg-navy-900/5 hover:text-navy-900"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4 text-sm leading-relaxed text-navy-900/80">{children}</div>
      </div>
    </div>
  );
}
