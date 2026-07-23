export default function DraftLegalBanner() {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
      <span className="font-semibold">Draft — not yet attorney-reviewed. </span>
      This page is a starting draft prepared for legal review. Do not rely on it
      as final, binding terms until an attorney has reviewed and approved it.
    </div>
  );
}
