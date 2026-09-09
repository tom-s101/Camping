import type { Metadata } from "next";
import { Inter, Lora } from "next/font/google";
import { EVENT } from "@/lib/event";
import "./globals.css";

const inter = Inter({ variable: "--font-sans", subsets: ["latin"] });
const lora = Lora({ variable: "--font-serif", subsets: ["latin"] });

export const metadata: Metadata = {
  title: `${EVENT.name} | ${EVENT.theme}`,
  description: `Register for ${EVENT.name}, ${EVENT.dateLabel} at ${EVENT.locationName}, ${EVENT.locationDetail}.`,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${lora.variable} scroll-smooth`}>
      <body className="min-h-full flex flex-col font-sans text-navy-900">{children}</body>
    </html>
  );
}
