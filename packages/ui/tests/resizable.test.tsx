import assert from "node:assert/strict"
import test from "node:test"
import { renderToStaticMarkup } from "react-dom/server"

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "../src/components/ui/resizable"

test("Resizable composes named peer panes with an accessible separator", () => {
  const html = renderToStaticMarkup(
    <ResizablePanelGroup id="workspace" orientation="horizontal">
      <ResizablePanel id="tree" defaultSize="24%">
        Object tree
      </ResizablePanel>
      <ResizableHandle withHandle aria-label="Resize object tree" />
      <ResizablePanel id="surface" defaultSize="76%">
        Selected work surface
      </ResizablePanel>
    </ResizablePanelGroup>
  )

  assert.match(html, /data-slot="resizable-panel-group"/u)
  assert.equal(html.match(/data-slot="resizable-panel"/gu)?.length, 2)
  assert.match(html, /data-slot="resizable-handle"/u)
  assert.match(html, /aria-label="Resize object tree"/u)
  assert.match(html, /role="separator"/u)
})
