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

function buildEmailHtml(input: ConfirmationEmailInput, headerImageUrl: string) {
  const campIdList = input.campNumbers.map(formatCampId).join(", ");
  const campIdLabel = input.campNumbers.length === 1 ? "Camp ID" : "Camp IDs";
  const groupLabel = input.campNumbers.length === 1 ? "person" : "people";
  const safeName = escapeHtml(input.toName);
  const safeDistrict = escapeHtml(input.district);
  const safeChurch = escapeHtml(input.churchName);

  return `<!doctype html>
<html>
  <body style="margin:0; padding:0; background-color:#f4f1e8;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f1e8; padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; background-color:#ffffff; border-radius:12px; overflow:hidden; border:1px solid #e6e0d0;">
            <tr>
              <td>
                <img
                  src="${headerImageUrl}"
                  width="600"
                  alt="Sanctuary: The God Who Dwells with Us — Registration Confirmation"
                  style="width:100%; max-width:600px; display:block; border:0;"
                />
              </td>
            </tr>
            <tr>
              <td style="padding:32px 36px 8px 36px; font-family:Arial, Helvetica, sans-serif; color:#10142a;">
                <p style="margin:0 0 16px 0; font-size:15px; line-height:1.6;">Hi ${safeName},</p>
                <p style="margin:0 0 16px 0; font-size:15px; line-height:1.6;">
                  Thank you for registering ${input.campNumbers.length} ${groupLabel} from
                  <strong>${safeChurch}</strong> (${safeDistrict}) for <strong>Sanctuary Camp 2026</strong>.
                  This email is your official confirmation receipt, so please keep it for your records.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 36px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8f4ea; border:1px solid #e6e0d0; border-radius:8px;">
                  <tr>
                    <td style="padding:18px 20px; font-family:Arial, Helvetica, sans-serif;">
                      <p style="margin:0 0 4px 0; font-size:11px; letter-spacing:1px; text-transform:uppercase; color:#b0872c; font-weight:bold;">
                        ${campIdLabel}
                      </p>
                      <p style="margin:0 0 14px 0; font-size:20px; font-weight:bold; color:#10142a;">
                        ${escapeHtml(campIdList)}
                      </p>
                      <p style="margin:0 0 4px 0; font-size:11px; letter-spacing:1px; text-transform:uppercase; color:#b0872c; font-weight:bold;">
                        Total Due
                      </p>
                      <p style="margin:0; font-size:20px; font-weight:bold; color:#10142a;">
                        ₱${input.totalAmountPhp.toLocaleString()}
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 36px 4px 36px; font-family:Arial, Helvetica, sans-serif; color:#10142a;">
                <p style="margin:0 0 10px 0; font-size:14px; font-weight:bold;">What happens next</p>
                <p style="margin:0 0 12px 0; font-size:14px; line-height:1.6; color:#3f4258;">
                  Our team will verify your submitted information and payment. If you haven&rsquo;t already,
                  please coordinate your payment with your AY Leader/District Representative — they
                  consolidate and submit payments on behalf of your district.
                </p>
                <p style="margin:0 0 12px 0; font-size:14px; line-height:1.6; color:#3f4258;">
                  This is the only automated email you&rsquo;ll receive for this registration. Any further
                  updates about your slot or payment status will come directly from your AY Leader or
                  District Representative, not by email.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 36px 32px 36px;">
                <hr style="border:none; border-top:1px solid #e6e0d0; margin:0 0 20px 0;" />
                <p style="margin:0 0 4px 0; font-family:Arial, Helvetica, sans-serif; font-size:13px; font-weight:bold; color:#10142a;">
                  Sanctuary: The God Who Dwells with Us
                </p>
                <p style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:12px; color:#7a7d94;">
                  October 16&ndash;18, 2026 &middot; Adventist University of the Philippines, Puting Kahoy,
                  Silang, Cavite
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
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
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://area2spiritualcamp.org").replace(/\/$/, "");
  const headerImageUrl = `${siteUrl}/images/sanctuary-banner.jpg`;

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
      subject: "Your Sanctuary Camp 2026 Registration Confirmation",
      htmlContent: buildEmailHtml(input, headerImageUrl),
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Brevo API responded with ${response.status}: ${body.slice(0, 500)}`);
  }
}
