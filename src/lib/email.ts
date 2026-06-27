export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(payload: EmailPayload): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: (data as any).error ?? "Failed to send email" };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Network error" };
  }
}

export function welcomeEmail(displayName: string, toEmail: string) {
  return sendEmail({
    to: toEmail,
    subject: "Welcome to the AuraHowls Pack 🐺",
    html: `
      <div style="font-family:Inter,sans-serif;background:#0b0b12;color:#e5e5e5;padding:40px;border-radius:16px;max-width:600px;margin:0 auto">
        <h1 style="color:#f4a21c;font-size:28px;margin-bottom:8px">Welcome to AuraHowls, ${displayName}! 🐺</h1>
        <p style="color:#a0a0b0;font-size:16px;line-height:1.6">
          You're now part of the Pack. Start howling, follow wolves who inspire you, and discover the Den.
        </p>
        <a href="https://aurahowlshub.com/home"
           style="display:inline-block;margin-top:24px;background:#f4a21c;color:#000;font-weight:700;padding:12px 28px;border-radius:99px;text-decoration:none">
          Enter the Den →
        </a>
        <p style="margin-top:32px;color:#555;font-size:12px">You're receiving this because you signed up for AuraHowls.</p>
      </div>`,
  });
}

export function referralRewardEmail(
  referredName: string,
  toEmail: string,
  creditDays: number,
) {
  return sendEmail({
    to: toEmail,
    subject: `+${creditDays} days Wolf+ — ${referredName} joined via your invite 🐾`,
    html: `
      <div style="font-family:Inter,sans-serif;background:#0b0b12;color:#e5e5e5;padding:40px;border-radius:16px;max-width:600px;margin:0 auto">
        <h1 style="color:#f4a21c;font-size:24px">Your referral paid off!</h1>
        <p style="color:#a0a0b0;font-size:16px;line-height:1.6">
          <strong style="color:#e5e5e5">${referredName}</strong> joined AuraHowls through your invite link.
          You've earned <strong style="color:#f4a21c">${creditDays} days of Wolf+</strong> — thanks for growing the Pack!
        </p>
        <a href="https://aurahowlshub.com/premium"
           style="display:inline-block;margin-top:24px;background:#f4a21c;color:#000;font-weight:700;padding:12px 28px;border-radius:99px;text-decoration:none">
          View Wolf+ →
        </a>
      </div>`,
  });
}
