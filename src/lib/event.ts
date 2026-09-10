// Placeholder event details. Update these when the real details are confirmed.
export const EVENT = {
  name: "Sanctuary Camp 2026",
  theme: "Sanctuary: The God Who Dwells with Us",
  verse: "“And let them make Me a sanctuary; that I may dwell among them.”",
  verseRef: "Exodus 25:8",
  dateStart: "2026-10-16",
  dateEnd: "2026-10-18",
  dateLabel: "October 16–18, 2026",
  who: "Area 2 Youth Federation",
  openTo: "To all who is willing",
  locationName: "Adventist University of the Philippines",
  locationDetail: "Puting Kahoy, Silang, Cavite",
  feePhp: 700,
} as const;

export const AGE_RANGES = ["0-5", "6-12", "13-17", "18-25", "26-40", "41-60", "61+"] as const;

export const UPLOAD = {
  maxBytes: 2 * 1024 * 1024,
  acceptedMimeTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
  acceptedExtensions: [".jpg", ".jpeg", ".png", ".webp", ".pdf"],
} as const;
