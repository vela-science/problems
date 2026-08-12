import assert from "node:assert/strict"
import test from "node:test"

import {
  SIDEBAR_COOKIE_MAX_AGE,
  SIDEBAR_COOKIE_NAME,
  sidebarOpenFromCookieValue,
} from "../src/lib/sidebar-state"

test("the shared sidebar preference has one bounded cookie contract", () => {
  assert.equal(SIDEBAR_COOKIE_NAME, "sidebar_state")
  assert.equal(SIDEBAR_COOKIE_MAX_AGE, 60 * 60 * 24 * 7)
  assert.equal(sidebarOpenFromCookieValue("true"), true)
  assert.equal(sidebarOpenFromCookieValue("false"), false)
  assert.equal(sidebarOpenFromCookieValue(undefined), true)
  assert.equal(sidebarOpenFromCookieValue("corrupt"), true)
})
