"use client";

import { useState } from "react";
import type { Registration } from "@/lib/types";

const STATUS_STYLES: Record<Registration["payment_status"], string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

export default function RegistrationCard({
  registration,
  onReview,
  onPreviewImage,
}: {
  registration: Registration;
  onReview: (id: string, action: "approve" | "reject") => Promise<void>;
  onPreviewImage: (url: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleReview(action: "approve" | "reject") {
    setBusy(true);
    await onReview(registration.id, action);
    setBusy(false);
  }

  return (
    <div className="rounded-lg border border-navy-900/10 bg-white">
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          disabled={!registration.payment_proof_url}
          onClick={() => registration.payment_proof_url && onPreviewImage(registration.payment_proof_url)}
          className="shrink-0"
        >
          {registration.payment_proof_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={registration.payment_proof_url}
              alt="Payment proof"
              className="h-14 w-14 rounded-md border border-navy-900/10 object-cover"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-md border border-dashed border-navy-900/20 text-[9px] text-navy-900/40">
              No image
            </div>
          )}
        </button>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left"
        >
          <div className="min-w-0">
            <p className="truncate font-semibold text-navy-900">
              {registration.contact_first_name} {registration.contact_last_name}
            </p>
            <p className="truncate text-xs text-navy-900/50">
              {registration.district} &middot; {registration.church_name} &middot; {registration.city}
            </p>
            <p className="truncate text-xs text-navy-900/60">Ref: {registration.payment_reference}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {registration.group_size > 1 && (
              <span className="rounded-full bg-gold-600/10 px-2.5 py-1 text-xs font-semibold text-gold-700">
                Group of {registration.group_size}
              </span>
            )}
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[registration.payment_status]}`}>
              {registration.payment_status}
            </span>
            <span className="text-navy-900/40">{open ? "−" : "+"}</span>
          </div>
        </button>
      </div>

      {open && (
        <div className="border-t border-navy-900/10 px-4 py-4 text-sm">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase text-navy-900/40">Contact</p>
              <p className="mt-1 text-navy-900">{registration.contact_email}</p>
              <p className="text-navy-900">{registration.contact_phone}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-navy-900/40">Payment</p>
              <p className="mt-1 text-navy-900">₱{Number(registration.total_amount_php).toLocaleString()}</p>
              <p className="text-navy-900">Ref: {registration.payment_reference}</p>
              {registration.payment_proof_url && (
                <button
                  type="button"
                  onClick={() => onPreviewImage(registration.payment_proof_url!)}
                  className="mt-1 inline-block text-gold-700 underline"
                >
                  View proof of payment
                </button>
              )}
            </div>
          </div>

          <div className="mt-4">
            <p className="text-xs font-semibold uppercase text-navy-900/40">Attendees</p>
            <ul className="mt-1 space-y-1">
              {registration.attendees.map((a) => (
                <li key={a.id} className="text-navy-900">
                  {a.first_name} {a.last_name} &middot; {a.age_range} &middot; {a.gender}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              disabled={busy || registration.payment_status === "approved"}
              onClick={() => handleReview("approve")}
              className="flex-1 rounded-md bg-green-600 py-2 text-xs font-bold uppercase text-white disabled:opacity-40"
            >
              Approve
            </button>
            <button
              type="button"
              disabled={busy || registration.payment_status === "rejected"}
              onClick={() => handleReview("reject")}
              className="flex-1 rounded-md bg-red-600 py-2 text-xs font-bold uppercase text-white disabled:opacity-40"
            >
              Reject
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
