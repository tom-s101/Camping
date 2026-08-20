import type { Metadata } from "next";
import { Inter, Lora } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-sans", subsets: ["latin"] });
const lora = Lora({ variable: "--font-serif", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Section 7 Camp Meeting | Absolute Reliance",
  description:
    "Register for the Section 7 Camp Meeting, November 20–22, 2026 at Forrest Falls Camp.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${lora.variable} scroll-smooth`}>
      <body className="min-h-full flex flex-col font-sans text-navy-900">{children}</body>
    </html>
  );
}
