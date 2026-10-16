# Product Changelog Manager

Frontend-only Next.js + React + TypeScript + Tailwind app for managing product updates and exporting them as a static, client-facing changelog. No backend, database, auth or paid services.

## Commands

```bash
npm install
npm run dev        # development server
npm run build      # static export to ./out
npm run typecheck
npm test           # data-layer tests (tsx scripts/test-data-layer.ts)
```

## How it works

- There is **no bundled sample data**. The changelog shows only updates your team has entered (or imported). A first visit shows an empty state with an *Add update* action.
- Your working dataset (products, updates, custom update types) is saved in this browser's `localStorage`. It is private to this browser.
- The changelog is grouped **by month and year** (newest first), with every product's updates together. Each month collapses independently (closed by default; months open automatically while a search is active). The product name is shown on each entry.
- The search bar at the top filters by product name (case-insensitive, partial match) across all months. It never changes the data.
- **Update types:** New Feature, Improvement, Bug Fix and Security Update are built in. Use *+ New type* in the update form to add your own; they are saved with the dataset, included in exports, and merged on import.

## Publishing limitation

`localStorage` changes never update a deployed page, and importing a JSON file cannot modify a file on a server. Publishing is a manual static deployment:

1. Review your updates in the **Preview** tab.
2. **Publish / Export files** downloads `changelog.json` and a self-contained `changelog.html` (no scripts, no external requests, all text escaped, months collapsible with native `<details>`).
3. Upload them to your web server.

## Import JSON

Import JSON is a manual way to move data between browsers/computers (it is **not** automatic sync). The file is fully validated first; if it is invalid nothing changes.

- **Import & Merge** adds records with new IDs, new products and new custom types. Existing records are never overwritten; same-ID records that differ are listed as conflicts for review before you apply.
- **Import & Replace** replaces the whole working dataset after confirmation, downloading a backup of the current data first.

## Data layer (`lib/changelog/`)

`types` · `schema` (strict validation) · `update-types` (default/custom types) · `storage` (guarded localStorage, quota errors) · `mutations` (create/edit/delete) · `importer` (parse, merge plan) · `exporter` · `search` · `render` (month grouping, HTML) · `download`. UI components only use `hooks/useChangelog.ts`; storage is read after mount, never during SSR.

## JSON schema (version 1)

```json
{
  "format": "product-changelog",
  "schemaVersion": 1,
  "exportedAt": "2026-10-16T10:00:00.000Z",
  "products": [{ "id": "prod_x", "name": "Product name" }],
  "customTypes": ["Deprecation Notice"],
  "updates": [{
    "id": "upd_x",
    "productId": "prod_x",
    "moduleName": "Reports",
    "title": "Short title",
    "description": "Details",
    "releaseDate": "2026-09-22",
    "type": "New Feature",
    "version": "2.4.0"
  }]
}
```

`version` and `customTypes` are optional (files without `customTypes` from earlier versions still import). `type` is any non-empty name up to 40 characters; types used by updates but missing from `customTypes` are added automatically. IDs must be unique and each `productId` must match a product. Unknown fields, duplicates, bad dates or an unsupported `schemaVersion` reject the whole import with a list of errors.
