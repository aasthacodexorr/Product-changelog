import type { ChangelogUpdate, Dataset } from './types';
import { isValidProofUrl } from './schema';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function formatMonthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return `${MONTHS[m - 1] ?? '?'} ${y}`;
}

/** "15 October" */
export function formatDayMonth(date: string): string {
  const [, m, d] = date.split('-').map(Number);
  return `${d} ${MONTHS[m - 1] ?? '?'}`;
}

export interface MonthGroup {
  key: string; // YYYY-MM
  label: string;
  updates: ChangelogUpdate[];
}

/**
 * Groups updates by release month across all products. Months are newest first;
 * updates within a month are newest first.
 */
export function groupByMonth(updates: ChangelogUpdate[]): MonthGroup[] {
  const sorted = [...updates].sort(
    (a, b) => b.releaseDate.localeCompare(a.releaseDate) || a.title.localeCompare(b.title),
  );
  const groups: MonthGroup[] = [];
  for (const u of sorted) {
    const key = u.releaseDate.slice(0, 7);
    let g = groups[groups.length - 1];
    if (!g || g.key !== key) {
      g = { key, label: formatMonthLabel(key), updates: [] };
      groups.push(g);
    }
    g.updates.push(u);
  }
  return groups;
}

const DEFAULT_COLORS: Record<string, string> = {
  'new feature': '#3fb950',
  improvement: '#58a6ff',
  'bug fix': '#d29922',
  'security update': '#f85149',
};
const CUSTOM_PALETTE = ['#a371f7', '#db61a2', '#39c5cf', '#f0883e', '#7ee787', '#79c0ff'];

/** Badge color for a type; custom types get a stable color derived from their name. */
export function typeColor(type: string): string {
  const k = type.trim().toLowerCase();
  if (DEFAULT_COLORS[k]) return DEFAULT_COLORS[k];
  let h = 0;
  for (let i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) >>> 0;
  return CUSTOM_PALETTE[h % CUSTOM_PALETTE.length];
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const CSS = `
:root{color-scheme:dark}
*{box-sizing:border-box}
body{margin:0;background:#0d1117;color:#e6edf3;font:16px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif}
.wrap{max-width:860px;margin:0 auto;padding:32px 16px 64px}
h1{font-size:28px;margin:0 0 4px}
.sub{color:#8b949e;margin:0 0 24px}
details{margin-bottom:12px}
summary{cursor:pointer;list-style:none;display:flex;align-items:center;gap:8px;font-size:22px;font-weight:600;border-bottom:1px solid #30363d;padding:8px 0;margin-bottom:12px}
summary::-webkit-details-marker{display:none}
summary svg{width:20px;height:20px;transition:transform .15s;transform:rotate(-90deg);color:#8b949e}
details[open]>summary svg{transform:none}
.count{margin-left:auto;font-size:13px;font-weight:400;color:#8b949e}
.card{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:14px 16px;margin-bottom:12px}
.row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:6px;font-size:13px;color:#8b949e}
.badge{border:1px solid;border-radius:999px;padding:1px 10px;font-size:12px;font-weight:600}
.card h3{margin:0 0 2px;font-size:17px}
.meta{margin:0 0 8px;font-size:13px;color:#8b949e}
.card p{margin:0;white-space:pre-wrap;overflow-wrap:anywhere;color:#c9d1d9}
.empty{color:#8b949e}
footer{margin-top:48px;color:#6e7681;font-size:13px}
`;

const CHEVRON = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 7.5l5 5 5-5"/></svg>';

/**
 * Generates a fully self-contained, script-free HTML page grouped by month.
 * Months collapse with native <details>. All user text is escaped.
 */
export function renderChangelogHtml(ds: Dataset, opts: { title?: string; generatedAt?: Date } = {}): string {
  const title = escapeHtml(opts.title ?? 'Product Changelog');
  const names = new Map(ds.products.map((p) => [p.id, p.name]));
  const generated = (opts.generatedAt ?? new Date()).toISOString().slice(0, 10);
  const body = groupByMonth(ds.updates)
    .map((m) => {
      const cards = m.updates
        .map((u) => {
          const color = typeColor(u.type);
          const meta = [
            `Product: ${escapeHtml(names.get(u.productId) ?? 'Unknown')}`,
            `Module: ${escapeHtml(u.moduleName)}`,
            ...(u.version ? [`Version: ${escapeHtml(u.version)}`] : []),
          ].join(' &middot; ');
          const proof = u.proofUrl && isValidProofUrl(u.proofUrl)
            ? `<p><a href="${escapeHtml(u.proofUrl)}" target="_blank" rel="noopener noreferrer">View proof</a></p>`
            : '';
          return `<article class="card"><div class="row"><span>${escapeHtml(formatDayMonth(u.releaseDate))}</span><span class="badge" style="color:${color};border-color:${color}">${escapeHtml(u.type)}</span></div><h3>${escapeHtml(u.title)}</h3><p class="meta">${meta}</p><p>${escapeHtml(u.description)}</p>${proof}</article>`;
        })
        .join('');
      return `<details><summary>${CHEVRON}${escapeHtml(m.label)}<span class="count">${m.updates.length} update${m.updates.length === 1 ? '' : 's'}</span></summary>${cards}</details>`;
    })
    .join('');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<style>${CSS}</style>
</head>
<body>
<div class="wrap">
<h1>${title}</h1>
<p class="sub">Latest product updates and improvements.</p>
${body || '<p class="empty">No updates have been published yet.</p>'}
<footer>Last generated ${generated}.</footer>
</div>
</body>
</html>
`;
}
