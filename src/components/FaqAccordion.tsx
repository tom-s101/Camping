"use client";

import { useState } from "react";
import { EVENT } from "@/lib/event";

const FAQS = [
  {
    q: "Where will the camp be held?",
    a: `Placeholder: the camp will be held at ${EVENT.locationName}, ${EVENT.locationDetail}. Full directions and a map will be shared closer to the event.`,
  },
  {
    q: "Who can attend?",
    a: `Placeholder: this camp, organized by the ${EVENT.who}, is open to all who are willing to attend — from young children to seniors. A chaperone is required for unaccompanied minors.`,
  },
  {
    q: "What are the fees?",
    a: `Placeholder: registration is ₱${EVENT.feePhp} per person, which covers lodging and meals for the weekend. Family and group registration is available.`,
  },
  {
    q: "What should I bring?",
    a: "Placeholder: bring bedding or a sleeping bag, warm clothing, personal toiletries, a Bible, and any personal medication. A full packing list will be sent after registration.",
  },
  {
    q: "How do I pay, and what if my payment isn't confirmed right away?",
    a: "Placeholder: pay your AY leader in person, then upload a picture of your proof of payment along with the transaction number during registration. Our team manually reviews every payment, so it may take a few days to be marked as confirmed.",
  },
  {
    q: "Is there a refund policy?",
    a: "Placeholder: refund details will be announced closer to the event. Please contact your church coordinator with questions in the meantime.",
  },
];

export default function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="divide-y divide-navy-900/10 rounded-lg border border-navy-900/10 bg-white">
      {FAQS.map((item, index) => {
        const isOpen = openIndex === index;
        return (
          <div key={item.q}>
            <button
              type="button"
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              aria-expanded={isOpen}
              onClick={() => setOpenIndex(isOpen ? null : index)}
            >
              <span className="font-semibold text-navy-900">{item.q}</span>
              <span className="shrink-0 text-xl leading-none text-gold-600">{isOpen ? "−" : "+"}</span>
            </button>
            {isOpen && <p className="px-5 pb-4 text-sm leading-relaxed text-navy-900/70">{item.a}</p>}
          </div>
        );
      })}
    </div>
  );
}
