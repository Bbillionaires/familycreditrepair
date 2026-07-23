import Link from "next/link";
import { requireUser } from "@/lib/dal";
import { db } from "@/lib/db";
import { site } from "@/lib/site";
import { formatClassDate } from "@/lib/format";
import DisclaimerBanner from "@/components/disclaimer-banner";
import ChangePasswordForm from "./change-password-form";
import BecomeMemberForm from "./become-member-form";
import ManageMembershipForm from "./manage-membership-form";
import { logoutAction } from "./actions";

export const dynamic = "force-dynamic";

function dedupeByKey<T>(items: T[], keyFn: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default async function AccountPage() {
  const { userId } = await requireUser();
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return null;

  const [materialPurchases, coursePurchases, signups, certificate] = await Promise.all([
    db.purchase.findMany({
      where: {
        email: { equals: user.email, mode: "insensitive" },
        status: "paid",
        materialId: { not: null },
      },
      include: { material: true },
      orderBy: { createdAt: "desc" },
    }),
    db.purchase.findMany({
      where: {
        email: { equals: user.email, mode: "insensitive" },
        status: "paid",
        courseId: { not: null },
      },
      include: { course: true },
      orderBy: { createdAt: "desc" },
    }),
    db.signup.findMany({
      where: { email: { equals: user.email, mode: "insensitive" } },
      include: { classSession: true },
      orderBy: { createdAt: "desc" },
    }),
    db.certificate.findUnique({ where: { userId } }),
  ]);

  const materials = dedupeByKey(
    materialPurchases.filter((p) => p.material !== null),
    (p) => p.materialId!
  );
  const courses = dedupeByKey(
    coursePurchases.filter((p) => p.course !== null),
    (p) => p.courseId!
  );

  const now = new Date();
  const upcomingSignups = signups
    .filter((s) => s.classSession.startsAt >= now)
    .sort((a, b) => a.classSession.startsAt.getTime() - b.classSession.startsAt.getTime());
  const pastSignups = signups
    .filter((s) => s.classSession.startsAt < now)
    .sort((a, b) => b.classSession.startsAt.getTime() - a.classSession.startsAt.getTime());

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900">My account</h1>

      <div className="mt-6 rounded-lg border border-slate-200 p-5">
        <p className="text-sm text-slate-500">Username</p>
        <p className="font-medium text-slate-900">{user.username}</p>
        <p className="mt-3 text-sm text-slate-500">Email</p>
        <p className="font-medium text-slate-900">{user.email}</p>
      </div>

      <div className="mt-6 rounded-lg border border-slate-200 p-5">
        <h2 className="text-lg font-semibold text-slate-900">Membership</h2>
        {user.isComped ? (
          <>
            <p className="mt-2 text-sm text-slate-600">
              You have complimentary membership access — thank you for being part of {site.name}.
            </p>
            <Link href="/account/chat" className="mt-2 inline-block text-sm font-medium text-blue-600 hover:underline">
              Open the AI chat assistant →
            </Link>
          </>
        ) : user.membershipStatus === "active" ? (
          <>
            <p className="mt-2 text-sm text-slate-600">You&apos;re a member ($9.99/month).</p>
            <Link href="/account/chat" className="mt-2 inline-block text-sm font-medium text-blue-600 hover:underline">
              Open the AI chat assistant →
            </Link>
            <ManageMembershipForm />
          </>
        ) : (
          <>
            {user.membershipStatus === "past_due" && (
              <p className="mt-2 text-sm text-amber-700">
                Your last membership payment didn&apos;t go through.
              </p>
            )}
            {user.membershipStatus === "canceled" && (
              <p className="mt-2 text-sm text-slate-600">Your membership was canceled.</p>
            )}
            <p className="mt-2 text-sm text-slate-600">
              Optional membership — $9.99 to join today, $9.99/month after.
            </p>
            <div className="mt-3">
              <DisclaimerBanner>{site.membershipDisclaimer}</DisclaimerBanner>
            </div>
            <BecomeMemberForm />
          </>
        )}
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-slate-900">My materials</h2>
        {materials.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            You haven&apos;t unlocked any materials yet.{" "}
            <Link href="/materials" className="text-blue-600 hover:underline">
              Browse the library
            </Link>
            .
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {materials.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 p-4"
              >
                <p className="font-medium text-slate-900">{p.material!.title}</p>
                <a
                  href={`/api/download/${p.downloadToken}`}
                  className="text-sm font-medium text-blue-600 hover:underline"
                >
                  Download
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-slate-900">My courses</h2>
        {courses.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            You haven&apos;t unlocked any courses yet.{" "}
            <Link href="/courses" className="text-blue-600 hover:underline">
              Browse courses
            </Link>
            .
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {courses.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 p-4"
              >
                <p className="font-medium text-slate-900">{p.course!.title}</p>
                <Link
                  href={`/courses/${p.courseId}?token=${p.downloadToken}`}
                  className="text-sm font-medium text-blue-600 hover:underline"
                >
                  View course
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-slate-900">My class signups</h2>
        {upcomingSignups.length === 0 && pastSignups.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            You haven&apos;t signed up for any classes yet.{" "}
            <Link href="/calendar" className="text-blue-600 hover:underline">
              See the calendar
            </Link>
            .
          </p>
        ) : (
          <>
            {upcomingSignups.length > 0 && (
              <div className="mt-3">
                <p className="text-sm font-medium text-slate-500">Upcoming</p>
                <div className="mt-2 space-y-2">
                  {upcomingSignups.map((s) => (
                    <div key={s.id} className="rounded-lg border border-slate-200 p-4">
                      <p className="font-medium text-slate-900">{s.classSession.title}</p>
                      <p className="text-sm text-slate-500">
                        {formatClassDate(s.classSession.startsAt)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {pastSignups.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-slate-500">Past</p>
                <div className="mt-2 space-y-2">
                  {pastSignups.map((s) => (
                    <div key={s.id} className="rounded-lg border border-slate-200 p-4 opacity-70">
                      <p className="font-medium text-slate-900">{s.classSession.title}</p>
                      <p className="text-sm text-slate-500">
                        {formatClassDate(s.classSession.startsAt)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-slate-900">Certificate</h2>
        {certificate ? (
          <p className="mt-2 text-sm text-slate-600">
            You&apos;ve earned your certificate.{" "}
            <Link href="/account/certificate" className="text-blue-600 hover:underline">
              View it
            </Link>
            .
          </p>
        ) : (
          <p className="mt-2 text-sm text-slate-500">
            Complete every course checklist and pass the{" "}
            <Link href="/account/quiz" className="text-blue-600 hover:underline">
              certification quiz
            </Link>{" "}
            to earn your certificate.
          </p>
        )}
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-slate-900">Change password</h2>
        <ChangePasswordForm />
      </div>

      <form action={logoutAction} className="mt-8">
        <button
          type="submit"
          className="rounded-md px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900"
        >
          Log out
        </button>
      </form>
    </div>
  );
}
