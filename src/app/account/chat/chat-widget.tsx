"use client";

import { useActionState, useState } from "react";
import DisclaimerBanner from "@/components/disclaimer-banner";
import { site } from "@/lib/site";
import { sendChatMessage, startQuestionPackCheckout, type ChatMessage } from "../chat-actions";

const NO_QUESTIONS_LEFT_ERROR =
  "You've used today's free questions. Purchase a question pack to keep chatting.";

function BuyPackForm() {
  const [state, action, pending] = useActionState(startQuestionPackCheckout, undefined);

  return (
    <form action={action} className="mt-2">
      {state?.error && <p className="mb-2 text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? "Redirecting..." : "Buy a question pack"}
      </button>
    </form>
  );
}

export default function ChatWidget() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [freeQuestionsRemaining, setFreeQuestionsRemaining] = useState<number | null>(null);
  const [creditBalance, setCreditBalance] = useState<number | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || pending) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    setInput("");
    setError(null);
    setPending(true);

    const result = await sendChatMessage(nextMessages);

    if ("error" in result) {
      setError(result.error);
    } else {
      setMessages([...nextMessages, { role: "assistant", content: result.reply }]);
      setFreeQuestionsRemaining(result.freeQuestionsRemaining);
      setCreditBalance(result.creditBalance);
    }

    setPending(false);
  }

  return (
    <div className="mt-4">
      <div className="mb-4">
        <DisclaimerBanner>{site.chatDisclaimer}</DisclaimerBanner>
      </div>

      {(freeQuestionsRemaining !== null || creditBalance !== null) && (
        <p className="mb-3 text-xs text-slate-500">
          {freeQuestionsRemaining !== null && (
            <>Free questions left today: {freeQuestionsRemaining}. </>
          )}
          {creditBalance !== null && <>Question credits: {creditBalance}.</>}
        </p>
      )}

      <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
        {messages.length === 0 && (
          <p className="text-sm text-slate-400">
            Ask a question about credit, budgeting, debt, or mortgage readiness to get started.
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "ml-auto max-w-[85%] rounded-lg bg-blue-600 px-3 py-2 text-sm text-white"
                : "mr-auto max-w-[85%] rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-800"
            }
          >
            {m.content}
          </div>
        ))}
      </div>

      {error && (
        <div className="mt-3">
          <p className="text-sm text-red-600">{error}</p>
          {error === NO_QUESTIONS_LEFT_ERROR && <BuyPackForm />}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about credit, budgeting, debt, or mortgage readiness..."
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={pending || !input.trim()}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {pending ? "Sending..." : "Send"}
        </button>
      </form>
    </div>
  );
}
