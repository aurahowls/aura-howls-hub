export const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;
export const isStripeConfigured = !!STRIPE_PUBLISHABLE_KEY;

export const WOLF_PLUS_PRICE_IDS = {
  monthly: import.meta.env.VITE_STRIPE_PRICE_MONTHLY as string | undefined,
  annual: import.meta.env.VITE_STRIPE_PRICE_ANNUAL as string | undefined,
} as const;

export const WOLF_PLUS_PRICES_CENTS = { monthly: 999, annual: 7999 } as const;

export async function createCheckoutSession(
  plan: "monthly" | "annual",
  userId: string,
): Promise<string> {
  const res = await fetch("/api/stripe-checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "wolf_plus", plan, user_id: userId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any).error ?? "Checkout failed");
  return (data as { url: string }).url;
}

export async function createTipCheckoutSession(opts: {
  recipientId: string;
  recipientName: string;
  amountCents: number;
  howlId?: string;
  message?: string;
  userId: string;
}): Promise<string> {
  const res = await fetch("/api/stripe-checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "tip", ...opts }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any).error ?? "Tip checkout failed");
  return (data as { url: string }).url;
}
