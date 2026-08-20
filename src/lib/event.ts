// Placeholder event details. Update these when the real details are confirmed.
export const EVENT = {
  name: "Section 7 Camp Meeting",
  theme: "Absolute Reliance",
  dateStart: "2026-11-20",
  dateEnd: "2026-11-22",
  dateLabel: "November 20–22, 2026",
  who: "Churches from Section 7",
  locationName: "Forrest Falls Camp",
  locationDetail: "San Fernando Valley",
  feePhp: 200,
} as const;

export const AGE_RANGES = ["0-5", "6-12", "13-17", "18-25", "26-40", "41-60", "61+"] as const;

export const PAYMENT = {
  gcash: {
    name: "Juan Dela Cruz",
    number: "0917 000 0000",
  },
  bank: {
    bankName: "BDO Unibank",
    accountName: "Section 7 Camp Meeting Fund",
    accountNumber: "0012 3456 7890",
  },
} as const;

export const UPLOAD = {
  maxBytes: 2 * 1024 * 1024,
  acceptedMimeTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
  acceptedExtensions: [".jpg", ".jpeg", ".png", ".webp", ".pdf"],
} as const;
