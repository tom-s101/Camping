"use client";

import Image from "next/image";
import { cloneElement, useId, useMemo, useState } from "react";
import { AGE_RANGES } from "@/lib/event";
import { formatCampId } from "@/lib/campId";
import { DISTRICTS, SINGLE_PASTORATES, SINGLE_PASTORATE_LABEL, districtLabel } from "@/lib/districts";
import {
  PRICING_TIERS,
  SHIRT_SIZES,
  estimateFeePhp,
  isShirtAvailable,
  localDateISO,
  type ShirtSize,
} from "@/lib/pricing";
import {
  CAMP_RULES,
  CANCELLATION_POLICY,
  GUIDELINES_AGREEMENT_TEXT,
  MINOR_DISCIPLINE_NOTICE,
  PAYMENT_CONFIRMATION_TEXT,
  PAYMENT_PROCESS,
  PAYMENT_PROCESS_DETAILS,
  REFUND_AGREEMENT_TEXT,
  REGISTRATION_CONFIRMATION_DISCLAIMER,
  isMinorAgeRange,
} from "@/lib/campContent";
import SubmitLoadingOverlay from "@/components/SubmitLoadingOverlay";
import LiquidMetalButton from "@/components/LiquidMetalButton";

type ChurchMode = "district" | "single_pastorate" | "other";

type Attendee = {
  firstName: string;
  lastName: string;
  ageRange: (typeof AGE_RANGES)[number] | "";
  gender: "male" | "female" | "";
  wantsShirt: boolean;
  shirtSize: ShirtSize | "";
};

const emptyAttendee: Attendee = {
  firstName: "",
  lastName: "",
  ageRange: "",
  gender: "",
  wantsShirt: false,
  shirtSize: "",
};

const inputClass =
  "mt-1 block w-full rounded-md border border-navy-900/20 bg-white px-3 py-2.5 text-sm text-navy-900 placeholder:text-navy-900/40 focus:border-gold-600 focus:outline-none focus:ring-1 focus:ring-gold-600";
const labelClass = "text-sm font-semibold text-navy-900";
const checkboxClass = "mt-0.5 h-4 w-4 shrink-0 accent-gold-600";

