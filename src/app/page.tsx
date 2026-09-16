import Image from "next/image";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import FaqAccordion from "@/components/FaqAccordion";
import SparkleBackground from "@/components/SparkleBackground";
import { ArrowRightIcon, MessageCircleIcon, SparkleIcon } from "@/components/icons";
import { EVENT } from "@/lib/event";

export default function HomePage() {
  return (
    <>
      <SiteHeader />

      <div className="relative">
        <Image
          src="/images/sanctuary-banner.jpg"
          alt={`${EVENT.name} — ${EVENT.theme}`}
          width={1208}
          height={605}
          priority
          className="h-72 w-full object-cover object-top sm:h-96 md:h-[30rem]"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-navy-900 sm:h-40" />
      </div>

      <section className="relative overflow-hidden bg-navy-900 pb-24 pt-10 text-center text-white sm:pb-28 sm:pt-12">
        <SparkleBackground />
        <div className="relative z-10 mx-auto max-w-3xl px-4">
          <p className="text-sm font-semibold uppercase tracking-widest text-gold-500">{EVENT.who}</p>
          <h1 className="mt-4 text-4xl font-extrabold leading-tight sm:text-5xl">{EVENT.name}</h1>
          <p className="mt-3 text-lg font-semibold text-gold-500">{EVENT.theme}</p>
          <p className="mx-auto mt-5 max-w-xl font-serif text-lg italic text-white/85">{EVENT.verse}</p>
          <p className="mt-1 text-sm text-white/60">{EVENT.verseRef}</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/register"
              className="w-full max-w-xs rounded-full bg-gold-600 px-8 py-3 text-sm font-semibold hover:bg-gold-500 sm:w-auto"
            >
              Register Now
            </Link>
            <a
              href="#about"
              className="w-full max-w-xs rounded-full border border-white/40 px-8 py-3 text-sm font-semibold hover:border-white sm:w-auto"
            >
              Learn More
            </a>
          </div>
        </div>
      </section>

      <div className="mx-auto -mt-14 max-w-4xl px-4 sm:-mt-16">
        <div className="grid grid-cols-1 gap-6 rounded-xl bg-white p-6 shadow-lg sm:grid-cols-3 sm:p-8">
          <InfoItem label="When" value={EVENT.dateLabel} />
          <InfoItem label="Where" value={`${EVENT.locationName}, ${EVENT.locationDetail}`} />
          <InfoItem label="Fee" value={`₱${EVENT.feePhp} per person`} />
        </div>
      </div>

      <section id="about" className="scroll-mt-20 bg-cream px-4 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-gold-600">About</p>
          <h2 className="mt-2 text-3xl font-extrabold text-navy-900 sm:text-4xl">
            What This Spiritual Camp Is For
          </h2>
          <p className="mt-6 text-navy-900/70">
            This spiritual camp is designed to discover Christ as the heart and center of the sanctuary
            message, helping participants understand His work of redemption, intercession, and
            restoration. It aims to lead them into a deeper experience of His grace, forgiveness, hope,
            and transforming power, strengthen their personal relationship and intimacy with Jesus, and
            embrace the assurance of victory over sin through Christ. Ultimately, the camp seeks to
            inspire each participant to live out and share the hope found in the sanctuary message
            through Jesus Christ.
          </p>
        </div>
      </section>

      <section id="faq" className="scroll-mt-20 bg-white px-4 py-20">
        <div className="mx-auto max-w-2xl">
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-navy-900/10 bg-cream px-3 py-1 text-xs font-semibold text-navy-900/70">
              <SparkleIcon className="h-3 w-3 text-gold-600" />
              FAQ
            </span>
            <h2 className="text-3xl font-extrabold text-navy-900 sm:text-4xl">Frequently Asked Questions</h2>
            <p className="max-w-md text-navy-900/60">
              Quick answers to the questions we get the most. Can&apos;t find yours? Message{" "}
              <a
                href="https://facebook.com/ms.sheilazulueta"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-navy-900 underline underline-offset-4"
              >
                Sheila Zulueta on Messenger
              </a>
              .
            </p>
          </div>

          <div className="mt-10">
            <FaqAccordion />
          </div>

          <div className="mt-10 flex flex-col items-center justify-between gap-4 rounded-2xl border border-dashed border-navy-900/15 bg-cream p-5 sm:flex-row">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-navy-900 text-white">
                <MessageCircleIcon className="h-4 w-4" />
              </span>
              <div className="flex flex-col leading-tight text-left">
                <p className="text-sm font-semibold text-navy-900">Still have a question?</p>
                <p className="text-xs text-navy-900/60">We&apos;ll get back to you as soon as we can.</p>
              </div>
            </div>
            <a
              href="https://facebook.com/ms.sheilazulueta"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-gold-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gold-500"
            >
              Ask us anything
              <ArrowRightIcon className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center sm:text-left">
      <p className="text-xs font-semibold uppercase tracking-widest text-gold-600">{label}</p>
      <p className="mt-1 font-semibold text-navy-900">{value}</p>
    </div>
  );
}
