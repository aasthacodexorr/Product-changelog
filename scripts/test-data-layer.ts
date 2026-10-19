import assert from 'node:assert/strict';
import {
  addCustomType, addProduct, allTypes, applyMerge, createUpdate, deleteUpdate, editUpdate, emptyInput,
  filterUpdatesByProduct, groupByMonth, parseImport, planMerge, renderChangelogHtml, serializeExport,
  suggestProducts, validateDataset, DEFAULT_TYPES, type Dataset,
} from '../lib/changelog';

let n = 0;
const t = (name: string, fn: () => void) => { fn(); n++; console.log('ok -', name); };
const base = { moduleName: 'M', description: 'D' };

const empty: Dataset = { products: [], updates: [], customTypes: [] };
const seeded: Dataset = {
  products: [{ id: 'p_mobile', name: 'Mobile App' }, { id: 'p_crm', name: 'CRM' }],
  updates: [
    { id: 'u1', productId: 'p_mobile', moduleName: 'Scan', title: 'Scanning', description: 'd', releaseDate: '2026-10-15', type: 'New Feature', version: '1.2.0' },
    { id: 'u2', productId: 'p_crm', moduleName: 'Inventory', title: 'Search faster', description: 'd', releaseDate: '2026-10-14', type: 'Improvement' },
    { id: 'u3', productId: 'p_crm', moduleName: 'Reports', title: 'Sep report', description: 'd', releaseDate: '2026-09-02', type: 'Bug Fix' },
    { id: 'u4', productId: 'p_mobile', moduleName: 'Login', title: 'Sep login', description: 'd', releaseDate: '2026-09-20', type: 'Bug Fix' },
  ],
  customTypes: [],
};

t('empty dataset (first visit) is valid and groups to nothing', () => {
  assert.ok(validateDataset(empty).ok);
  assert.deepEqual(groupByMonth(empty.updates), []);
  assert.match(renderChangelogHtml(empty), /No updates have been published yet/);
});

t('old drafts without customTypes still validate', () => {
  const r = validateDataset({ products: seeded.products, updates: seeded.updates });
  assert.ok(r.ok); assert.deepEqual(r.value!.customTypes, []);
});

t('month-first grouping, all products together, newest first', () => {
  const g = groupByMonth(seeded.updates);
  assert.deepEqual(g.map((m) => m.label), ['October 2026', 'September 2026']);
  assert.deepEqual(g[0].updates.map((u) => u.id), ['u1', 'u2']);
  assert.deepEqual(g[1].updates.map((u) => u.id), ['u4', 'u3']);
});

t('search: case-insensitive, partial, spans months, read-only', () => {
  const copy = JSON.stringify(seeded);
  const r = filterUpdatesByProduct(seeded.updates, seeded.products, ' mob');
  assert.deepEqual(r.map((u) => u.id), ['u1', 'u4']);
  assert.equal(groupByMonth(r).length, 2);
  assert.equal(filterUpdatesByProduct(seeded.updates, seeded.products, 'zzz').length, 0);
  assert.equal(filterUpdatesByProduct(seeded.updates, seeded.products, '').length, 4);
  assert.equal(JSON.stringify(seeded), copy);
  assert.deepEqual(suggestProducts(seeded.products, 'c').map((p) => p.name), ['CRM']);
});

t('custom types: validation, dedupe, persistence in dataset', () => {
  assert.equal(addCustomType(seeded, '   ').ok, false);
  assert.equal(addCustomType(seeded, '  new   FEATURE ').ok, false);
  assert.equal(addCustomType(seeded, 'bug fix').ok, false);
  const r = addCustomType(seeded, '  Deprecation   Notice ');
  assert.ok(r.ok); assert.equal(r.value!.type, 'Deprecation Notice');
  assert.equal(addCustomType(r.value!.dataset, 'deprecation notice').ok, false);
  assert.deepEqual(allTypes(r.value!.dataset), [...DEFAULT_TYPES, 'Deprecation Notice']);
});

let ds: Dataset = seeded;
t('custom type usable in create and edit; defaults preserved', () => {
  ds = addCustomType(ds, 'Deprecation').value!.dataset;
  const c = createUpdate(ds, { ...emptyInput('p_crm'), ...base, title: 'T', type: 'deprecation' });
  assert.ok(c.ok); if (!c.ok) return;
  assert.equal(c.dataset.updates.at(-1)!.type, 'Deprecation'); // canonical spelling
  const e = editUpdate(c.dataset, 'u1', { ...emptyInput('p_mobile'), moduleName: 'Scan', description: 'd', version: '1.2.0', title: 'Scanning', releaseDate: '2026-10-15', type: 'Deprecation' });
  assert.ok(e.ok); if (!e.ok) return;
  ds = e.dataset;
  assert.equal(ds.updates[0].type, 'Deprecation');
  assert.equal(createUpdate(ds, { ...emptyInput('p_crm'), ...base, title: 'T', type: 'Nope' }).ok, false);
  assert.equal(createUpdate(ds, { ...emptyInput('p_crm'), ...base, title: 'T', type: '' }).ok, false);
});

