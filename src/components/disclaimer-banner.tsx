import { site } from "@/lib/site";

export default function DisclaimerBanner() {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <span className="font-semibold">Good to know: </span>
      {site.freeClassesDisclaimer}
    </div>
  );
}
