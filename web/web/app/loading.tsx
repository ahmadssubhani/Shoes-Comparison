import { ProductSkeletonGrid } from "@/components/UiStates";

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-8 h-16 w-2/3 animate-pulse rounded bg-[#efebe3]" />
      <ProductSkeletonGrid />
    </div>
  );
}
