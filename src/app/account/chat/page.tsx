import { requireUser } from "@/lib/dal";
import { db } from "@/lib/db";
import BecomeMemberForm from "../become-member-form";
import ChatWidget from "./chat-widget";

export const dynamic = "force-dynamic";

export default async function AccountChatPage() {
  const { userId } = await requireUser();
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return null;

  const eligible = user.isComped || user.membershipStatus === "active";

  if (!eligible) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <h1 className="text-2xl font-bold text-slate-900">AI Chat Assistant</h1>
        <p className="mt-2 text-slate-600">
          The AI chat assistant is available to members. Become a member to unlock it.
        </p>
        <div className="mt-4">
          <BecomeMemberForm />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900">AI Chat Assistant</h1>
      <ChatWidget />
    </div>
  );
}
