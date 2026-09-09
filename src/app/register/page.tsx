import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import RegistrationForm from "@/components/RegistrationForm";
import { EVENT } from "@/lib/event";

export default function RegisterPage() {
  return (
    <>
      <SiteHeader />

      <section className="bg-navy-900 py-14 text-center text-white">
        <p className="text-sm font-semibold uppercase tracking-widest text-gold-500">{EVENT.theme}</p>
        <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">{EVENT.name}</h1>
        <p className="mt-2 text-white/70">{EVENT.dateLabel}</p>
      </section>

      <div className="bg-cream px-4 py-10">
        <div className="mx-auto max-w-2xl">
          <div className="mb-6 rounded-xl border border-navy-900/10 bg-white shadow-sm">
            <div className="border-b border-navy-900/10 bg-navy-900/[0.03] px-5 py-3">
              <h2 className="text-sm font-bold uppercase tracking-wide text-navy-900">Camp Information</h2>
            </div>
            <div className="px-5 py-4 text-sm text-navy-900/80">
              <p>
                <span className="font-semibold text-navy-900">Location:</span> {EVENT.locationName},{" "}
                {EVENT.locationDetail}
              </p>
              <p className="mt-1">
                <span className="font-semibold text-navy-900">Dates:</span> {EVENT.dateLabel}
              </p>
              <p className="mt-1">
                <span className="font-semibold text-navy-900">Open to:</span> {EVENT.openTo}
              </p>
            </div>
          </div>

          <RegistrationForm />
        </div>
      </div>

      <SiteFooter />
    </>
  );
}
