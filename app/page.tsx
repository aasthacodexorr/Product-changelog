'use client';

import { useMemo, useRef, useState } from 'react';
import { filterUpdatesByProduct, type ChangelogUpdate, type UpdateInput } from '@/lib/changelog';
import { useChangelog } from '@/hooks/useChangelog';
import { MonthlyChangelog } from '@/components/MonthlyChangelog';
import { ProductSearch } from '@/components/ProductSearch';
import { UpdateForm } from '@/components/UpdateForm';
import { AddProductDialog } from '@/components/AddProductDialog';
import { ImportDialog } from '@/components/ImportDialog';
import { ConfirmDialog, Modal } from '@/components/Modal';

type Tab = 'manage' | 'preview';

export default function Page() {
  const cl = useChangelog();
  const [tab, setTab] = useState<Tab>('manage');
  const [query, setQuery] = useState('');
  const [form, setForm] = useState<{ editing: ChangelogUpdate | null } | null>(null);
  const [addingProduct, setAddingProduct] = useState<{ thenAddUpdate: boolean } | null>(null);
  const [deleting, setDeleting] = useState<ChangelogUpdate | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { working } = cl;
  const filtering = query.trim() !== '';
  const visible = useMemo(
    () => filterUpdatesByProduct(working.updates, working.products, query),
    [working.updates, working.products, query],
  );
  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 4000);
  };

  if (!cl.ready) return <main className="p-8 text-[#8b949e]">Loading changelog…</main>;

  // An update needs a product, so the first update starts by adding one.
  const startAddUpdate = () => (working.products.length ? setForm({ editing: null }) : setAddingProduct({ thenAddUpdate: true }));

  const submitUpdate = (input: UpdateInput) => {
    const r = cl.saveUpdate(form?.editing?.id ?? null, input);
    if (!r.ok) return r.errors;
    setForm(null);
    flash(form?.editing ? 'Update saved.' : 'Update added.');
    return null;
  };

  const results = (
    <>
      {working.updates.length === 0 ? (
        <div className="card p-8 text-center">
          <h2 className="text-lg font-semibold">No updates yet</h2>
          <p className="mx-auto mt-1 mb-4 max-w-md text-sm text-[#8b949e]">
            Updates you add appear here, grouped by month. You can also import a JSON file exported by a colleague.
          </p>
          {tab === 'manage' && <button className="btn btn-primary" onClick={startAddUpdate}>+ Add update</button>}
        </div>
      ) : visible.length === 0 ? (
        <div className="card p-8 text-center">
          <h2 className="text-lg font-semibold">No matching updates</h2>
          <p className="mx-auto mt-1 mb-4 max-w-md text-sm text-[#8b949e]">
            No product name contains “{query.trim()}”, or the matching products have no updates.
          </p>
          <button className="btn" onClick={() => setQuery('')}>Clear search</button>
        </div>
      ) : (
        <>
          {filtering && (
            <p className="mb-3 text-sm text-[#8b949e]" role="status">
              {visible.length} update{visible.length === 1 ? '' : 's'} matching “{query.trim()}”
            </p>
          )}
          <MonthlyChangelog
            updates={visible}
            products={working.products}
            defaultOpen={filtering}
            renderActions={
              tab === 'manage'
                ? (u) => (
                    <>
                      <button className="btn" onClick={() => setForm({ editing: u })} aria-label={`Edit ${u.title}`}>Edit</button>
                      <button className="btn btn-danger" onClick={() => setDeleting(u)} aria-label={`Delete ${u.title}`}>Delete</button>
                    </>
                  )
                : undefined
            }
          />
        </>
      )}
    </>
  );

  return (
    <main className="mx-auto max-w-4xl px-4 pt-6 pb-16">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Product Changelog</h1>
          <p className="text-sm text-[#8b949e]">Internal management · data is saved in this browser only</p>
        </div>
        <div className="flex rounded-md border border-[#30363d] p-0.5 " role="tablist">
          {(['manage', 'preview'] as const).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
              className={`rounded px-3 py-1 text-sm capitalize cursor-pointer ${tab === t ? 'bg-[#30363d] font-medium' : 'text-[#8b949e] hover:text-[#e6edf3]'}`}>
              {t}
            </button>
          ))}
        </div>
      </header>

      {cl.warning && (
        <div role="alert" className="mb-3 flex items-start justify-between gap-3 rounded-md border border-[#9e6a03] bg-[#9e6a03]/15 p-3 text-sm text-[#e3b341]">
          <span>{cl.warning}</span>
          <button className="underline" onClick={cl.dismissWarning}>Dismiss</button>
        </div>
      )}
      {cl.saveError && (
        <div role="alert" className="mb-3 rounded-md border border-[#f85149]/60 bg-[#f85149]/10 p-3 text-sm text-[#f85149]">{cl.saveError}</div>
      )}

      {tab === 'manage' && (
        <div className="card mb-4 p-3 text-sm text-[#c9d1d9]">
          <strong>Saving here does not update the live client page.</strong> Changes are stored in this browser only. To publish, use{' '}
          <em>Publish / Export files</em> and upload <code>changelog.html</code> to your web server.
        </div>
      )}

      <div className="mb-4">
        <ProductSearch value={query} onChange={setQuery} products={working.products} />
      </div>

      {tab === 'manage' && (
        <div className="mb-6 space-y-3">
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-primary" onClick={startAddUpdate}>+ Add update</button>
            <button className="btn" onClick={() => setAddingProduct({ thenAddUpdate: false })}>+ Add product</button>
          </div>
          <div className="card flex flex-wrap items-center gap-2 p-3">
            <span className="mr-1 text-xs font-semibold tracking-wider text-[#8b949e] uppercase">Data</span>
            <button className="btn" onClick={() => fileRef.current?.click()}
              title="Import a JSON file exported by another employee or from a backup. Merge adds new records without duplicates and lets you review conflicts; Replace restores a full dataset. It does not sync data automatically.">
              Import JSON
            </button>
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" aria-label="Import JSON file"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setImportFile(f);
                e.target.value = '';
              }} />
            <button className="btn" onClick={cl.exportJson} title="Download all products, updates and custom types as a JSON file.">Export JSON</button>
            <button className="btn" onClick={() => setPublishing(true)}>Publish / Export files</button>
            <p className="w-full text-xs text-[#8b949e]">
              Import JSON merges or restores data exported from another browser or colleague. It is a manual transfer, not automatic sync.
            </p>
          </div>
        </div>
      )}

      {results}

      {form && (
        <UpdateForm
          products={working.products}
          types={cl.types}
          onAddType={cl.createType}
          defaultProductId=""
          editing={form.editing}
          onSubmit={submitUpdate}
          onCancel={() => setForm(null)}
        />
      )}
      {addingProduct && (
        <AddProductDialog
          onCancel={() => setAddingProduct(null)}
          onAdd={(name) => {
            const r = cl.createProduct(name);
            if (!r.ok || !r.value) return r.errors;
            const next = addingProduct.thenAddUpdate;
            setAddingProduct(null);
            flash(`Product “${r.value.name}” added.`);
            if (next) setForm({ editing: null });
            return null;
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog title="Delete update?" confirmLabel="Delete" danger onCancel={() => setDeleting(null)}
          onConfirm={() => { cl.removeUpdate(deleting.id); setDeleting(null); flash('Update deleted.'); }}>
          <p>“{deleting.title}” will be removed from your working data. Export JSON first if you may need it back.</p>
        </ConfirmDialog>
      )}
      {publishing && (
        <Modal title="Publish / Export files" onClose={() => setPublishing(false)} wide>
          <div className="space-y-2 text-sm text-[#c9d1d9]">
            <p>This application has no backend, so it cannot change your live website. Publishing is a static deployment:</p>
            <ol className="list-decimal space-y-1 pl-5">
              <li>Finalize your updates and review them in the Preview tab.</li>
              <li>Download the files below: <code>changelog.json</code> and a self-contained <code>changelog.html</code>.</li>
              <li>Upload them to your web server.</li>
            </ol>
            <p className="text-[#e3b341]">Saving here never updates the deployed page automatically.</p>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button className="btn" onClick={() => setPublishing(false)}>Close</button>
            <button className="btn btn-primary" onClick={() => { cl.publishPackage(); setPublishing(false); flash('Downloaded changelog.json and changelog.html.'); }}>Download files</button>
          </div>
        </Modal>
      )}
      {importFile && (
        <ImportDialog
          file={importFile}
          current={working}
          readFile={cl.readImportFile}
          preview={cl.previewMerge}
          onClose={() => setImportFile(null)}
          onMerge={(plan) => { cl.merge(plan); setImportFile(null); flash(`Merged ${plan.newProducts.length} product(s), ${plan.newUpdates.length} update(s) and ${plan.newTypes.length} type(s).`); }}
          onRestore={(ds) => { cl.restore(ds); setImportFile(null); flash('Working data replaced. A backup was downloaded.'); }}
        />
      )}
      {toast && <div role="status" className="fixed right-4 bottom-4 left-4 z-[60] rounded-md border border-[#2ea043] bg-[#0d1117] p-3 text-sm shadow-xl sm:left-auto">{toast}</div>}
    </main>
  );
}
