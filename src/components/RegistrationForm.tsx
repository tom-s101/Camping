"use client";

import Image from "next/image";
import { cloneElement, useId, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { AGE_RANGES } from "@/lib/event";
import { formatCampId } from "@/lib/campId";
import { DISTRICTS, SINGLE_PASTORATES, SINGLE_PASTORATE_LABEL, districtLabel } from "@/lib/districts";
import {
  EARLY_BIRD_CUTOFF_LABEL,
  SHIRT_CUTOFF_LABEL,
  SHIRT_SIZES,
  estimateFeePhp,
  getActiveShirtOptions,
  isEarlyBird,
  isShirtAvailable,
  localDateISO,
  type ShirtChoice,
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
import Modal from "@/components/Modal";

type ChurchMode = "district" | "single_pastorate" | "other";

type Attendee = {
  firstName: string;
  lastName: string;
  ageRange: (typeof AGE_RANGES)[number] | "";
  gender: "male" | "female" | "";
  shirtChoice: ShirtChoice | "";
  shirtSize: ShirtSize | "";
};

const emptyAttendee: Attendee = {
  firstName: "",
  lastName: "",
  ageRange: "",
  gender: "",
  shirtChoice: "",
  shirtSize: "",
};

const inputClass =
  "mt-1 block w-full rounded-md border border-navy-900/20 bg-white px-3 py-2.5 text-sm text-navy-900 placeholder:text-navy-900/40 focus:border-gold-600 focus:outline-none focus:ring-1 focus:ring-gold-600";
const labelClass = "text-sm font-semibold text-navy-900";
const checkboxClass = "mt-0.5 h-4 w-4 shrink-0 accent-gold-600";

export default function RegistrationForm() {
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const today = useMemo(() => localDateISO(), []);
  const activeShirtOptions = useMemo(() => getActiveShirtOptions(today), [today]);
  const singleShirtOption = activeShirtOptions.length === 1 ? activeShirtOptions[0] : null;

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

  function effectiveShirtChoice(a: Attendee): ShirtChoice | "" {
    return singleShirtOption ? singleShirtOption.choice : a.shirtChoice;
  }

  const totalDue = attendees.reduce((sum, a) => {
    const choice = effectiveShirtChoice(a) || "without";
    return sum + estimateFeePhp(today, choice === "with");
  }, 0);

  const pricingNote = isEarlyBird(today)
    ? `Early Bird pricing — through ${EARLY_BIRD_CUTOFF_LABEL} only.`
    : isShirtAvailable(today)
    ? `Through ${SHIRT_CUTOFF_LABEL} only.`
    : "Standard / walk-in rate.";

  const [openedGuidelines, setOpenedGuidelines] = useState(false);
  const [openedRefundPolicy, setOpenedRefundPolicy] = useState(false);
  const [agreedGuidelines, setAgreedGuidelines] = useState(false);
  const [agreedRefundPolicy, setAgreedRefundPolicy] = useState(false);
  const [agreedMinorWaiver, setAgreedMinorWaiver] = useState(false);
  const [confirmedPayment, setConfirmedPayment] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ campNumbers: number[]; totalAmountPhp: number } | null>(null);
  const [invalidKey, setInvalidKey] = useState<string | null>(null);

  const contactRef = useRef<HTMLDivElement>(null);
  const attendeeRefs = useRef<Array<HTMLDivElement | null>>([]);
  const guidelinesRef = useRef<HTMLDivElement>(null);
  const refundRef = useRef<HTMLDivElement>(null);
  const minorWaiverRef = useRef<HTMLDivElement>(null);
  const paymentRef = useRef<HTMLDivElement>(null);

  const updateAttendee = (index: number, patch: Partial<Attendee>) => {
    setAttendees((prev) => prev.map((a, i) => (i === index ? { ...a, ...patch } : a)));
  };

  const addAttendee = () => {
    setAttendees((prev) => [...prev, { ...emptyAttendee }]);
  };
  const removeAttendee = (index: number) =>
    setAttendees((prev) => prev.filter((_, i) => i !== index));

  function contactError(): string | null {
    if (!firstName.trim()) return "Please enter your first name.";
    if (!lastName.trim()) return "Please enter your last name.";
    if (!email.trim()) return "Please enter your email address.";
    if (emailFormatError) return emailFormatError;
    if (!confirmEmail.trim()) return "Please confirm your email address.";
    if (emailMatchError) return emailMatchError;
    if (!phone.trim()) return "Please enter your phone number.";
    if (!district || !churchName) return "Please select your district/pastorate and church.";
    if (!city.trim()) return "Please enter your city.";
    return null;
  }

  function attendeeError(a: Attendee): string | null {
    if (!a.firstName.trim()) return "Please enter this person's first name.";
    if (!a.lastName.trim()) return "Please enter this person's last name.";
    if (!a.ageRange) return "Please select this person's age.";
    if (!a.gender) return "Please select this person's gender.";
    const choice = effectiveShirtChoice(a);
    if (!choice) return "Please choose with or without a camp shirt for this person.";
    if (choice === "with" && !a.shirtSize) return "Please select a shirt size for this person.";
    return null;
  }

  function guidelinesError(): string | null {
    if (!openedGuidelines) return "Please open and read the Camp Rules & Guidelines, then check the box to agree.";
    if (!agreedGuidelines) return "Please check the box to agree to the Camp Rules & Guidelines.";
    return null;
  }

  function refundError(): string | null {
    if (!openedRefundPolicy) {
      return "Please open and read the Cancellation & Transfer Policy, then check the box to agree.";
    }
    if (!agreedRefundPolicy) return "Please check the box to agree to the Cancellation & Transfer Policy.";
    return null;
  }

  function minorWaiverError(): string | null {
    if (!hasMinor) return null;
    if (!agreedMinorWaiver) return "Please check the box confirming you'll bring a signed parental/guardian waiver.";
    return null;
  }

  function paymentError(): string | null {
    if (!confirmedPayment) return "Please check the box confirming your payment coordination.";
    return null;
  }

  function goToFirstError(): boolean {
    const steps: { key: string; ref: RefObject<HTMLDivElement | null>; message: string | null }[] = [
      { key: "contact", ref: contactRef, message: contactError() },
      ...attendees.map((a, i) => ({
        key: `attendee-${i}`,
        ref: { current: attendeeRefs.current[i] },
        message: attendeeError(a),
      })),
      { key: "guidelines", ref: guidelinesRef, message: guidelinesError() },
      { key: "refund", ref: refundRef, message: refundError() },
      ...(hasMinor ? [{ key: "minorWaiver", ref: minorWaiverRef, message: minorWaiverError() }] : []),
      { key: "payment", ref: paymentRef, message: paymentError() },
    ];

    const firstInvalid = steps.find((s) => s.message);
    if (!firstInvalid) {
      setInvalidKey(null);
      return true;
    }

    setInvalidKey(firstInvalid.key);
    const el = firstInvalid.ref.current;
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    const focusTarget =
      el?.querySelector<HTMLElement>("input:not(:disabled), select:not(:disabled), textarea:not(:disabled)") ??
      el?.querySelector<HTMLElement>("button");
    focusTarget?.focus();
    return false;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!goToFirstError()) return;

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
          attendees: attendees.map((a) => {
            const choice = effectiveShirtChoice(a) || "without";
            return {
              first_name: a.firstName,
              last_name: a.lastName,
              age_range: a.ageRange,
              gender: a.gender,
              wants_shirt: choice === "with",
              shirt_size: choice === "with" ? a.shirtSize : null,
            };
          }),
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
        <Card
          title="Primary Contact"
          cardRef={contactRef}
          highlighted={invalidKey === "contact"}
          errorMessage={contactError()}
        >
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
        <div className="overflow-hidden rounded-lg border border-navy-900/10">
          <table className="w-full text-left text-sm">
            <tbody>
              {activeShirtOptions.map((opt) => (
                <tr key={opt.choice} className="border-b border-navy-900/10 last:border-0">
                  <td className="px-3 py-2 font-semibold text-navy-900">{opt.label}</td>
                  <td className="px-3 py-2 text-right font-bold text-gold-700">₱{opt.price}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-navy-900/50">{pricingNote}</p>

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
          Sizes available: {SHIRT_SIZES.join(", ")}. Choose with or without a shirt for each attendee below.
        </p>
      </Card>

      <Card title={`Who's Attending? (${attendees.length})`}>
        <div className="space-y-4">
          {attendees.map((attendee, index) => {
            const rowInvalid = invalidKey === `attendee-${index}`;
            const rowError = rowInvalid ? attendeeError(attendee) : null;
            const choice = effectiveShirtChoice(attendee);
            return (
              <div
                key={index}
                ref={(el) => {
                  attendeeRefs.current[index] = el;
                }}
                className={`rounded-lg border p-4 ${rowInvalid ? "border-red-500 ring-2 ring-red-200" : "border-navy-900/10"}`}
              >
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
                  {singleShirtOption ? (
                    <p className="text-xs text-navy-900/60">
                      Only the <span className="font-semibold">{singleShirtOption.label}</span> rate (₱
                      {singleShirtOption.price}) is currently available.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      <p className={labelClass}>Camp Shirt (required)</p>
                      {activeShirtOptions.map((opt) => (
                        <label key={opt.choice} className="flex items-center gap-2 text-sm text-navy-900">
                          <input
                            type="radio"
                            name={`shirt-choice-${index}`}
                            className="h-4 w-4 accent-gold-600"
                            checked={attendee.shirtChoice === opt.choice}
                            onChange={() =>
                              updateAttendee(index, {
                                shirtChoice: opt.choice,
                                shirtSize: opt.choice === "with" ? attendee.shirtSize : "",
                              })
                            }
                          />
                          {opt.label} — ₱{opt.price}
                        </label>
                      ))}
                    </div>
                  )}
                  {choice === "with" && (
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
                  <p className="mt-2 text-xs font-semibold text-gold-700">
                    Fee for this person: ₱{estimateFeePhp(today, choice === "with").toLocaleString()}
                  </p>
                </div>
                {rowError && <p className="mt-3 text-sm font-semibold text-red-600">{rowError}</p>}
              </div>
            );
          })}
        </div>
        <button
          type="button"
          onClick={addAttendee}
          className="mt-4 w-full rounded-md border border-gold-600 py-2.5 text-sm font-semibold text-gold-700 hover:bg-gold-600/5"
        >
          + Add Another Person (Family / Group)
        </button>
      </Card>

      <Card
        title="Camp Rules & Guidelines"
        cardRef={guidelinesRef}
        highlighted={invalidKey === "guidelines"}
        errorMessage={guidelinesError()}
      >
        <ExpandableAgreement
          title="Camp Rules & Guidelines"
          summary="View the full Camp Rules and Guidelines"
          hasOpened={openedGuidelines}
          onOpen={() => setOpenedGuidelines(true)}
          checked={agreedGuidelines}
          onChange={setAgreedGuidelines}
          agreementText={GUIDELINES_AGREEMENT_TEXT}
        >
          <div className="space-y-3">
            {CAMP_RULES.map((rule, i) => (
              <div key={i} className="flex gap-2.5">
                <span className="shrink-0 font-bold text-gold-700">{i + 1}.</span>
                <p>{rule}</p>
              </div>
            ))}
          </div>
        </ExpandableAgreement>
      </Card>

      <Card
        title="Cancellation & Transfer Policy"
        cardRef={refundRef}
        highlighted={invalidKey === "refund"}
        errorMessage={refundError()}
      >
        <ExpandableAgreement
          title="Cancellation & Transfer Policy"
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
        <Card
          title="Parental / Guardian Waiver Required"
          cardRef={minorWaiverRef}
          highlighted={invalidKey === "minorWaiver"}
          errorMessage={minorWaiverError()}
        >
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

      <Card
        title="Payment"
        cardRef={paymentRef}
        highlighted={invalidKey === "payment"}
        errorMessage={paymentError()}
      >
        <p className="text-sm text-navy-900/70">
          Total due for {attendees.length} {attendees.length === 1 ? "person" : "people"}:
        </p>
        <p className="mt-1 text-3xl font-extrabold text-navy-900">₱{totalDue.toLocaleString()}</p>

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
        disabled={submitting}
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
  title,
  summary,
  children,
  hasOpened,
  onOpen,
  checked,
  onChange,
  agreementText,
}: {
  title: string;
  summary: string;
  children: ReactNode;
  hasOpened: boolean;
  onOpen: () => void;
  checked: boolean;
  onChange: (value: boolean) => void;
  agreementText: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          onOpen();
        }}
        className="text-sm font-semibold text-gold-700 underline underline-offset-2"
      >
        {summary}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={title}>
        {children}
      </Modal>
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
        <p className="mt-1 text-xs text-navy-900/40">Please open and read the section above first.</p>
      )}
    </div>
  );
}

function Card({
  title,
  children,
  cardRef,
  highlighted,
  errorMessage,
}: {
  title: string;
  children: ReactNode;
  cardRef?: RefObject<HTMLDivElement>;
  highlighted?: boolean;
  errorMessage?: string | null;
}) {
  return (
    <div
      ref={cardRef}
      className={`rounded-xl border bg-white p-5 shadow-sm sm:p-6 ${
        highlighted ? "border-red-500 ring-2 ring-red-200" : "border-navy-900/10"
      }`}
    >
      <h2 className="text-lg font-bold text-navy-900">{title}</h2>
      <div className="mt-4">{children}</div>
      {highlighted && errorMessage && <p className="mt-3 text-sm font-semibold text-red-600">{errorMessage}</p>}
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
  children: ReactNode;
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
