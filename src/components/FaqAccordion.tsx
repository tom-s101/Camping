"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";
import { ChevronDownIcon } from "@/components/icons";
import { EVENT } from "@/lib/event";
import { PRICING_TIERS, SHIRT_SIZES } from "@/lib/pricing";
import { CANCELLATION_POLICY, DO_NOT_BRING, PACKING_LIST, PACKING_REMINDER } from "@/lib/campContent";

const FAQS: { q: string; a: ReactNode }[] = [
  {
    q: "Where will the camp be held?",
    a: `${EVENT.locationName}, ${EVENT.locationDetail}`,
  },
  {
    q: "Who can attend?",
    a: "This spiritual camp is for the Area 2 youth, but anyone who is willing to join can attend.",
  },
  {
    q: "What are the fees?",
    a: (
      <div>
        <p>Registration pricing depends on when you register:</p>
        <ul className="mt-2 space-y-1.5">
          {PRICING_TIERS.map((tier) => (
            <li key={tier.label}>
              <span className="font-semibold text-navy-900">{tier.label}:</span> ₱{tier.price} ({tier.note})
            </li>
          ))}
        </ul>
      </div>
    ),
  },
  {
    q: "What should I bring — and what should I NOT bring?",
    a: (
      <div>
        <p className="font-semibold text-navy-900">Things to bring:</p>
        <ul className="mt-2 space-y-1">
          {PACKING_LIST.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="mt-3">{PACKING_REMINDER}</p>
        <p className="mt-3">
          <span className="font-semibold text-red-700">Do not bring:</span> {DO_NOT_BRING}
        </p>
      </div>
    ),
  },
  {
    q: "What does the camp shirt look like?",
    a: (
      <div>
        <p>
          An optional camp shirt is available as an add-on during registration, in sizes {SHIRT_SIZES.join(", ")}.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Image
            src="/images/camp-shirt-front.jpg"
            alt="Camp shirt front design"
            width={400}
            height={400}
            className="w-full rounded-lg border border-navy-900/10 object-cover"
          />
          <Image
            src="/images/camp-shirt-back.jpg"
            alt="Camp shirt back design"
            width={400}
            height={400}
            className="w-full rounded-lg border border-navy-900/10 object-cover"
          />
        </div>
      </div>
    ),
  },
  {
    q: "How do I pay?",
    a: "Coordinate and submit your payment to your respective District President (DP), who consolidates all registrants' payments under their district into one payment to the Area Treasurer. No proof of payment needs to be uploaded — you'll simply check a confirmation box on the registration form.",
  },
  {
    q: "Is there a refund or cancellation policy?",
    a: (
      <div className="space-y-2">
        {CANCELLATION_POLICY.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    ),
  },
];

export default function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="divide-y divide-navy-900/10 border-t border-navy-900/10">
      {FAQS.map((item, index) => {
        const isOpen = openIndex === index;
        return (
          <div key={item.q}>
            <button
              type="button"
              className="flex w-full items-center justify-between gap-4 py-4 text-left"
              aria-expanded={isOpen}
              onClick={() => setOpenIndex(isOpen ? null : index)}
            >
              <span className="font-semibold text-navy-900">{item.q}</span>
              <ChevronDownIcon
                className={`h-4 w-4 shrink-0 text-gold-600 transition-transform duration-200 ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            <div
              className="grid transition-all duration-300 ease-in-out"
              style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
            >
              <div className="overflow-hidden">
                <div className="pb-4 text-sm leading-relaxed text-navy-900/70">{item.a}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
