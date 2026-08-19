export const PERFORMER_SEGMENT_PREFIX = "p-";

export function performerProfileSegment(performerId: string): string {
  const bytes = new TextEncoder().encode(performerId);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `${PERFORMER_SEGMENT_PREFIX}${btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "")}`;
}

export function performerIdFromSegment(segment: string): string | null {
  if (!segment.startsWith(PERFORMER_SEGMENT_PREFIX)) return null;
  const encoded = segment.slice(PERFORMER_SEGMENT_PREFIX.length);
  if (!encoded || !/^[A-Za-z0-9_-]+$/u.test(encoded) || encoded.length > 800) return null;
  const base64 = encoded.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(encoded.length / 4) * 4, "=");
  try {
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const value = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return value && value.length <= 400 ? value : null;
  } catch {
    return null;
  }
}
