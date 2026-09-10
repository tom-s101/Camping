import { EVENT } from "@/lib/event";

export default function SiteFooter() {
  return (
    <footer className="mt-auto bg-navy-950 text-white/70">
      <div className="mx-auto max-w-6xl px-4 py-10 text-sm">
        <p className="text-base font-semibold text-white">{EVENT.name}</p>
        <p className="mt-1">{EVENT.dateLabel} &middot; {EVENT.locationName}, {EVENT.locationDetail}</p>
        <nav className="mt-4 flex gap-6">
          <a href="/#about" className="hover:text-white">About</a>
          <a href="/#faq" className="hover:text-white">FAQ</a>
          <a href="/register" className="hover:text-white">Register</a>
        </nav>
        <p className="mt-6 text-xs text-white/40">
          Questions? Message{" "}
          <a
            href="https://facebook.com/ms.sheilazulueta"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gold-500 underline hover:text-gold-500/80"
          >
            Sheila Zulueta on Messenger
          </a>
          .
        </p>
        <p className="mt-2 text-xs text-white/40">&copy; {new Date().getFullYear()} {EVENT.name}. All rights reserved.</p>
      </div>
    </footer>
  );
}
