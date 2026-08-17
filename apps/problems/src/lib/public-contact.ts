const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

export type PublicContact =
  | { configured: true; email: string; href: string }
  | { configured: false; email: null; href: null };

/**
 * Optional public support address. It is configuration rather than product
 * identity: deployments without a monitored private channel must say so
 * instead of publishing a plausible but unowned mailbox.
 */
export function publicContact(value = process.env.VELA_SUPPORT_EMAIL): PublicContact {
  const email = value?.trim();
  if (!email || !EMAIL.test(email) || /[?&#]/u.test(email)) {
    return { configured: false, email: null, href: null };
  }
  return { configured: true, email, href: `mailto:${email}` };
}