export default function RegistrationForm() {
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const today = useMemo(() => localDateISO(), []);
  const shirtAvailable = useMemo(() => isShirtAvailable(today), [today]);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");

  const emailFormatError =
    email.length > 0 && !/^\S+@\S+\.\S+$/.test(email) ? "Please enter a valid email address." : null;
  const emailMatchError =
    confirmEmail.length > 0 && confirmEmail.trim().toLowerCase() !== email.trim().toLowerCase()
      ? "Email addresses do not match."
      : null;

  const [churchMode, setChurchMode] = useState<ChurchMode>("district");
  const [districtCode, setDistrictCode] = useState("");
  const [districtChurch, setDistrictChurch] = useState("");
  const [pastorName, setPastorName] = useState("");
  const [pastorateChurch, setPastorateChurch] = useState("");
  const [otherDistrict, setOtherDistrict] = useState("");
  const [otherChurch, setOtherChurch] = useState("");

  const selectedDistrict = DISTRICTS.find((d) => d.code === districtCode);
  const selectedPastorate = SINGLE_PASTORATES.find((p) => p.pastor === pastorName);

  const { district, churchName } = useMemo(() => {
    if (churchMode === "district") return { district: districtCode, churchName: districtChurch };
    if (churchMode === "single_pastorate") return { district: SINGLE_PASTORATE_LABEL, churchName: pastorateChurch };
    return { district: otherDistrict.trim(), churchName: otherChurch.trim() };
  }, [churchMode, districtCode, districtChurch, pastorateChurch, otherDistrict, otherChurch]);

  const [attendees, setAttendees] = useState<Attendee[]>([{ ...emptyAttendee }]);
  const hasMinor = attendees.some((a) => a.ageRange && isMinorAgeRange(a.ageRange));
  const estimatedTotal = attendees.reduce((sum, a) => sum + estimateFeePhp(today, a.wantsShirt), 0);

  const [openedGuidelines, setOpenedGuidelines] = useState(false);
  const [openedRefundPolicy, setOpenedRefundPolicy] = useState(false);
  const [agreedGuidelines, setAgreedGuidelines] = useState(false);
  const [agreedRefundPolicy, setAgreedRefundPolicy] = useState(false);
  const [agreedMinorWaiver, setAgreedMinorWaiver] = useState(false);
  const [confirmedPayment, setConfirmedPayment] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ campNumbers: number[]; totalAmountPhp: number } | null>(null);

  const updateAttendee = (index: number, patch: Partial<Attendee>) => {
    setAttendees((prev) => prev.map((a, i) => (i === index ? { ...a, ...patch } : a)));
  };

  const addAttendee = () => setAttendees((prev) => [...prev, { ...emptyAttendee }]);
  const removeAttendee = (index: number) =>
    setAttendees((prev) => prev.filter((_, i) => i !== index));

  const canSubmit = useMemo(() => {
    if (submitting) return false;
    if (!firstName || !lastName || !email || !confirmEmail || !phone || !district || !churchName || !city) {
      return false;
    }
    if (emailFormatError || emailMatchError) return false;
    if (!agreedGuidelines || !agreedRefundPolicy || !confirmedPayment) return false;
    if (hasMinor && !agreedMinorWaiver) return false;
    return attendees.every(
      (a) => a.firstName && a.lastName && a.ageRange && a.gender && (!a.wantsShirt || a.shirtSize)
    );
  }, [
    submitting,
    firstName,
    lastName,
    email,
    confirmEmail,
    emailFormatError,
    emailMatchError,
    phone,
    district,
    churchName,
    city,
    agreedGuidelines,
    agreedRefundPolicy,
    confirmedPayment,
    hasMinor,
    agreedMinorWaiver,
    attendees,
  ]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (emailFormatError || emailMatchError) {
      setError(emailFormatError ?? emailMatchError);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idempotencyKey,
          firstName,
          lastName,
          email,
          phone,
          district,
          churchName,
          city,
          agreedGuidelines,
          agreedRefundPolicy,
          agreedMinorWaiver: hasMinor ? agreedMinorWaiver : false,
          confirmedPayment,
          attendees: attendees.map((a) => ({
            first_name: a.firstName,
            last_name: a.lastName,
            age_range: a.ageRange,
            gender: a.gender,
            wants_shirt: a.wantsShirt,
            shirt_size: a.wantsShirt ? a.shirtSize : null,
          })),
        }),
      });

      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "Something went wrong. Please try again.");

      const data = body.data as { camp_numbers: number[]; total_amount_php: number };
      setResult({ campNumbers: data.camp_numbers ?? [], totalAmountPhp: Number(data.total_amount_php ?? 0) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    const groupSize = result.campNumbers.length;
    return (
      <div className="rounded-xl border border-gold-600/30 bg-white p-8 text-center shadow-sm">
        <h2 className="text-2xl font-bold text-navy-900">You&apos;re registered!</h2>
        <p className="mt-3 text-navy-900/70">
          We received your registration for {groupSize} {groupSize === 1 ? "person" : "people"}. Our team
          will review your information and payment and confirm your slot within a few days. A confirmation
          email is on its way to {email}.
        </p>
        <p className="mt-4 text-sm font-semibold text-navy-900">
          {groupSize === 1 ? "Your Camp ID:" : "Your Camp IDs:"}
        </p>
        <p className="mt-1 text-lg font-bold tracking-wide text-gold-700">
          {result.campNumbers.map(formatCampId).join(", ")}
        </p>
        <p className="mt-4 text-sm text-navy-900/70">
          Total due: <span className="font-bold text-navy-900">₱{result.totalAmountPhp.toLocaleString()}</span>
        </p>
      </div>
    );
  }

  return (
    <>
      {submitting && <SubmitLoadingOverlay />}
      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <Card title="Primary Contact">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="First Name">
            <input className={inputClass} value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
          </Field>
          <Field label="Last Name">
            <input className={inputClass} value={lastName} onChange={(e) => setLastName(e.target.value)} required />
          </Field>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Email Address">
            <input type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <div>
            <Field label="Confirm Email Address">
              <input
                type="email"
                className={inputClass}
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                required
              />
            </Field>
            {emailMatchError && <p className="mt-1 text-xs font-semibold text-red-600">{emailMatchError}</p>}
          </div>
        </div>
        {emailFormatError && <p className="mt-1 text-xs font-semibold text-red-600">{emailFormatError}</p>}
        <div className="mt-4">
          <Field label="Phone Number">
            <input type="tel" className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} required />
          </Field>
        </div>
        <div className="mt-4">
          <span className={labelClass}>Church</span>
          <div className="mt-1 flex gap-2">
            <ModeButton active={churchMode === "district"} onClick={() => setChurchMode("district")}>
              District
            </ModeButton>
            <ModeButton active={churchMode === "single_pastorate"} onClick={() => setChurchMode("single_pastorate")}>
              Single Pastorate
            </ModeButton>
            <ModeButton active={churchMode === "other"} onClick={() => setChurchMode("other")}>
              Other
            </ModeButton>
          </div>

          {churchMode === "district" && (
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="District / Pastor">
                <select
                  className={inputClass}
                  value={districtCode}
                  onChange={(e) => {
                    setDistrictCode(e.target.value);
                    setDistrictChurch("");
                  }}
                  required
                >
                  <option value="" disabled>
                    Select your district or pastor
                  </option>
                  {DISTRICTS.map((d) => (
                    <option key={d.code} value={d.code}>
                      {districtLabel(d)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Church">
                <select
                  className={inputClass}
                  value={districtChurch}
                  onChange={(e) => setDistrictChurch(e.target.value)}
                  disabled={!selectedDistrict}
                  required
                >
                  <option value="" disabled>
                    {selectedDistrict ? "Select your church" : "Select a district first"}
                  </option>
                  {selectedDistrict?.churches.map((church) => (
                    <option key={church} value={church}>
                      {church}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          )}

          {churchMode === "single_pastorate" && (
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Pastor">
                <select
                  className={inputClass}
                  value={pastorName}
                  onChange={(e) => {
                    setPastorName(e.target.value);
                    setPastorateChurch("");
                  }}
                  required
                >
                  <option value="" disabled>
                    Select your pastor
                  </option>
                  {SINGLE_PASTORATES.map((p) => (
                    <option key={p.pastor} value={p.pastor}>
                      Pastor {p.pastor}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Church">
                <select
                  className={inputClass}
                  value={pastorateChurch}
                  onChange={(e) => setPastorateChurch(e.target.value)}
                  disabled={!selectedPastorate}
                  required
                >
                  <option value="" disabled>
                    {selectedPastorate ? "Select your church" : "Select a pastor first"}
                  </option>
                  {selectedPastorate?.churches.map((church) => (
                    <option key={church} value={church}>
                      {church}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          )}

          {churchMode === "other" && (
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="District">
                <input
                  className={inputClass}
                  value={otherDistrict}
                  onChange={(e) => setOtherDistrict(e.target.value)}
                  required
                />
              </Field>
              <Field label="Church">
                <input
                  className={inputClass}
                  value={otherChurch}
                  onChange={(e) => setOtherChurch(e.target.value)}
                  required
                />
              </Field>
            </div>
          )}
        </div>

        <div className="mt-4">
          <Field label="City">
            <input className={inputClass} value={city} onChange={(e) => setCity(e.target.value)} required />
          </Field>
        </div>
      </Card>

      <Card title="Pricing & Camp Shirt">
        <p className="text-sm text-navy-900/70">Pricing depends on when you register:</p>
        <div className="mt-3 overflow-hidden rounded-lg border border-navy-900/10">
          <table className="w-full text-left text-sm">
            <tbody>
              {PRICING_TIERS.map((tier) => (
                <tr key={tier.label} className="border-b border-navy-900/10 last:border-0">
                  <td className="px-3 py-2 font-semibold text-navy-900">{tier.label}</td>
                  <td className="hidden px-3 py-2 text-xs text-navy-900/60 sm:table-cell">{tier.note}</td>
                  <td className="px-3 py-2 text-right font-bold text-gold-700">₱{tier.price}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-navy-900/50">
          Your final price is confirmed by our system when you submit, based on that date — not your
          device&apos;s clock.
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <Image
            src="/images/camp-shirt-front.jpg"
            alt="Camp shirt front design"
            width={500}
            height={500}
            className="w-full rounded-lg border border-navy-900/10 object-cover"
          />
          <Image
            src="/images/camp-shirt-back.jpg"
            alt="Camp shirt back design"
            width={500}
            height={500}
            className="w-full rounded-lg border border-navy-900/10 object-cover"
          />
        </div>
        <p className="mt-2 text-xs text-navy-900/50">
          Sizes available: {SHIRT_SIZES.join(", ")}. You can add a shirt for each attendee below.
        </p>
      </Card>

      <Card title={`Who's Attending? (${attendees.length})`}>
        <div className="space-y-4">
          {attendees.map((attendee, index) => (
            <div key={index} className="rounded-lg border border-navy-900/10 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-navy-900">
                  {index === 0 ? "Person 1 (You)" : `Person ${index + 1}`}
                </p>
                {index > 0 && (
                  <button
                    type="button"
                    onClick={() => removeAttendee(index)}
                    className="text-xs font-semibold text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="First Name">
                  <input
                    className={inputClass}
                    value={attendee.firstName}
                    onChange={(e) => updateAttendee(index, { firstName: e.target.value })}
                    required
                  />
                </Field>
                <Field label="Last Name">
                  <input
                    className={inputClass}
                    value={attendee.lastName}
                    onChange={(e) => updateAttendee(index, { lastName: e.target.value })}
                    required
                  />
                </Field>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Age">
                  <select
                    className={inputClass}
                    value={attendee.ageRange}
                    onChange={(e) => updateAttendee(index, { ageRange: e.target.value as Attendee["ageRange"] })}
                    required
                  >
                    <option value="" disabled>
                      Select age range
                    </option>
                    {AGE_RANGES.map((range) => (
                      <option key={range} value={range}>
                        {range}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Gender">
                  <select
                    className={inputClass}
                    value={attendee.gender}
                    onChange={(e) => updateAttendee(index, { gender: e.target.value as Attendee["gender"] })}
                    required
                  >
                    <option value="" disabled>
                      Select gender
                    </option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </Field>
              </div>

              <div className="mt-4 rounded-md bg-cream p-3">
                {shirtAvailable ? (
                  <>
                    <label className="flex items-center gap-2 text-sm font-semibold text-navy-900">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-gold-600"
                        checked={attendee.wantsShirt}
                        onChange={(e) =>
                          updateAttendee(index, {
                            wantsShirt: e.target.checked,
                            shirtSize: e.target.checked ? attendee.shirtSize : "",
                          })
                        }
                      />
                      Add a camp shirt for this person
                    </label>
                    {attendee.wantsShirt && (
                      <div className="mt-3">
                        <Field label="Shirt Size">
                          <select
                            className={inputClass}
                            value={attendee.shirtSize}
                            onChange={(e) => updateAttendee(index, { shirtSize: e.target.value as ShirtSize })}
                            required
                          >
                            <option value="" disabled>
                              Select size
                            </option>
                            {SHIRT_SIZES.map((size) => (
                              <option key={size} value={size}>
                                {size}
                              </option>
                            ))}
                          </select>
                        </Field>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-navy-900/50">
                    The camp shirt add-on is no longer available for new registrations.
                  </p>
                )}
                <p className="mt-2 text-xs font-semibold text-gold-700">
                  Estimated fee for this person: ₱{estimateFeePhp(today, attendee.wantsShirt).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addAttendee}
          className="mt-4 w-full rounded-md border border-gold-600 py-2.5 text-sm font-semibold text-gold-700 hover:bg-gold-600/5"
        >
          + Add Another Person (Family / Group)
        </button>
      </Card>

      <Card title="Camp Rules & Guidelines">
        <ExpandableAgreement
          summary="View the full Camp Rules and Guidelines"
          hasOpened={openedGuidelines}
          onOpen={() => setOpenedGuidelines(true)}
          checked={agreedGuidelines}
          onChange={setAgreedGuidelines}
          agreementText={GUIDELINES_AGREEMENT_TEXT}
        >
          <ol className="list-decimal space-y-2 pl-5">
            {CAMP_RULES.map((rule, i) => (
              <li key={i}>{rule}</li>
            ))}
          </ol>
        </ExpandableAgreement>
      </Card>

      <Card title="Cancellation & Transfer Policy">
        <ExpandableAgreement
          summary="View the Cancellation and Transfer Policy"
          hasOpened={openedRefundPolicy}
          onOpen={() => setOpenedRefundPolicy(true)}
          checked={agreedRefundPolicy}
          onChange={setAgreedRefundPolicy}
          agreementText={REFUND_AGREEMENT_TEXT}
        >
          <div className="space-y-2">
            {CANCELLATION_POLICY.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </ExpandableAgreement>
      </Card>

      {hasMinor && (
        <Card title="Parental / Guardian Waiver Required">
          <p className="text-sm text-navy-900/80">
            Your group includes at least one minor (under 18). Their parent or legal guardian must sign a
            waiver form for them to attend. Bring the signed, physical copy to camp check-in — it is not
            uploaded here.
          </p>
          <a
            href="/downloads/sanctuary-camp-2026-parental-waiver.pdf"
            download
            className="mt-3 inline-block text-sm font-semibold text-gold-700 underline underline-offset-2"
          >
            Download the Parental/Guardian Waiver Form (PDF)
          </a>
          <label className="mt-4 flex items-start gap-2.5 text-sm text-navy-900">
            <input
              type="checkbox"
              className={checkboxClass}
              checked={agreedMinorWaiver}
              onChange={(e) => setAgreedMinorWaiver(e.target.checked)}
            />
            <span>
              I will bring a signed parental/guardian waiver form for the minor(s) in my group. {MINOR_DISCIPLINE_NOTICE}
            </span>
          </label>
        </Card>
      )}

      <Card title="Payment">
        <p className="text-sm text-navy-900/70">
          Estimated total due for {attendees.length} {attendees.length === 1 ? "person" : "people"}:
        </p>
        <p className="mt-1 text-3xl font-extrabold text-navy-900">₱{estimatedTotal.toLocaleString()}</p>

        <div className="mt-5 rounded-lg bg-cream p-4 text-sm text-navy-900/80">
          <p className="font-semibold text-navy-900">Registration Payment Confirmation</p>
          <p className="mt-1">
            Before completing this form, please coordinate your payment with your respective AY
            Leader/District Representative.
          </p>
          <ul className="mt-3 list-disc space-y-1.5 pl-5">
            {PAYMENT_PROCESS.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
          <details className="mt-3">
            <summary className="cursor-pointer text-xs font-semibold text-gold-700">
              More about the payment process
            </summary>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-xs">
              {PAYMENT_PROCESS_DETAILS.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </details>
        </div>

        <label className="mt-4 flex items-start gap-2.5 text-sm text-navy-900">
          <input
            type="checkbox"
            className={checkboxClass}
            checked={confirmedPayment}
            onChange={(e) => setConfirmedPayment(e.target.checked)}
          />
          <span>{PAYMENT_CONFIRMATION_TEXT}</span>
        </label>
      </Card>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <p className="text-xs leading-relaxed text-navy-900/60">{REGISTRATION_CONFIRMATION_DISCLAIMER}</p>

      <LiquidMetalButton
        type="submit"
        disabled={!canSubmit}
        className="w-full rounded-md"
        innerClassName="rounded-md py-4 text-sm font-bold uppercase tracking-wide"
      >
        {submitting ? "Submitting…" : "Submit Registration"}
      </LiquidMetalButton>
      </form>
    </>
  );
}

function ExpandableAgreement({
  summary,
  children,
  hasOpened,
  onOpen,
  checked,
  onChange,
  agreementText,
}: {
  summary: string;
  children: React.ReactNode;
  hasOpened: boolean;
  onOpen: () => void;
  checked: boolean;
  onChange: (value: boolean) => void;
  agreementText: string;
}) {
  return (
    <div>
      <details
        onToggle={(e) => {
          if ((e.target as HTMLDetailsElement).open) onOpen();
        }}
      >
        <summary className="cursor-pointer text-sm font-semibold text-gold-700">{summary}</summary>
        <div className="mt-3 max-h-64 overflow-y-auto pr-2 text-sm leading-relaxed text-navy-900/80">
          {children}
        </div>
      </details>
      <label
        className={`mt-4 flex items-start gap-2.5 text-sm ${hasOpened ? "text-navy-900" : "text-navy-900/40"}`}
      >
        <input
          type="checkbox"
          className={checkboxClass}
          checked={checked}
          disabled={!hasOpened}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span>{agreementText}</span>
      </label>
      {!hasOpened && (
        <p className="mt-1 text-xs text-navy-900/40">Please expand and read the section above first.</p>
      )}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-navy-900/10 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-bold text-navy-900">{title}</h2>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactElement }) {
  const id = useId();
  return (
    <div className="block">
      <label htmlFor={id} className={`block ${labelClass}`}>
        {label}
      </label>
      {cloneElement(children, { id })}
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-full border py-2 text-xs font-semibold transition sm:text-sm ${
        active ? "border-gold-600 bg-gold-600 text-white" : "border-navy-900/20 text-navy-900/70"
      }`}
    >
      {children}
    </button>
  );
}
