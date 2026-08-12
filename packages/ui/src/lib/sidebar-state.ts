export const SIDEBAR_COOKIE_NAME = "sidebar_state"
export const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7

/**
 * The server and client share one deterministic desktop-sidebar preference.
 * Missing or malformed values retain the product default without inventing a
 * second responsive or geometry owner.
 */
export function sidebarOpenFromCookieValue(value: string | undefined): boolean {
  return value !== "false"
}
