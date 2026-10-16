import { typeColor, type UpdateType } from '@/lib/changelog';

export function TypeBadge({ type }: { type: UpdateType }) {
  const c = typeColor(type);
  return (
    <span className="rounded-full border px-2.5 py-px text-xs font-semibold" style={{ color: c, borderColor: c }}>
      {type}
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
      className={`h-5 w-5 shrink-0 text-[#8b949e] transition-transform ${open ? '' : '-rotate-90'} ${className}`}
    >
      <path d="M5 7.5l5 5 5-5" />
    </svg>
  );
}
