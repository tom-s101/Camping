export type Attendee = {
  id: string;
  camp_number: number;
  first_name: string;
  last_name: string;
  age_range: string;
  gender: string;
  wants_shirt: boolean;
  shirt_size: string | null;
  fee_php: number | null;
};

export type Registration = {
  id: string;
  contact_first_name: string;
  contact_last_name: string;
  contact_email: string;
  contact_phone: string;
  district: string;
  church_name: string;
  city: string;
  group_size: number;
  total_amount_php: number;
  payment_reference: string | null;
  payment_proof_path: string | null;
  payment_proof_url: string | null;
  payment_status: "pending" | "approved" | "rejected";
  agreed_guidelines: boolean;
  agreed_refund_policy: boolean;
  agreed_minor_waiver: boolean;
  confirmed_payment: boolean;
  has_minor: boolean;
  reviewed_at: string | null;
  reviewer_note: string | null;
  created_at: string;
  attendees: Attendee[];
};

export type Stats = {
  groups: number;
  attendees: number;
  paidGroups: number;
  paidAttendees: number;
  paidAmountPhp: number;
  pendingGroups: number;
  rejectedGroups: number;
  byGender: Record<string, number>;
  byAgeRange: Record<string, number>;
  shirtsRequested: number;
  byShirtSize: Record<string, number>;
};
