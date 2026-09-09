"use client";

import Link from "next/link";
import { useState } from "react";
import { EVENT } from "@/lib/event";

const NAV_LINKS = [
  { href: "/#about", label: "About" },
  { href: "/#faq", label: "FAQ" },
];

export default function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-navy-900 text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-lg font-bold tracking-wide">
          {EVENT.name}
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="text-sm font-medium text-white/90 hover:text-white">
              {link.label}
            </a>
          ))}
          <Link
            href="/register"
            className="rounded-full bg-gold-600 px-5 py-2 text-sm font-semibold hover:bg-gold-500"
          >
            Register Now
          </Link>
        </nav>

        <button
          type="button"
          aria-label="Toggle menu"
          aria-expanded={open}
          className="flex h-10 w-10 items-center justify-center md:hidden"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="sr-only">Menu</span>
          <div className="relative h-4 w-6">
            <span
              className={`absolute left-0 top-0 h-0.5 w-6 bg-white transition ${open ? "top-1.5 rotate-45" : ""}`}
            />
            <span className={`absolute left-0 top-1.5 h-0.5 w-6 bg-white transition ${open ? "opacity-0" : ""}`} />
            <span
              className={`absolute left-0 top-3 h-0.5 w-6 bg-white transition ${open ? "top-1.5 -rotate-45" : ""}`}
            />
          </div>
        </button>
      </div>

      {open && (
        <nav className="flex flex-col gap-1 border-t border-white/10 px-4 pb-4 md:hidden">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="rounded px-2 py-3 text-sm font-medium text-white/90 hover:bg-white/5"
            >
              {link.label}
            </a>
          ))}
          <Link
            href="/register"
            onClick={() => setOpen(false)}
            className="mt-2 rounded-full bg-gold-600 px-5 py-3 text-center text-sm font-semibold"
          >
            Register Now
          </Link>
        </nav>
      )}
    </header>
  );
}
