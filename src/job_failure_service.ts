import { z } from "zod";
import { InfraiClient } from "./infrai_client.ts";

export const jobFailureSchema = z.object({
  jobName: z.string().min(1),
  runId: z.string().min(1),
  stage: z.enum(["asset-sync", "live-event-publish", "moderation-queue"]),
  playerAssetId: z.string().min(1),
  liveEventId: z.string().min(1),
  moderationQueue: z.string().min(1),
  errorMessage: z.string().min(1),
});

export type JobFailure = z.infer<typeof jobFailureSchema>;

export async function surfaceJobFailure(client: InfraiClient, input: unknown): Promise<{ groupedBy: string; captured: boolean }> {
  const failure = jobFailureSchema.parse(input);
  const groupedBy = `${failure.jobName}:${failure.stage}`;
  await client.capture({
    title: `${failure.jobName} failed`,
    message: failure.errorMessage,
    level: "error",
    fingerprint: [failure.jobName, failure.stage],
    exception: failure.errorMessage,
    context: {
      runId: failure.runId,
      playerAssetId: failure.playerAssetId,
      liveEventId: failure.liveEventId,
      moderationQueue: failure.moderationQueue,
    },
  });
  return { groupedBy, captured: true };
}
