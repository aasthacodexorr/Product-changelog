'use client';

import { useEffect, useState } from 'react';
import type { ChangelogExport, Dataset, MergePlan, Result } from '@/lib/changelog';
import { ConfirmDialog, Modal } from './Modal';

interface Props {
  file: File;
  current: Dataset;
  readFile: (f: File) => Promise<Result<ChangelogExport>>;
  preview: (incoming: Dataset) => MergePlan;
  onMerge: (plan: MergePlan) => void;
  onRestore: (incoming: Dataset) => void;
  onClose: () => void;
}

export function ImportDialog({ file, current, readFile, preview, onMerge, onRestore, onClose }: Props) {
  const [result, setResult] = useState<Result<ChangelogExport> | null>(null);
  const [mode, setMode] = useState<'merge' | 'restore'>('merge');
  const [confirmRestore, setConfirmRestore] = useState(false);

  useEffect(() => {
    let live = true;
    readFile(file).then((r) => live && setResult(r));
    return () => {
      live = false;
    };
  }, [file, readFile]);

  if (!result) {
    return <Modal title="Import JSON" onClose={onClose}><p className="text-sm text-[#8b949e]">Validating {file.name}…</p></Modal>;
  }

  if (!result.ok || !result.value) {
    return (
      <Modal title="Import failed" onClose={onClose} wide>
        <p className="mb-2 text-sm">
          <strong>{file.name}</strong> was not imported. Your current data has not been changed.
        </p>
        <ul className="mb-4 max-h-60 list-disc space-y-1 overflow-y-auto pl-5 text-sm text-[#f85149]">
          {result.errors.slice(0, 50).map((e) => <li key={e}>{e}</li>)}
          {result.errors.length > 50 && <li>…and {result.errors.length - 50} more.</li>}
        </ul>
        <div className="flex justify-end"><button className="btn" onClick={onClose}>Close</button></div>
      </Modal>
    );
  }

  const incoming = result.value;
  const plan = preview(incoming);
  const incomingUpdateIds = new Set(incoming.updates.map((u) => u.id));
  const incomingProductIds = new Set(incoming.products.map((p) => p.id));
  const lostUpdates = current.updates.filter((u) => !incomingUpdateIds.has(u.id)).length;
  const lostProducts = current.products.filter((p) => !incomingProductIds.has(p.id)).length;

  if (confirmRestore) {
    return (
      <ConfirmDialog
        title="Replace working data?"
        confirmLabel="Backup and replace"
        danger
        onCancel={() => setConfirmRestore(false)}
        onConfirm={() => onRestore(incoming)}
      >
        <p>A backup of your current data will be downloaded first, then your working data will be replaced with the contents of <strong>{file.name}</strong> ({incoming.products.length} products, {incoming.updates.length} updates).</p>
        <p className="text-[#e3b341]">{lostUpdates} update(s) and {lostProducts} product(s) that are not in the imported file will no longer appear in the working dataset.</p>
      </ConfirmDialog>
    );
  }

  return (
    <Modal title="Import JSON" onClose={onClose} wide>
      <p className="mb-3 text-sm text-[#8b949e]">
        <strong className="text-[#e6edf3]">{file.name}</strong> is valid: {incoming.products.length} product{incoming.products.length === 1 ? '' : 's'} and {incoming.updates.length} update{incoming.updates.length === 1 ? '' : 's'}.
      </p>
      <fieldset className="mb-4 grid gap-2 sm:grid-cols-2">
        <legend className="sr-only">Import mode</legend>
        {([
          ['merge', 'Import & Merge', 'Add records that are new, e.g. from another employee. Existing records are never overwritten.'],
          ['restore', 'Import & Replace', 'Replace everything in the working dataset with this file (e.g. restoring a backup).'],
        ] as const).map(([v, t, d]) => (
          <label key={v} className={`card cursor-pointer p-3 text-sm ${mode === v ? 'border-[#58a6ff]!' : ''}`}>
            <input type="radio" name="mode" className="mr-2" checked={mode === v} onChange={() => setMode(v)} />
            <span className="font-semibold">{t}</span>
            <span className="mt-1 block text-xs text-[#8b949e]">{d}</span>
          </label>
        ))}
      </fieldset>

      {mode === 'merge' ? (
        <div className="space-y-3 text-sm">
          <h3 className="font-semibold">Review</h3>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {[
              ['New products', plan.newProducts.length],
              ['New updates', plan.newUpdates.length],
              ['New types', plan.newTypes.length],
              ['Already present', plan.identicalProducts + plan.identicalUpdates],
              ['Conflicts', plan.productConflicts.length + plan.updateConflicts.length],
            ].map(([l, n]) => (
              <li key={l} className="card p-2 text-center"><div className="text-xl font-semibold">{n}</div><div className="text-xs text-[#8b949e]">{l}</div></li>
            ))}
          </ul>
          {plan.warnings.map((w) => <p key={w} className="text-[#e3b341]">⚠ {w}</p>)}
          {(plan.productConflicts.length > 0 || plan.updateConflicts.length > 0) && (
            <div>
              <p className="mb-1 text-[#e3b341]">Conflicting records keep your existing version. The imported version is not applied:</p>
              <ul className="max-h-48 list-disc space-y-1 overflow-y-auto pl-5">
                {plan.productConflicts.map((c) => (
                  <li key={c.existing.id}>Product “{c.existing.name}” — incoming name is “{c.incoming.name}”.</li>
                ))}
                {plan.updateConflicts.map((c) => (
                  <li key={c.existing.id}>Update “{c.existing.title}” — differs in: {c.fields.join(', ')}.</li>
                ))}
              </ul>
            </div>
          )}
          {plan.newProducts.length + plan.newUpdates.length === 0 && (
            <p className="text-[#8b949e]">Nothing new to add — importing again will not create duplicates.</p>
          )}
        </div>
      ) : (
        <div className="space-y-2 text-sm">
          <p className="text-[#e3b341]">
            ⚠ {lostUpdates} update(s) and {lostProducts} product(s) in your working data are not in this file and will no longer appear after restoring. A backup file is downloaded before replacing.
          </p>
        </div>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <button className="btn" onClick={onClose}>Cancel</button>
        {mode === 'merge' ? (
          <button className="btn btn-primary" onClick={() => onMerge(plan)}>Apply merge</button>
        ) : (
          <button className="btn btn-danger" onClick={() => setConfirmRestore(true)}>Replace working data…</button>
        )}
      </div>
    </Modal>
  );
}
