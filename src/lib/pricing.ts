// Sanctuary Camp 2026 tiered pricing.
//
// The authoritative calculation lives in the `compute_attendee_fee()`
// Postgres function (supabase/migrations/0004_...sql), which uses the
// database server's clock — a registrant's device clock can be changed to
// anything, so it is never trusted for pricing. Everything in this file is
// used only to show a "your estimated total" preview in the UI before the
// server confirms the real total in its response.
export const PRICING_TIMEZONE = "Asia/Manila";

// Early Bird pricing ends at the end of this date (inclusive).
export const EARLY_BIRD_CUTOFF = "2026-09-30";
// Shirt add-on (at the Regular rate) is available through the end of this
// date (inclusive). After this date, only the no-shirt Standard rate applies.
export const SHIRT_CUTOFF = "2026-10-08";

export const SHIRT_SIZES = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL"] as const;
export type ShirtSize = (typeof SHIRT_SIZES)[number];

export type ShirtChoice = "with" | "without";

// Flat add-on cost for a camp shirt, on top of the age-based registration
// fee below -- constant across tiers (750-500 = 250, 850-600 = 250).
export const SHIRT_SURCHARGE_PHP = 250;

export const PRICING_TIERS = [
  { label: "Early Bird Rate w/o Shirt", price: 500, note: `Until ${formatCutoff(EARLY_BIRD_CUTOFF)} ONLY`, shirt: false },
  { label: "Early Bird Rate w/ Shirt", price: 750, note: `Until ${formatCutoff(EARLY_BIRD_CUTOFF)} ONLY`, shirt: true },
  { label: "Regular Rate w/ Shirt", price: 850, note: `Until ${formatCutoff(SHIRT_CUTOFF)} ONLY`, shirt: true },
  { label: "Standard Rate w/o Shirt", price: 600, note: "Starting 01 October 2026 · Walk-in/On-the-day registration", shirt: false },
] as const;

/**
 * Age-based pricing (applies to the registration fee only, not the shirt
 * surcharge, which stays flat regardless of age):
 *   6 and below  -> free
 *   7-9          -> half the listed rate
 *   10 and up    -> full listed rate
 */
export function ageFeeMultiplier(ageRange: string): number {
  if (ageRange === "0-6") return 0;
  if (ageRange === "7-9") return 0.5;
  return 1;
}

export const EARLY_BIRD_CUTOFF_LABEL = formatCutoff(EARLY_BIRD_CUTOFF);
export const SHIRT_CUTOFF_LABEL = formatCutoff(SHIRT_CUTOFF);

function formatCutoff(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Today's date (YYYY-MM-DD) in the camp's local timezone, per this device's clock. */
export function localDateISO(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: PRICING_TIMEZONE });
}

/** Whether the shirt add-on can still be selected on the given date. */
export function isShirtAvailable(dateISO: string): boolean {
  return dateISO <= SHIRT_CUTOFF;
}

/** Whether Early Bird pricing is still in effect on the given date. */
export function isEarlyBird(dateISO: string): boolean {
  return dateISO <= EARLY_BIRD_CUTOFF;
}

/** The base (no-shirt, full/adult-price) registration rate for the given date. */
function baseRatePhp(dateISO: string): number {
  return dateISO <= EARLY_BIRD_CUTOFF ? 500 : 600;
}

/**
 * The valid with/without-shirt choices for the given date, with their
 * price adjusted for the attendee's age bracket (the shirt surcharge itself
 * is never discounted). Early Bird offers a real choice (with or without
 * shirt); once Early Bird ends there's still a choice (Regular w/ shirt vs
 * Standard w/o) until the shirt cutoff, after which only the no-shirt
 * option remains and there is nothing left to choose.
 */
export function getActiveShirtOptions(
  dateISO: string,
  ageRange: string = ""
): { choice: ShirtChoice; label: string; price: number }[] {
  const multiplier = ageFeeMultiplier(ageRange);
  const base = Math.round(baseRatePhp(dateISO) * multiplier);
  const withShirt = base + SHIRT_SURCHARGE_PHP;

  if (isEarlyBird(dateISO)) {
    return [
      { choice: "without", label: "Early Bird — Without Shirt", price: base },
      { choice: "with", label: "Early Bird — With Shirt", price: withShirt },
    ];
  }
  if (isShirtAvailable(dateISO)) {
    return [
      { choice: "without", label: "Standard Rate — Without Shirt", price: base },
      { choice: "with", label: "Regular Rate — With Shirt", price: withShirt },
    ];
  }
  return [{ choice: "without", label: "Standard Rate — Without Shirt", price: base }];
}

/**
 * Client-side estimate only — mirrors the server's compute_attendee_fee()
 * logic so the UI can show a running total, but the server always
 * recalculates and returns the real total_amount_php.
 */
export function estimateFeePhp(dateISO: string, wantsShirt: boolean, ageRange: string = ""): number {
  const registrationFee = Math.round(baseRatePhp(dateISO) * ageFeeMultiplier(ageRange));
  return registrationFee + (wantsShirt ? SHIRT_SURCHARGE_PHP : 0);
}
