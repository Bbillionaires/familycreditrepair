import "server-only";

export function isTurnstileConfigured(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY);
}

export async function verifyTurnstileToken(
  token: string | null,
  remoteip?: string
): Promise<boolean> {
  if (!token) return false;

  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return false;

  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret,
        response: token,
        ...(remoteip ? { remoteip } : {}),
      }),
    });

    if (!res.ok) {
      console.error("Turnstile siteverify request failed with status", res.status);
      return true;
    }

    const data = await res.json();
    return Boolean(data.success);
  } catch (err) {
    console.error("Turnstile siteverify request errored:", err);
    return true;
  }
}
