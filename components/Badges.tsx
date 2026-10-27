import { typeColor, type UpdateType } from '@/lib/changelog';

export function TypeBadge({ type }: { type: UpdateType }) {
  const c = typeColor(type);
  return (
    <span className="rounded-full border px-2.5 py-px text-xs font-semibold" style={{ color: c, borderColor: c }}>
      {type}
    </span>
  );
}

export function StatusBadge({ status }: { status: 'DRAFT' | 'PUBLISHED' }) {
  if (status === 'PUBLISHED') {
    return (
      <span className="rounded-full border border-[#238636] bg-[#238636]/15 px-2.5 py-px text-xs font-semibold text-[#3fb950]">
        Published
      </span>
    );
  }
  return (
    <span className="rounded-full border border-[#d29922] bg-[#d29922]/15 px-2.5 py-px text-xs font-semibold text-[#e3b341]">
      Draft
    </span>
  );
}

export function VersionBadge({ version }: { version: string }) {
  const trimmed = version.trim();
  if (!trimmed) return null;
  const display = /^\d/.test(trimmed) ? `v${trimmed}` : trimmed;
  return (
    <span className="rounded-full border border-[#2e8cff] bg-[#2e8cff]/10 px-2.5 py-px text-xs font-semibold text-[#2e8cff]">
      {display}
    </span>
  );
}

export function ChevronIcon({ open, className = '' }: { open: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`h-5 w-5 shrink-0 text-[#666] transition-transform ${open ? '' : '-rotate-90'} ${className}`}
    >
      <path d="M5 7.5l5 5 5-5" />
    </svg>
  );
}
