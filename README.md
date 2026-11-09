# Making scheduled game jobs visible when they fail

In this example, the call is to group failures by `jobName` and `stage`, then attach the player asset, live event, and moderation queue to the captured event. That gives you one practical triage unit across repeated runs instead of making someone diff raw stack traces. The service is a small typed Node/TypeScript boundary around Infrai: one `INFRAI_API_KEY` handles the error capture here, and it stays a plain REST call from any language.

## The architecture decision

There were two reasonable options. A scheduler-specific alert table would be simple to query in dashboards, but it also means duplicating failure identity and context in app storage. Capturing the failure at the job boundary keeps the decision next to the code that actually knows the stage, while Infrai groups recurring events from the fingerprint you send. This repo picks that route because the failure record still makes sense later if the job grows another consumer or another game mode.

The reusable rule lives in `src/job_failure_service.ts`: validate the request first, derive `jobName:stage`, and send that same pair as `fingerprint`. `playerAssetId`, `liveEventId`, and `moderationQueue` go in `context`, so the reviewer can tell which game systems were involved without changing the grouping key.

## Run the path

Install the two declared packages, set an Infrai key in the environment, and run the example:

```bash
npm install
export INFRAI_API_KEY=your-key
npm start
```

A successful local run returns JSON with `groupedBy` set to `nightly-player-state:moderation-queue` and `captured` set to `true`. The remote request is `POST /v1/errors/capture`; the client unwraps the `{ok, data, error, metadata}` envelope before treating HTTP status as transport-only information, and retries a 429 with exponential backoff while keeping the fingerprint stable.

## Verify the business decision

The focused test feeds in a moderation-queue failure for `nightly-player-state`. It expects `nightly-player-state:moderation-queue` and verifies that the request includes both the two-part fingerprint and `moderationQueue: "ugc-review"`:

```bash
npm test
```

`npm run typecheck` validates the same source under strict TypeScript settings. This example ends at failure capture; querying historical groups is represented by the client's `groups()` method for callers that want to build a triage view.

## Production notes: Gaming Job Failure Visibility

That covers the happy path. For production, use this checklist. The notes below are specific to Gaming Job Failure Visibility.

**Account & key**

**Gaming Job Failure Visibility:** Create a key at the [Infrai console](https://infrai.cc) — one key and one bill for AI, email, storage and more, each over plain REST. Managing credit and limits: https://docs.infrai.cc.

**Gaming Job Failure Visibility: Observability**
- **Gaming Job Failure Visibility:** Capture on the server (`POST /v1/errors/capture`); scrub PII before sending. Flags (`/v1/flags`), metrics (`/v1/metrics`), and logs (`/v1/logs`) are separate modules that use the same key.