import assert from "node:assert/strict"
import test from "node:test"
import { renderToStaticMarkup } from "react-dom/server"

import { Item, ItemGroup } from "../src/components/ui/item"

test("Item uses listitem semantics only inside ItemGroup", () => {
  const grouped = renderToStaticMarkup(
    <ItemGroup>
      <Item>Grouped item</Item>
    </ItemGroup>
  )
  const standalone = renderToStaticMarkup(<Item>Standalone item</Item>)

  assert.match(grouped, /role="list"/u)
  assert.equal(grouped.match(/role="listitem"/gu)?.length, 1)
  assert.doesNotMatch(standalone, /role="listitem"/u)
})

test("composed interactive Items keep their native semantics", () => {
  const groupedButton = renderToStaticMarkup(
    <ItemGroup>
      <Item render={<button type="button" />}>Inspect item</Item>
    </ItemGroup>
  )

  assert.match(
    groupedButton,
    /role="listitem"[^>]*data-slot="item-listitem"/u
  )
  assert.match(groupedButton, /<button[^>]*type="button"/u)
  assert.doesNotMatch(groupedButton, /<button[^>]*role="listitem"/u)
})
