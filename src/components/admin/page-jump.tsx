"use client";

interface Props {
  current: number; // 0-based
  total: number;
  paramName?: string;
  basePath?: string;
}

export function PageJump({ current, total, paramName = "productPage", basePath = "/admin/assets" }: Props) {
  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const input = (e.target as HTMLFormElement).elements.namedItem("pageInput") as HTMLInputElement;
        const value = parseInt(input.value, 10);
        if (!Number.isNaN(value) && value >= 1 && value <= total) {
          window.location.href = `${basePath}?${paramName}=${value - 1}`;
        }
      }}
    >
      <span className="text-xs text-[var(--shresta-text-muted)]">Go to</span>
      <input
        className="w-14 rounded-lg border border-[var(--wine-700)] bg-[rgba(26,9,12,0.4)] px-2 py-1 text-center text-sm text-white focus:border-[var(--gold-500)] focus:outline-none"
        defaultValue={current + 1}
        max={total}
        min={1}
        name="pageInput"
        type="number"
      />
      <span className="text-xs text-[var(--shresta-text-muted)]">of {total}</span>
      <button
        className="rounded-lg border border-[var(--wine-700)] bg-[rgba(26,9,12,0.3)] px-3 py-1 text-xs font-medium text-[var(--gold-400)] hover:border-[var(--gold-500)] hover:text-white"
        type="submit"
      >
        Jump
      </button>
    </form>
  );
}
