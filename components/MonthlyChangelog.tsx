'use client';

import { useMemo, useState } from 'react';
import { formatDayMonth, groupByMonth, type ChangelogUpdate, type Product } from '@/lib/changelog';
import { ChevronIcon, StatusBadge, TypeBadge } from './Badges';

interface Props {
  updates: ChangelogUpdate[];
  products: Product[];
  /** Admin-only controls rendered under each entry; omitted for the client-facing preview. */
  renderActions?: (u: ChangelogUpdate) => React.ReactNode;
  /** While a filter is active, months start expanded so matches are visible. */
  defaultOpen?: boolean;
  /** Whether to show draft/published status badges */
  showStatus?: boolean;
}

/** Month-first changelog (all products together). Each month collapses independently. */
export function MonthlyChangelog({ updates, products, renderActions, defaultOpen = false, showStatus = false }: Props) {
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const names = useMemo(() => new Map(products.map((p) => [p.id, p.name])), [products]);
  const groups = useMemo(() => groupByMonth(updates), [updates]);

  return (
    <div>
      {groups.map((g) => {
        const open = overrides[g.key] ?? defaultOpen;
        const panelId = `month-${g.key}`;
        return (
          <section key={g.key} className="mb-3" aria-label={g.label}>
            <h2>
              <button
                type="button"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOverrides((s) => ({ ...s, [g.key]: !open }))}
                className="flex w-full cursor-pointer items-center gap-2 border-b border-[#30363d] py-2 text-left text-xl font-semibold hover:text-[#58a6ff]"
              >
                <ChevronIcon open={open} />
                {g.label}
                <span className="ml-auto text-xs font-normal text-[#8b949e]">
                  {g.updates.length} update{g.updates.length === 1 ? '' : 's'}
                </span>
              </button>
            </h2>
            {open && (
              <ul id={panelId} className="mt-3 space-y-3">
                {g.updates.map((u) => {
                  const reviewUrl = (u.reviewUrl || u.proofUrl || '').trim();
                  const productName = u.productName || names.get(u.productId) || 'Unknown';
                  return (
                    <li key={u.id} className="card p-4" data-update-id={u.id}>
                      <div className="mb-1.5 flex flex-wrap items-center gap-2 text-[13px] text-[#8b949e]">
                        <span>{formatDayMonth(u.releaseDate)}</span>
                        <TypeBadge type={u.type} />
                        {showStatus && u.status && <StatusBadge status={u.status} />}
                      </div>
                      <h3 className="text-[17px] font-semibold">{u.title}</h3>
                      <p className="mb-2 text-[13px] text-[#8b949e]">
                        Product: {productName} · Module: {u.moduleName}
                        {u.version && <> · Version: {u.version}</>}
                      </p>
                      <p className="whitespace-pre-wrap break-words text-sm text-[#c9d1d9]">{u.description}</p>
                      {reviewUrl && (
                        <a
                          className="mt-2 inline-block text-sm text-[#58a6ff] hover:underline"
                          href={reviewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Review Changes
                        </a>
                      )}
                      {renderActions && <div className="mt-3 flex flex-wrap gap-2">{renderActions(u)}</div>}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
