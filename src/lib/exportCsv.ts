import { formatCampId } from "@/lib/campId";
import { SINGLE_PASTORATE_LABEL } from "@/lib/districts";
import type { Registration } from "@/lib/types";

const HEADERS = [
  "Camp ID",
  "Submitted At",
  "Contact First Name",
  "Contact Last Name",
  "Email",
  "Phone",
  "District",
  "Church",
  "City",
  "Group Size",
  "Attendee First Name",
  "Attendee Last Name",
  "Age Range",
  "Gender",
  "Wants Shirt",
  "Shirt Size",
  "Attendee Fee (PHP)",
  "Payment Confirmed",
  "Payment Status",
  "Total Amount (PHP)",
];

function escapeCsvField(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

// Natural sort so "District 2" sorts before "District 10" (plain string
// sort would put "District 10" first).
function naturalCompare(a: string, b: string) {
  const chunk = (s: string) => s.match(/\d+|\D+/g) ?? [];
  const chunksA = chunk(a);
  const chunksB = chunk(b);
  const len = Math.max(chunksA.length, chunksB.length);
  for (let i = 0; i < len; i++) {
    const partA = chunksA[i] ?? "";
    const partB = chunksB[i] ?? "";
    const numA = Number(partA);
    const numB = Number(partB);
    const bothNumeric = partA !== "" && partB !== "" && !Number.isNaN(numA) && !Number.isNaN(numB);
    const cmp = bothNumeric ? numA - numB : partA.localeCompare(partB);
    if (cmp !== 0) return cmp;
  }
  return 0;
}

// QC districts sort first (numerically), then Single Pastorate, then
// anything else (free-text "Other" entries, blanks) sorts last.
function districtSortPriority(label: string) {
  if (/^QC-\d+$/i.test(label)) return 0;
  if (label === SINGLE_PASTORATE_LABEL) return 1;
  return 2;
}

function compareDistricts(a: string, b: string) {
  const priorityDiff = districtSortPriority(a) - districtSortPriority(b);
  return priorityDiff !== 0 ? priorityDiff : naturalCompare(a, b);
}

function toRow(registration: Registration, attendee: Registration["attendees"][number]) {
  return [
    formatCampId(attendee.camp_number),
    registration.created_at,
    registration.contact_first_name,
    registration.contact_last_name,
    registration.contact_email,
    registration.contact_phone,
    registration.district,
    registration.church_name,
    registration.city,
    registration.group_size,
    attendee.first_name,
    attendee.last_name,
    attendee.age_range,
    attendee.gender,
    attendee.wants_shirt ? "Yes" : "No",
    attendee.shirt_size ?? "",
    attendee.fee_php ?? "",
    registration.confirmed_payment ? "Yes" : "No",
    registration.payment_status,
    registration.total_amount_php,
  ];
}

function groupBy<T>(items: T[], keyOf: (item: T) => string) {
  const groups = new Map<string, { label: string; items: T[] }>();
  for (const item of items) {
    const label = keyOf(item).trim() || "(none)";
    const key = label.toLowerCase();
    if (!groups.has(key)) groups.set(key, { label, items: [] });
    groups.get(key)!.items.push(item);
  }
  return [...groups.values()];
}

export function exportRegistrationsToCsv(registrations: Registration[]) {
  const blankRow = HEADERS.map(() => "");
  const rows: (string | number)[][] = [HEADERS];

  const districtGroups = groupBy(registrations, (r) => r.district).sort((a, b) =>
    compareDistricts(a.label, b.label)
  );

  districtGroups.forEach((districtGroup, districtIndex) => {
    if (districtIndex > 0) rows.push(blankRow);

    const districtAttendeeCount = districtGroup.items.reduce((sum, r) => sum + r.attendees.length, 0);
    rows.push([
      `District: ${districtGroup.label}`,
      `${districtGroup.items.length} registration(s), ${districtAttendeeCount} attendee(s)`,
      ...blankRow.slice(2),
    ]);

    const churchGroups = groupBy(districtGroup.items, (r) => r.church_name).sort((a, b) =>
      a.label.localeCompare(b.label)
    );

    churchGroups.forEach((churchGroup, churchIndex) => {
      if (churchIndex > 0) rows.push(blankRow);

      const churchAttendeeCount = churchGroup.items.reduce((sum, r) => sum + r.attendees.length, 0);
      rows.push([
        `  Church: ${churchGroup.label}`,
        `${churchGroup.items.length} registration(s), ${churchAttendeeCount} attendee(s)`,
        ...blankRow.slice(2),
      ]);

      for (const registration of churchGroup.items) {
        const attendees =
          registration.attendees.length > 0
            ? registration.attendees
            : [
                {
                  id: "",
                  camp_number: 0,
                  first_name: "",
                  last_name: "",
                  age_range: "",
                  gender: "",
                  wants_shirt: false,
                  shirt_size: null,
                  fee_php: null,
                },
              ];
        for (const attendee of attendees) {
          rows.push(toRow(registration, attendee));
        }
      }
    });
  });

  const csv = rows.map((row) => row.map(escapeCsvField).join(",")).join("\r\n");

  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `registrations-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
