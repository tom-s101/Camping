import type { Registration } from "@/lib/types";

const HEADERS = [
  "Registration ID",
  "Submitted At",
  "Contact First Name",
  "Contact Last Name",
  "Email",
  "Phone",
  "Church/District",
  "City",
  "Group Size",
  "Attendee First Name",
  "Attendee Last Name",
  "Age Range",
  "Gender",
  "Payment Method",
  "Payment Reference",
  "Payment Status",
  "Total Amount (PHP)",
];

function escapeCsvField(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toRow(registration: Registration, attendee: Registration["attendees"][number]) {
  return [
    registration.id,
    registration.created_at,
    registration.contact_first_name,
    registration.contact_last_name,
    registration.contact_email,
    registration.contact_phone,
    registration.church_name,
    registration.city,
    registration.group_size,
    attendee.first_name,
    attendee.last_name,
    attendee.age_range,
    attendee.gender,
    registration.payment_method === "gcash" ? "GCash" : "Bank Transfer",
    registration.payment_reference,
    registration.payment_status,
    registration.total_amount_php,
  ];
}

function groupByChurch(registrations: Registration[]) {
  const groups = new Map<string, { churchName: string; registrations: Registration[] }>();
  for (const registration of registrations) {
    const key = registration.church_name.trim().toLowerCase();
    if (!groups.has(key)) groups.set(key, { churchName: registration.church_name.trim(), registrations: [] });
    groups.get(key)!.registrations.push(registration);
  }
  return [...groups.values()].sort((a, b) => a.churchName.localeCompare(b.churchName));
}

export function exportRegistrationsToCsv(registrations: Registration[]) {
  const churchGroups = groupByChurch(registrations);
  const blankRow = HEADERS.map(() => "");
  const rows: (string | number)[][] = [HEADERS];

  churchGroups.forEach((group, index) => {
    if (index > 0) rows.push(blankRow);

    const attendeeCount = group.registrations.reduce((sum, r) => sum + r.attendees.length, 0);
    const churchHeader = [
      `Church: ${group.churchName}`,
      `${group.registrations.length} registration(s), ${attendeeCount} attendee(s)`,
    ];
    rows.push([...churchHeader, ...blankRow.slice(churchHeader.length)]);

    for (const registration of group.registrations) {
      const attendees = registration.attendees.length > 0 ? registration.attendees : [null];
      for (const attendee of attendees) {
        rows.push(
          attendee
            ? toRow(registration, attendee)
            : toRow(registration, { id: "", first_name: "", last_name: "", age_range: "", gender: "" })
        );
      }
    }
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
