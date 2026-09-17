// Shared copy for Camp Rules, packing list, and policies — used by both the
// registration page and the FAQ so the wording only has to be edited once.

export const CAMP_RULES: string[] = [
  "No Electrical Cooking Appliances — The use of any electrical cooking appliance is strictly prohibited within the camp premises, including rice cookers, electric kettles, induction cookers, electric stoves, and similar appliances. Any church or district that violates this rule shall be responsible for any fine or penalty imposed by Adventist University of the Philippines (AUP).",
  "Keep the Camp Area Clean — All participants are responsible for keeping their assigned areas clean and orderly. Proper waste segregation and disposal must be observed at all times.",
  "Respect Quiet Hours — Participants must observe designated quiet hours. Avoid loud conversations, music, shouting, and other activities that may disturb other campers, especially during sleeping hours.",
  "No Smoking, Vaping, or Alcoholic Beverages — Smoking, vaping, and the possession or consumption of alcoholic beverages are strictly prohibited within the camp premises.",
  "Proper Dress Code — Participants are expected to observe modest, appropriate, and Christ-centered attire throughout the camp. Proper clothing must be worn during worship services, activities, and other official programs.",
  "Respect Camp Facilities and Property — All participants must properly use and take care of the facilities, equipment, furniture, and other properties provided by AUP and the organizing committee. Any damage caused by negligence or intentional acts shall be the responsibility of the concerned church, district, or participant.",
  "Stay Within Designated Areas — Participants must remain within the designated camp areas unless permission has been given by the assigned leaders or organizers to leave the premises.",
  "Follow the Camp Program and Schedule — Participants are expected to attend and participate in the scheduled worship services, seminars, activities, and other official camp programs. Punctuality is highly encouraged.",
  "Respect Leaders, Staff, and Fellow Campers — Everyone is expected to treat fellow participants, leaders, staff, speakers, and AUP personnel with respect, kindness, and Christian courtesy. Bullying, harassment, fighting, or disrespectful behavior will not be tolerated.",
  "Observe Proper Food and Cooking Practices — All cooking and food preparation must be done only in designated areas and according to the guidelines provided by the camp management and AUP.",
  "No Unauthorized Decorations or Installations — Participants and groups must not attach, install, or modify anything on AUP facilities without prior permission from the organizing committee or authorized AUP personnel.",
  "Personal Belongings Are the Participant's Responsibility — Participants are responsible for securing their own valuables and personal belongings. The organizing committee will not be responsible for lost or unattended items.",
  "Observe Safety Regulations — All participants must follow safety instructions given by the organizing committee and AUP personnel. Any unsafe activity or condition should immediately be reported to a camp leader.",
  "Emergency and Medical Concerns — Participants experiencing an emergency, injury, or other urgent concern should immediately inform their assigned leader, district representative, or the Camp Medical Team.",
  "Follow AUP Rules and Regulations — All Sanctuary Camp 2026 participants are required to follow the rules and regulations of Adventist University of the Philippines. Additional guidelines from AUP may be implemented when necessary.",
  "Church and District Accountability — Each church and district is responsible for ensuring that all participants under their delegation are properly informed of and comply with the camp rules and regulations.",
];

export const GUIDELINES_AGREEMENT_TEXT =
  "I agree to follow the official rules, guidelines, schedule, and instructions of Sanctuary Camp 2026 and to conduct myself in a manner consistent with Christian values, respect, safety, and good conduct throughout the camp.";

export const MINOR_DISCIPLINE_NOTICE =
  "I understand that serious violations of camp rules or safety policies may result in appropriate disciplinary action, including dismissal from the camp, subject to the applicable camp policies.";

export const PACKING_LIST: string[] = [
  "Bible and personal devotional materials",
  "Registration confirmation",
  "Personal toiletries and hygiene essentials",
  "Towels",
  "Extra clothes appropriate for the entire camp",
  "Modest and comfortable clothes for worship and activities",
  "Sleepwear",
  "Jacket or light blanket",
  "Personal water bottle or tumbler",
  "Personal eating utensils, plate, and cup",
  "Flashlight",
  "Umbrella or raincoat",
  "Insect repellent",
  "Personal medications and basic personal first aid supplies",
  "Sleeping mat, pillow, and blanket, if needed",
  "Tent",
  "Reusable eco bag or laundry bag for personal belongings",
  "Phone and charger / power bank",
  "Extra plastic or waterproof bags for wet or dirty clothes",
  "Appropriate footwear, including slippers and shoes for activities",
  "Personal snacks, if needed",
];

export const PACKING_REMINDER =
  "Please label your personal belongings and bring only the things you need for the camp. Participants are responsible for the safekeeping of their own valuables.";

export const DO_NOT_BRING =
  "Rice cookers, electric kettles, induction cookers, electric stoves, or any other electrical cooking appliances. All cooking must follow the designated camp guidelines.";

export const PAYMENT_PROCESS: string[] = [
  "Participants are responsible for coordinating and submitting their payment to their respective District President (DP).",
  "The District President will consolidate the payments of all registrants under their district and submit one payment together with the complete attendees list to the Area Treasurer (AT).",
  "No proof of payment needs to be uploaded or submitted through the registration form. Instead, participants will simply check the confirmation box indicating that their payment has been made or will be submitted to their District President.",
];

export const PAYMENT_PROCESS_DETAILS: string[] = [
  "The District President is the only authorized person to process and transact the registration payment for all participants under their district.",
  "Only the District President is authorized to transact directly with the Area Treasurer regarding registration payments and attendee lists. Individual registrants or other representatives should not transact separately with the Area Treasurer.",
  "In the absence of the District President, the DP must officially notify the organizing team of their designated official proxy who will be authorized to coordinate and transact with the Area Treasurer on behalf of the district.",
  "To ensure proper documentation and accounting, all payments and attendee lists must be submitted through the designated District President or officially recognized proxy.",
];

export const PAYMENT_CONFIRMATION_TEXT =
  "I confirm that I have coordinated my registration payment with my AY Leader/District Representative.";

export const CANCELLATION_POLICY: string[] = [
  "Registration fees are non-refundable. However, if a registered participant is unable to attend Sanctuary Camp 2026, their registration may be transferred to another person.",
  "There will be no cancellation fee for transferring a registration. All transfer requests must be coordinated with the participant's AY Leader/District Representative for proper documentation and processing.",
  "For cancellation and transfer concerns, please contact your AY Leader/District Representative.",
];

export const REFUND_AGREEMENT_TEXT =
  "I have read and understood the Cancellation and Transfer Policy above — registration fees are non-refundable, but a registration may be transferred to another person through my AY Leader/District Representative.";

export const REGISTRATION_CONFIRMATION_DISCLAIMER =
  "Submission of this registration form does not automatically guarantee a confirmed camp slot. Your registration will be considered confirmed only after verification of the submitted information and payment by the designated Sanctuary Camp 2026 team. Please ensure that all information provided is accurate. The organizing committee may contact you or your designated church/district representative if clarification or additional information is required.";

/** A minor for waiver purposes: any single-year age under 18, or the general "0-12" bracket. */
export function isMinorAgeRange(ageRange: string): boolean {
  if (ageRange === "0-12") return true;
  const asNumber = Number(ageRange);
  return Number.isInteger(asNumber) && asNumber < 18;
}