t('optional proof URL is validated, stored, edited, and preserved on import', () => {
  const input = { ...emptyInput('p_crm'), ...base, title: 'Inventory update', type: 'Improvement', proofUrl: 'https://example.com/inventory' };
  const created = createUpdate(seeded, input);
  assert.ok(created.ok); if (!created.ok) return;
  assert.equal(created.dataset.updates.at(-1)!.proofUrl, input.proofUrl);
  const edited = editUpdate(created.dataset, created.id, { ...input, proofUrl: '' });
  assert.ok(edited.ok); if (!edited.ok) return;
  assert.equal(edited.dataset.updates.at(-1)!.proofUrl, undefined);
  assert.equal(createUpdate(seeded, { ...input, proofUrl: 'javascript:alert(1)' }).ok, false);
  const imported = parseImport(serializeExport(created.dataset));
  assert.ok(imported.ok);
  assert.equal(imported.value!.updates.at(-1)!.proofUrl, input.proofUrl);
  assert.equal(validateDataset({
    products: seeded.products,
    updates: [{ ...seeded.updates[0], proofUrl: 'javascript:alert(1)' }],
  }).ok, false);
});

t('validation requires fields; delete/addProduct', () => {
  const r = createUpdate(seeded, emptyInput());
  assert.equal(r.ok, false);
  assert.equal(deleteUpdate(seeded, 'u2').updates.length, 3);
  assert.equal(addProduct(seeded, ' crm ').ok, false);
});

t('export includes custom types and round-trips', () => {
  const r = parseImport(serializeExport(ds));
  assert.ok(r.ok, r.errors.join());
  assert.deepEqual(r.value!.customTypes, ['Deprecation']);
  assert.deepEqual(r.value!.updates, ds.updates);
});

t('import into a clean dataset transfers products, updates and types', () => {
  const incoming = parseImport(serializeExport(ds)).value!;
  const plan = planMerge(empty, incoming);
  assert.equal(plan.newUpdates.length, ds.updates.length);
  assert.deepEqual(plan.newTypes, ['Deprecation']);
  const merged = applyMerge(empty, plan);
  assert.deepEqual(merged.customTypes, ['Deprecation']);
  assert.equal(merged.products.length, 2);
});

t('duplicate import adds nothing; conflicts reported, existing preserved', () => {
  const incoming = parseImport(serializeExport(seeded)).value!;
  const plan = planMerge(ds, incoming);
  assert.equal(plan.newUpdates.length, 0);
  assert.equal(plan.updateConflicts.length, 1);
  assert.equal(plan.updateConflicts[0].existing.id, 'u1');
  assert.deepEqual(plan.updateConflicts[0].fields, ['type']);
  const merged = applyMerge(ds, plan);
  assert.equal(merged.updates.length, ds.updates.length);
  assert.equal(merged.updates[0].type, 'Deprecation');
});

t('merge reuses existing type spelling', () => {
  const incoming: Dataset = { ...seeded, updates: [{ ...seeded.updates[0], id: 'u9', type: 'DEPRECATION' }], customTypes: ['DEPRECATION'] };
  const plan = planMerge(ds, incoming);
  assert.deepEqual(plan.newTypes, []);
  assert.equal(applyMerge(ds, plan).updates.at(-1)!.type, 'Deprecation');
});

t('invalid input is rejected with errors', () => {
  const ok = JSON.parse(serializeExport(seeded));
  assert.equal(parseImport('{nope').ok, false);
  assert.equal(parseImport('').ok, false);
  assert.equal(parseImport(JSON.stringify({ ...ok, schemaVersion: 99 })).ok, false);
  assert.match(parseImport(JSON.stringify({ ...ok, updates: [...ok.updates, ok.updates[0]] })).errors.join(), /duplicate update id/);
  assert.equal(parseImport(JSON.stringify({ ...ok, updates: [{ ...ok.updates[0], releaseDate: '2026-02-31', type: '' }] })).errors.length, 2);
  assert.match(parseImport(JSON.stringify({ ...ok, updates: [{ ...ok.updates[0], productId: 'zzz' }] })).errors.join(), /productId/);
  assert.equal(parseImport(JSON.stringify({ ...ok, customTypes: [1] })).ok, false);
});

t('HTML: month-first, escapes user text, no scripts, shows product and proof link', () => {
  const withEvil = createUpdate(ds, { ...emptyInput('p_mobile'), moduleName: '<b>m</b>', title: '<script>alert(1)</script>', description: '"><img src=x onerror=alert(1)>', type: 'Bug Fix', releaseDate: '2026-10-30' });
  assert.ok(withEvil.ok); if (!withEvil.ok) return;
  const withProof = createUpdate(withEvil.dataset, { ...emptyInput('p_mobile'), ...base, title: 'Inventory proof', type: 'Improvement', proofUrl: 'https://example.com/inventory' });
  assert.ok(withProof.ok); if (!withProof.ok) return;
  const custom = addCustomType(withProof.dataset, '<i>x</i>').value!.dataset;
  const html = renderChangelogHtml(custom);
  assert.ok(!html.includes('<script') && !html.includes('<img') && !html.includes('<i>'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(html.indexOf('October 2026') < html.indexOf('September 2026'));
  assert.ok(html.includes('Product: Mobile App'));
  assert.ok(html.includes('15 October'));
  assert.ok(html.includes('href="https://example.com/inventory"'));
  assert.ok(html.includes('>View proof</a>'));
});

console.log(`\n${n} test groups passed`);
