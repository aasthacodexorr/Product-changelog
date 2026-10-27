'use client';

import { useMemo, useState } from 'react';
import { formatDayMonth, groupByMonth, type ChangelogUpdate, type Product } from '@/lib/changelog';
import { ChevronIcon, StatusBadge, TypeBadge, VersionBadge } from './Badges';

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
                className="flex w-full cursor-pointer items-center gap-2 border-b border-[#2e8cff] py-2 text-left text-xl font-semibold hover:text-[#2e8cff]"
              >
                <ChevronIcon open={open} />
                {g.label}
                <span className="ml-auto text-xs font-normal text-[#666]">
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
                      <div className="mb-1.5 flex flex-wrap items-center gap-2 text-[13px] text-[#666]">
                        <span>{formatDayMonth(u.releaseDate)}</span>
                        <TypeBadge type={u.type} />
                        {u.version && <VersionBadge version={u.version} />}
                        {showStatus && u.status && <StatusBadge status={u.status} />}
                      </div>
                      <h1 className="text-[19px] font-semibold">{productName}</h1>
                      {u.moduleName?.trim() && (
                        <p className="my-0.5 text-sm text-[#666]">
                          <span className="font-medium text-[#333]">{u.moduleName}</span>
                        </p>
                      )}
                      <h3 className="text-[17px] font-semibold flex items-center gap-1">{u.title}
                        {reviewUrl && (
                          <a
                            href={reviewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-2 text-[#2e8cff] hover:underline"
                          >

                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 512 512">
                              <rect width="512" height="512" fill="none" />

                              <path
                                d="M224 144 H160
       A80 80 0 0 0 80 224
       V368
       A80 80 0 0 0 160 448
       H288
       A80 80 0 0 0 368 368
       V288"
                                fill="none"
                                stroke="#B8BBDD"
                                strokeWidth="32"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />


                              <path
                                d="M272 80 H432 V240
       M432 80 L192 320"
                                fill="none"
                                stroke="#2e8cff"
                                strokeWidth="32"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </a>
                        )}
                      </h3>
                      <p className="whitespace-pre-wrap break-words text-sm">{u.description}</p>
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
