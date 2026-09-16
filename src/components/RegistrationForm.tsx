"use client";

import { cloneElement, useId, useMemo, useState } from "react";
import { AGE_RANGES, EVENT, UPLOAD } from "@/lib/event";
import { formatCampId } from "@/lib/campId";
import { DISTRICTS, SINGLE_PASTORATES, SINGLE_PASTORATE_LABEL, districtLabel } from "@/lib/districts";
import { supabase } from "@/lib/supabase/client";
import { extensionForMimeType, validateUploadFile } from "@/lib/validateUpload";
import SubmitLoadingOverlay from "@/components/SubmitLoadingOverlay";

type ChurchMode = "district" | "single_pastorate" | "other";

type Attendee = {
  firstName: string;
  lastName: string;
  ageRange: (typeof AGE_RANGES)[number] | "";
  gender: "male" | "female" | "";
};

const emptyAttendee: Attendee = { firstName: "", lastName: "", ageRange: "", gender: "" };

const inputClass =
  "mt-1 block w-full rounded-md border border-navy-900/20 bg-white px-3 py-2.5 text-sm text-navy-900 placeholder:text-navy-900/40 focus:border-gold-600 focus:outline-none focus:ring-1 focus:ring-gold-600";
const labelClass = "text-sm font-semibold text-navy-900";

export default function RegistrationForm() {
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const proofFileInputId = useId();

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

  const [paymentReference, setPaymentReference] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ campNumbers: number[] } | null>(null);

  const total = attendees.length * EVENT.feePhp;

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
    if (!paymentReference || !proofFile) return false;
    return attendees.every((a) => a.firstName && a.lastName && a.ageRange && a.gender);
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
    paymentReference,
    proofFile,
    attendees,
  ]);

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
    if (emailFormatError || emailMatchError) {
      setError(emailFormatError ?? emailMatchError);
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
        p_district: district,
        p_church_name: churchName,
        p_city: city,
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

      const campNumbers = (data as { registration_id: string; camp_numbers: number[] }).camp_numbers ?? [];
      setResult({ campNumbers });
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
          will review your payment and confirm it within a few days.
        </p>
        <p className="mt-4 text-sm font-semibold text-navy-900">
          {groupSize === 1 ? "Your Camp ID:" : "Your Camp IDs:"}
        </p>
        <p className="mt-1 text-lg font-bold tracking-wide text-gold-700">
          {result.campNumbers.map(formatCampId).join(", ")}
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
          className="mt-4 w-full rounded-md border border-gold-600 py-2.5 text-sm font-semibold text-gold-700 hover:bg-gold-600/5"
        >
          + Add Another Person (Family / Group)
        </button>
      </Card>

      <Card title="Payment">
        <p className="text-sm text-navy-900/70">
          Total due for {attendees.length} {attendees.length === 1 ? "person" : "people"} at ₱{EVENT.feePhp} each:
        </p>
        <p className="mt-1 text-3xl font-extrabold text-navy-900">₱{total.toLocaleString()}</p>

        <div className="mt-5 rounded-lg bg-cream p-4 text-sm text-navy-900/80">
          <p className="font-semibold text-navy-900">Upload your proof of payment to your AY leader.</p>
          <p className="mt-1">
            Pay your AY leader in person, then upload a picture of your proof of payment below along with the
            transaction number.
          </p>
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
          <label htmlFor={proofFileInputId} className={labelClass}>
            Proof of Payment (picture given to your AY leader)
          </label>
          <input
            id={proofFileInputId}
            type="file"
            accept={UPLOAD.acceptedMimeTypes.join(",")}
            onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
            className="mt-1 block w-full text-sm text-navy-900/70 file:mr-4 file:rounded-md file:border-0 file:bg-navy-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
            required
          />
          <p className="mt-1 text-xs text-navy-900/50">JPG, PNG, WEBP, or PDF. Max size 2MB.</p>
          {proofFile && !fileError && (
            <p className="mt-1 text-xs text-gold-700">
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
    </>
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

