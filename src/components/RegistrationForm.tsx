"use client";

import { useMemo, useState } from "react";
import { AGE_RANGES, EVENT, PAYMENT, UPLOAD } from "@/lib/event";
import { supabase } from "@/lib/supabase/client";
import { extensionForMimeType, validateUploadFile } from "@/lib/validateUpload";

type Attendee = {
  firstName: string;
  lastName: string;
  ageRange: (typeof AGE_RANGES)[number] | "";
  gender: "male" | "female" | "";
};

const emptyAttendee: Attendee = { firstName: "", lastName: "", ageRange: "", gender: "" };

const inputClass =
  "mt-1 block w-full rounded-md border border-navy-900/20 bg-white px-3 py-2.5 text-sm text-navy-900 placeholder:text-navy-900/40 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600";
const labelClass = "text-sm font-semibold text-navy-900";

export default function RegistrationForm() {
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [churchName, setChurchName] = useState("");
  const [city, setCity] = useState("");

  const [attendees, setAttendees] = useState<Attendee[]>([{ ...emptyAttendee }]);

  const [paymentMethod, setPaymentMethod] = useState<"gcash" | "bank_transfer">("gcash");
  const [paymentReference, setPaymentReference] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ id: string; groupSize: number } | null>(null);

  const total = attendees.length * EVENT.feePhp;

  const updateAttendee = (index: number, patch: Partial<Attendee>) => {
    setAttendees((prev) => prev.map((a, i) => (i === index ? { ...a, ...patch } : a)));
  };

  const addAttendee = () => setAttendees((prev) => [...prev, { ...emptyAttendee }]);
  const removeAttendee = (index: number) =>
    setAttendees((prev) => prev.filter((_, i) => i !== index));

  const canSubmit = useMemo(() => {
    if (submitting) return false;
    if (!firstName || !lastName || !email || !phone || !churchName || !city) return false;
    if (!paymentReference || !proofFile) return false;
    return attendees.every((a) => a.firstName && a.lastName && a.ageRange && a.gender);
  }, [submitting, firstName, lastName, email, phone, churchName, city, paymentReference, proofFile, attendees]);

  async function handleFileChange(file: File | null) {
    setProofFile(null);
    setFileError(null);
    if (!file) return;
    const reason = await validateUploadFile(file);
    if (reason) {
      setFileError(reason);
      return;
    }
    setProofFile(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!proofFile) {
      setError("Please upload your proof of payment.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setSubmitting(true);
    try {
      const path = `${idempotencyKey}/proof.${extensionForMimeType(proofFile.type)}`;

      const { error: uploadError } = await supabase.storage
        .from("payment-proofs")
        .upload(path, proofFile, { contentType: proofFile.type, upsert: true });
      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

      const { data, error: rpcError } = await supabase.rpc("submit_registration", {
        p_idempotency_key: idempotencyKey,
        p_contact_first_name: firstName,
        p_contact_last_name: lastName,
        p_contact_email: email,
        p_contact_phone: phone,
        p_church_name: churchName,
        p_city: city,
        p_payment_method: paymentMethod,
        p_payment_reference: paymentReference,
        p_payment_proof_path: path,
        p_attendees: attendees.map((a) => ({
          first_name: a.firstName,
          last_name: a.lastName,
          age_range: a.ageRange,
          gender: a.gender,
        })),
        p_fee_php: EVENT.feePhp,
      });
      if (rpcError) throw new Error(rpcError.message);

      setResult({ id: data as string, groupSize: attendees.length });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="rounded-xl border border-teal-600/30 bg-white p-8 text-center shadow-sm">
        <h2 className="text-2xl font-bold text-navy-900">You&apos;re registered!</h2>
        <p className="mt-3 text-navy-900/70">
          We received your registration for {result.groupSize}{" "}
          {result.groupSize === 1 ? "person" : "people"}. Our team will review your payment and confirm
          it within a few days.
        </p>
        <p className="mt-4 text-xs text-navy-900/50">Reference ID: {result.id}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
          <Field label="Phone Number">
            <input type="tel" className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} required />
          </Field>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Church">
            <input className={inputClass} value={churchName} onChange={(e) => setChurchName(e.target.value)} required />
          </Field>
          <Field label="City">
            <input className={inputClass} value={city} onChange={(e) => setCity(e.target.value)} required />
          </Field>
        </div>
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
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addAttendee}
          className="mt-4 w-full rounded-md border border-teal-600 py-2.5 text-sm font-semibold text-teal-700 hover:bg-teal-600/5"
        >
          + Add Another Person (Family / Group)
        </button>
      </Card>

      <Card title="Payment">
        <p className="text-sm text-navy-900/70">
          Total due for {attendees.length} {attendees.length === 1 ? "person" : "people"} at ₱{EVENT.feePhp} each:
        </p>
        <p className="mt-1 text-3xl font-extrabold text-navy-900">₱{total.toLocaleString()}</p>

        <div className="mt-5 flex gap-3">
          <PaymentMethodButton
            active={paymentMethod === "gcash"}
            onClick={() => setPaymentMethod("gcash")}
            label="GCash"
          />
          <PaymentMethodButton
            active={paymentMethod === "bank_transfer"}
            onClick={() => setPaymentMethod("bank_transfer")}
            label="Bank Transfer"
          />
        </div>

        <div className="mt-5 rounded-lg bg-cream p-4">
          {paymentMethod === "gcash" ? (
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
              <QrPlaceholder />
              <div className="text-sm text-navy-900/80">
                <p className="font-semibold text-navy-900">Send payment via GCash to:</p>
                <p className="mt-1">{PAYMENT.gcash.name}</p>
                <p>{PAYMENT.gcash.number}</p>
                <p className="mt-2 text-xs text-navy-900/50">(Placeholder account details)</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
              <QrPlaceholder />
              <div className="text-sm text-navy-900/80">
                <p className="font-semibold text-navy-900">Send payment via bank transfer to:</p>
                <p className="mt-1">{PAYMENT.bank.bankName}</p>
                <p>{PAYMENT.bank.accountName}</p>
                <p>{PAYMENT.bank.accountNumber}</p>
                <p className="mt-2 text-xs text-navy-900/50">(Placeholder account details)</p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-5">
          <Field label="Reference / Transaction Number">
            <input
              className={inputClass}
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              required
            />
          </Field>
        </div>

        <div className="mt-4">
          <label className={labelClass}>Proof of Payment (screenshot or receipt)</label>
          <input
            type="file"
            accept={UPLOAD.acceptedMimeTypes.join(",")}
            onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
            className="mt-1 block w-full text-sm text-navy-900/70 file:mr-4 file:rounded-md file:border-0 file:bg-navy-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
            required
          />
          <p className="mt-1 text-xs text-navy-900/50">JPG, PNG, WEBP, or PDF. Max size 2MB.</p>
          {proofFile && !fileError && (
            <p className="mt-1 text-xs text-teal-700">
              Selected: {proofFile.name} ({(proofFile.size / 1024 / 1024).toFixed(2)}MB)
            </p>
          )}
          {fileError && <p className="mt-1 text-xs text-red-600">{fileError}</p>}
        </div>
      </Card>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full rounded-md bg-navy-950 py-4 text-sm font-bold uppercase tracking-wide text-white transition hover:bg-navy-900 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {submitting ? "Submitting…" : "Submit Registration"}
      </button>
    </form>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  );
}

function PaymentMethodButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-full border py-2.5 text-sm font-semibold transition ${
        active ? "border-teal-600 bg-teal-600 text-white" : "border-navy-900/20 text-navy-900/70"
      }`}
    >
      {label}
    </button>
  );
}

function QrPlaceholder() {
  return (
    <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-md border-2 border-dashed border-navy-900/30 text-center text-[10px] text-navy-900/40">
      QR Code Placeholder
    </div>
  );
}
