"use client";

import { useState } from "react";
import { ChevronDownIcon } from "@/components/icons";
import { EVENT } from "@/lib/event";

const FAQS = [
  {
    q: "Where will the camp be held?",
    a: EVENT.locationName,
  },
  {
    q: "Who can attend?",
    a: "This spiritual camp is for the Area 2 youth, but anyone who is willing to join can attend.",
  },
  {
    q: "What are the fees?",
    a: `Registration is ${EVENT.feePhp} pesos per person.`,
  },
  {
    q: "What should I bring?",
    a: "Your Bible, clothes, and a willing spirit.",
  },
  {
    q: "How do I pay?",
    a: "Pay your AY leader, and upload a screenshot of your proof of payment along with the transaction number.",
  },
  {
    q: "Is there a refund policy?",
    a: "There is a no-refund policy. Once you pay, you will be unable to get a refund for your registration.",
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
                <p className="pb-4 text-sm leading-relaxed text-navy-900/70">{item.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
