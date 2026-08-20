import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import FaqAccordion from "@/components/FaqAccordion";
import { EVENT } from "@/lib/event";

export default function HomePage() {
  return (
    <>
      <SiteHeader />

      <section className="bg-navy-900 pb-24 pt-16 text-center text-white sm:pb-28 sm:pt-24">
        <div className="mx-auto max-w-3xl px-4">
          <p className="text-sm font-semibold uppercase tracking-widest text-teal-500">{EVENT.who}</p>
          <h1 className="mt-4 text-4xl font-extrabold leading-tight sm:text-5xl">{EVENT.theme}</h1>
          <p className="mx-auto mt-4 max-w-xl text-white/80">
            Join us for a weekend camp meeting of worship, fellowship, and rest at {EVENT.locationName}.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/register"
              className="w-full max-w-xs rounded-full bg-teal-600 px-8 py-3 text-sm font-semibold hover:bg-teal-500 sm:w-auto"
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
          <p className="text-sm font-semibold uppercase tracking-widest text-teal-600">About</p>
          <h2 className="mt-2 text-3xl font-extrabold text-navy-900 sm:text-4xl">
            What This Camp Meeting Is For
          </h2>
          <p className="mt-6 text-navy-900/70">
            Placeholder: this camp meeting brings together families and members from {EVENT.who} for a
            weekend away from the everyday, centered on worship, fellowship, and growing in{" "}
            {EVENT.theme.toLowerCase()}. Expect meaningful services, activities for all ages, and time
            together as one church family in the outdoors at {EVENT.locationName}. Full program details
            will be added here once confirmed.
          </p>
        </div>
      </section>

      <section id="faq" className="scroll-mt-20 bg-white px-4 py-20">
        <div className="mx-auto max-w-2xl">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-teal-600">FAQ</p>
            <h2 className="mt-2 text-3xl font-extrabold text-navy-900 sm:text-4xl">Frequently Asked Questions</h2>
          </div>
          <div className="mt-10">
            <FaqAccordion />
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
      <p className="text-xs font-semibold uppercase tracking-widest text-teal-600">{label}</p>
      <p className="mt-1 font-semibold text-navy-900">{value}</p>
    </div>
  );
}
