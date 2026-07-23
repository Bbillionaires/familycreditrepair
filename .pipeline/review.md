# Review: AI chat assistant for paid members

## Verdict
APPROVE

## Spec compliance
- **Schema**: `User.chatCreditBalance` + relations, `ChatUsage`, `ChatPackPurchase`, `ChatSettings` all match the spec exactly, including the deliberately-different `onDelete: Cascade` (vs. `Purchase`/`MentorRequest`'s `SetNull`), verified as real DDL behavior by the test suite actually deleting a user and confirming both child tables' rows are gone.
- **`src/lib/openai.ts`/`chat-settings.ts`**: exact mirror of `stripe.ts`'s degrade-gracefully pattern; the singleton upsert (`update: {}`, `create: { id: "singleton" }`) is correct and test-verified to not clobber an existing row on repeat calls.
- **`sendChatMessage`**: implements the exact required check order — eligibility (re-checked fresh every call, correctly handling the mid-session membership-lapse edge case) → OpenAI-configured → rate limit → today's UTC-scoped usage count → hard cap → free-vs-credit → message validation/truncation → purchased-content system prompt → OpenAI call → usage log/credit decrement **only on confirmed success**. This ordering is exactly right and the most important correctness property of the whole feature (never charging a member for a failed API call).
- **`startQuestionPackCheckout`**: correct mirror of `startMaterialCheckout`'s inline `price_data`/`mode:"payment"` pattern, creates the `ChatPackPurchase` row before redirecting exactly like `Purchase` does for materials.
- **Webhook**: the `ChatPackPurchase`-first lookup, `$transaction`-wrapped credit, and `status !== "paid"` idempotency guard are all present and match the spec's reasoning almost verbatim (the code comments even explain *why* a transaction is needed here specifically, which is good practice for a pattern that's new to this codebase).
- **UI**: `/account/chat` correctly reuses `BecomeMemberForm` for the upsell case rather than duplicating it; `chat-widget.tsx` calls `sendChatMessage` as a plain async function (not force-fit into `useActionState`), persistently renders the disclaimer, and only shows the buy-pack CTA on the specific "no free questions" error.
- **Admin settings**: singleton edit form present, dollars↔cents conversion correct, nav link added in the right place.
- **Out-of-scope items honored**: no message content is ever written to the database anywhere in the diff (`ChatUsage` has no content field at all), no RAG/knowledge-base code, no streaming.

## Issues found
- Non-blocking: the request-body validation loop in `sendChatMessage` iterates the **full, untruncated** `messages` array to check each entry's length before slicing to the last 12 for the actual OpenAI call. An authenticated member could submit an very large `messages` array (thousands of entries) and the server would iterate all of it before truncating — a minor self-inflicted-DoS surface (only reachable by an authenticated paying member abusing their own account, not a public/unauthenticated vector). Worth capping `messages.length` itself before the validation loop in a future pass; not serious enough to block this feature.
- Non-blocking: `chat-widget.tsx` detects the "buy a pack" case via an exact string comparison against the server's error message (`NO_QUESTIONS_LEFT_ERROR`). This works today but is a coupling that would silently break if either copy of that string is edited independently in the future without updating the other. A small fragility, not a bug — flagging for awareness.
- Non-blocking: same defense-in-depth note as the two prior features' reviews — no `select` narrowing on the `Purchase` queries reused for the system-prompt context, though this is server-side-only data used to build a prompt string, never serialized to the client, so there's no actual exposure.

## Recommendation
Merge. Build, lint (0 errors; 6 warnings, all the same pre-existing class of intentionally-unused `useActionState` params — 4 pre-existing, 2 new from this feature), and the full test suite (42/42 pass, including all 10 new chat tests, independently re-run rather than trusting the tester's report alone) all check out. The critical correctness property — never charging a real question/credit for a failed OpenAI call — is implemented exactly as specified and is the part most worth having gotten right.
