import { requireAdmin } from "@/lib/dal";
import { getQuizSettings } from "@/lib/quiz-settings";
import QuizSettingsForm from "./quiz-settings-form";

export default async function AdminQuizSettingsPage() {
  await requireAdmin();
  const settings = await getQuizSettings();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Quiz Settings</h1>
      <p className="mt-1 text-sm text-slate-500">
        Controls for the certification quiz available to members.
      </p>
      <div className="mt-6">
        <QuizSettingsForm
          defaultValues={{
            questionsPerAttempt: settings.questionsPerAttempt,
            passThresholdPercent: settings.passThresholdPercent,
            maxAttemptsPerRollingDays: settings.maxAttemptsPerRollingDays,
            rollingWindowDays: settings.rollingWindowDays,
          }}
        />
      </div>
    </div>
  );
}
