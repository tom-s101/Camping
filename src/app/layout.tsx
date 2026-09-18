import type { Metadata } from "next";
import { Inter, Lora } from "next/font/google";
import { EVENT } from "@/lib/event";
import "./globals.css";

const inter = Inter({ variable: "--font-sans", subsets: ["latin"] });
const lora = Lora({ variable: "--font-serif", subsets: ["latin"] });

const title = `${EVENT.name} | ${EVENT.theme}`;
const description = `Register for ${EVENT.name}, ${EVENT.dateLabel} at ${EVENT.locationName}, ${EVENT.locationDetail}.`;
const bannerImage = {
  url: "/images/sanctuary-banner.jpg",
  width: 2048,
  height: 1024,
  alt: `${EVENT.name} — ${EVENT.theme}`,
};

export const metadata: Metadata = {
  // Needed so the relative banner path below resolves to a full URL in
  // shared-link previews. Set NEXT_PUBLIC_SITE_URL to the real deployed
  // domain once known.
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://example.com"),
  title,
  description,
  openGraph: {
    title,
    description,
    images: [bannerImage],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [bannerImage.url],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${lora.variable} scroll-smooth`}>
      <body className="min-h-full flex flex-col font-sans text-navy-900">{children}</body>
    </html>
  );
}
