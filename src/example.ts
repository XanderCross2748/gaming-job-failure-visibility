import { InfraiClient } from "./infrai_client.ts";
import { surfaceJobFailure } from "./job_failure_service.ts";

const key = process.env.INFRAI_API_KEY;
if (!key) throw new Error("Set INFRAI_API_KEY before running the example");

const result = await surfaceJobFailure(new InfraiClient(key), {
  jobName: "nightly-player-state",
  runId: "run-2026-10-25-01",
  stage: "moderation-queue",
  playerAssetId: "asset-1842",
  liveEventId: "event-harvest-festival",
  moderationQueue: "ugc-review",
  errorMessage: "moderation queue checkpoint rejected",
});
console.log(JSON.stringify(result));
