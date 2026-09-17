import "server-only";
import { formatCampId } from "@/lib/campId";

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

type ConfirmationEmailInput = {
  toEmail: string;
  toName: string;
  campNumbers: number[];
  totalAmountPhp: number;
  district: string;
  churchName: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Sends the registration confirmation email via Brevo's transactional email
 * API. Best-effort: any failure here should never fail the registration
 * itself, so callers should catch/log rather than let this reject the
 * request. No-ops (with a console warning) if BREVO_API_KEY isn't set, so
 * environments without Brevo configured yet don't crash on every signup.
 */
export async function sendRegistrationConfirmationEmail(input: ConfirmationEmailInput): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.warn("BREVO_API_KEY is not set; skipping registration confirmation email.");
    return;
  }

  const senderEmail = process.env.BREVO_SENDER_EMAIL || "no-reply@area2spiritualcamp.org";
  const senderName = process.env.BREVO_SENDER_NAME || "Sanctuary Camp 2026";

  const campIdList = input.campNumbers.map(formatCampId).join(", ");
  const groupLabel = input.campNumbers.length === 1 ? "person" : "people";
  const safeName = escapeHtml(input.toName);
  const safeDistrict = escapeHtml(input.district);
  const safeChurch = escapeHtml(input.churchName);

  const htmlContent = `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; color: #10142a;">
      <h1 style="color: #10142a; font-size: 20px;">You're registered for Sanctuary Camp 2026!</h1>
      <p>Hi ${safeName},</p>
      <p>
        We received your registration for ${input.campNumbers.length} ${groupLabel} from
        <strong>${safeChurch}</strong> (${safeDistrict}). Our team will verify your submitted
        information and payment, and your slot will be confirmed once that review is complete.
      </p>
      <p style="margin: 20px 0;">
        <strong>${input.campNumbers.length === 1 ? "Your Camp ID" : "Your Camp IDs"}:</strong>
        <br />
        <span style="font-size: 18px; font-weight: bold; color: #b0872c;">${escapeHtml(campIdList)}</span>
      </p>
      <p><strong>Total due:</strong> ₱${input.totalAmountPhp.toLocaleString()}</p>
      <p>
        If you haven't already, please coordinate your payment with your AY Leader/District
        Representative.
      </p>
      <p style="margin-top: 24px; color: #666;">
        Sanctuary: The God Who Dwells with Us — October 16&ndash;18, 2026 &middot; Adventist University
        of the Philippines
      </p>
    </div>
  `;

  const response = await fetch(BREVO_API_URL, {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      sender: { email: senderEmail, name: senderName },
      to: [{ email: input.toEmail, name: input.toName }],
      subject: "You're registered for Sanctuary Camp 2026",
      htmlContent,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Brevo API responded with ${response.status}: ${body.slice(0, 500)}`);
  }
}
