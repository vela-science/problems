import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const boundary = vi.hoisted(() => ({
  verify: vi.fn(),
  record: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/github-app", () => ({
  githubApp: () => ({ webhooks: { verify: boundary.verify } }),
}));
vi.mock("@vela/activity-data", () => ({ recordGitHubWebhook: boundary.record }));

import { POST } from "./route";

function request(body: string, headers: Record<string, string> = {}) {
  return new NextRequest("https://problems.science/api/github/webhooks", {
    method: "POST",
    body,
    headers: {
      "content-type": "application/json",
      "content-length": String(Buffer.byteLength(body)),
      "x-github-delivery": "00000000-0000-0000-0000-000000000001",
      "x-github-event": "installation",
      "x-hub-signature-256": `sha256=${"a".repeat(64)}`,
      ...headers,
    },
  });
}

beforeEach(() => {
  boundary.verify.mockReset().mockResolvedValue(true);
  boundary.record.mockReset().mockResolvedValue({ duplicate: false, authority_effect: "none" });
});

describe("GitHub webhook boundary", () => {
  it("refuses oversized bytes before signature or persistence", async () => {
    const response = await POST(request("{}", { "content-length": String(2 * 1024 * 1024 + 1) }));
    expect(response.status).toBe(413);
    expect(boundary.verify).not.toHaveBeenCalled();
    expect(boundary.record).not.toHaveBeenCalled();
  });

  it("refuses a forged signature before persistence", async () => {
    boundary.verify.mockResolvedValue(false);
    const response = await POST(request("{}"));
    expect(response.status).toBe(401);
    expect(boundary.record).not.toHaveBeenCalled();
  });

  it("refuses a missing signature without invoking Octokit", async () => {
    const response = await POST(request("{}", { "x-hub-signature-256": "" }));
    expect(response.status).toBe(401);
    expect(boundary.verify).not.toHaveBeenCalled();
    expect(boundary.record).not.toHaveBeenCalled();
  });

  it("maps verifier refusal errors to a closed 401 boundary", async () => {
    boundary.verify.mockRejectedValue(new Error("missing or malformed signature"));
    const response = await POST(request("{}"));
    expect(response.status).toBe(401);
    expect(boundary.record).not.toHaveBeenCalled();
  });

  it("retains only a closed lifecycle projection and the raw-body root", async () => {
    const body = JSON.stringify({
      action: "created",
      installation: {
        id: 100,
        account: { id: 42, node_id: "U_42", login: "ada", type: "User", email: "private@example.test" },
        repository_selection: "selected",
        permissions: { contents: "read", metadata: "read" },
        access_tokens_url: "https://api.github.com/app/installations/100/access_tokens",
      },
      sender: { id: 42, email: "private@example.test" },
    });
    const response = await POST(request(body));
    expect(response.status).toBe(200);
    expect(boundary.verify).toHaveBeenCalledWith(body, `sha256=${"a".repeat(64)}`);
    const input = boundary.record.mock.calls[0]?.[0];
    expect(input).toMatchObject({
      deliveryId: "00000000-0000-0000-0000-000000000001",
      eventName: "installation",
      payloadRoot: expect.stringMatching(/^sha256:[0-9a-f]{64}$/u),
      payload: {
        action: "created", installation_id: 100, sender_id: 42, account_id: 42,
        account_node_id: "U_42", account_login: "ada", account_type: "User",
        repository_selection: "selected", permissions: { contents: "read", metadata: "read" },
      },
    });
    expect(JSON.stringify(input)).not.toMatch(/email|access_tokens_url|private@example/u);
  });
});
