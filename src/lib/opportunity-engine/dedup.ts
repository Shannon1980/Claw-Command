// SHA-256 deduplication on [title + agency + amount + deadline]

export async function computeDedupeHash(
  title: string,
  agency: string,
  amount: number,
  deadline: string
): Promise<string> {
  const input = `${title}|${agency}|${amount}|${deadline}`;
  // Use Web Crypto API (available in Node 18+ and browsers)
  const encoder = new TextEncoder();
  const data = encoder.encode(input);

  if (typeof globalThis.crypto?.subtle !== "undefined") {
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  // Fallback: use Node's crypto
  const { createHash } = await import("crypto");
  return createHash("sha256").update(input).digest("hex");
}
