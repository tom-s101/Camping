"use client";

import { useMemo } from "react";
import {
  EARLY_BIRD_CUTOFF_LABEL,
  SHIRT_CUTOFF_LABEL,
  getActiveShirtOptions,
  isEarlyBird,
  isShirtAvailable,
  localDateISO,
} from "@/lib/pricing";

export default function PricingSummary() {
  const today = useMemo(() => localDateISO(), []);
  const options = useMemo(() => getActiveShirtOptions(today), [today]);

  if (isEarlyBird(today)) {
    return (
      <>
        <span className="font-semibold text-gold-700">Early Bird:</span> ₱{options[0].price} w/o shirt · ₱
        {options[1].price} w/ shirt
        <br />
        <span className="text-xs text-navy-900/50">Through {EARLY_BIRD_CUTOFF_LABEL} only</span>
      </>
    );
  }

  if (isShirtAvailable(today)) {
    return (
      <>
        ₱{options[0].price} w/o shirt · ₱{options[1].price} w/ shirt
        <br />
        <span className="text-xs text-navy-900/50">Through {SHIRT_CUTOFF_LABEL} only</span>
      </>
    );
  }

  return (
    <>
      ₱{options[0].price} per person
      <br />
      <span className="text-xs text-navy-900/50">Standard / walk-in rate</span>
    </>
  );
}
