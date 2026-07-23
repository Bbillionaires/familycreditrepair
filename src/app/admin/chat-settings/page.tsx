import { requireAdmin } from "@/lib/dal";
import { getChatSettings } from "@/lib/chat-settings";
import ChatSettingsForm from "./chat-settings-form";

export default async function AdminChatSettingsPage() {
  await requireAdmin();
  const settings = await getChatSettings();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Chat Settings</h1>
      <p className="mt-1 text-sm text-slate-500">
        Controls for the AI chat assistant available to members.
      </p>
      <div className="mt-6">
        <ChatSettingsForm
          defaultValues={{
            dailyFreeQuestions: settings.dailyFreeQuestions,
            packQuestionCount: settings.packQuestionCount,
            packPriceDollars: settings.packPriceCents / 100,
            hardDailyCap: settings.hardDailyCap,
          }}
        />
      </div>
    </div>
  );
}
