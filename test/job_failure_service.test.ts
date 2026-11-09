import assert from "node:assert/strict";
import test from "node:test";
import { InfraiClient } from "../src/infrai_client.ts";
import { surfaceJobFailure } from "../src/job_failure_service.ts";

test("groups the same scheduled job by stage and sends its game context", async () => {
  let request: RequestInit | undefined;
  const client = new InfraiClient("test-key", async (_url, init) => {
    request = init;
    return new Response(JSON.stringify({ ok: true, data: { event_id: "event-1" }, metadata: {} }), { status: 200 });
  });
  const result = await surfaceJobFailure(client, {
    jobName: "nightly-player-state", runId: "run-1", stage: "moderation-queue",
    playerAssetId: "asset-1", liveEventId: "event-1", moderationQueue: "ugc-review", errorMessage: "checkpoint rejected",
  });
  assert.deepEqual(result, { groupedBy: "nightly-player-state:moderation-queue", captured: true });
  const payload = JSON.parse(String(request?.body));
  assert.deepEqual(payload.fingerprint, ["nightly-player-state", "moderation-queue"]);
  assert.equal(payload.context.moderationQueue, "ugc-review");
});
