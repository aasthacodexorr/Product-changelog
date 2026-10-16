'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addCustomType,
  addProduct,
  allTypes,
  applyMerge,
  createUpdate,
  deleteUpdate,
  downloadTextFile,
  editUpdate,
  exportFilename,
  loadDraft,
  parseImport,
  planMerge,
  renderChangelogHtml,
  saveDraft,
  serializeExport,
  MAX_IMPORT_BYTES,
  type ChangelogExport,
  type Dataset,
  type MergePlan,
  type MutationResult,
  type Product,
  type Result,
  type UpdateInput,
} from '@/lib/changelog';

const EMPTY: Dataset = { products: [], updates: [], customTypes: [] };

export function useChangelog() {
  const [ready, setReady] = useState(false);
  const [working, setWorking] = useState<Dataset>(EMPTY);
  const [warning, setWarning] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Client-only: storage is read after mount, never during server rendering.
  // A first visit (nothing saved) simply starts with an empty dataset.
  useEffect(() => {
    const draft = loadDraft();
    setWorking(draft.dataset ?? EMPTY);
    setWarning(draft.warning ?? null);
    setReady(true);
  }, []);

  const commit = useCallback((ds: Dataset) => {
    setWorking(ds);
    const r = saveDraft(ds);
    setSaveError(r.ok ? null : r.error ?? 'Could not save.');
    if (r.ok) setWarning(null);
  }, []);

  const saveUpdate = useCallback(
    (editingId: string | null, input: UpdateInput): MutationResult => {
      const r = editingId ? editUpdate(working, editingId, input) : createUpdate(working, input);
      if (r.ok) commit(r.dataset);
      return r;
    },
    [working, commit],
  );

  const removeUpdate = useCallback((id: string) => commit(deleteUpdate(working, id)), [working, commit]);

  const createProduct = useCallback(
    (name: string): Result<Product> => {
      const r = addProduct(working, name);
      if (!r.ok || !r.value) return { ok: false, errors: r.errors };
      commit(r.value.dataset);
      return { ok: true, errors: [], value: r.value.product };
    },
    [working, commit],
  );

  const createType = useCallback(
    (name: string): Result<string> => {
      const r = addCustomType(working, name);
      if (!r.ok || !r.value) return { ok: false, errors: r.errors };
      commit(r.value.dataset);
      return { ok: true, errors: [], value: r.value.type };
    },
    [working, commit],
  );

  const readImportFile = useCallback(async (file: File): Promise<Result<ChangelogExport>> => {
    if (file.size > MAX_IMPORT_BYTES) return { ok: false, errors: ['The file is larger than 5 MB.'] };
    let text: string;
    try {
      text = await file.text();
    } catch {
      return { ok: false, errors: ['The file could not be read.'] };
    }
    return parseImport(text);
  }, []);

  const previewMerge = useCallback((incoming: Dataset): MergePlan => planMerge(working, incoming), [working]);

  const exportJson = useCallback(() => {
    downloadTextFile(exportFilename(), serializeExport(working), 'application/json');
  }, [working]);

  /** Replaces the working dataset. A backup of the current data is downloaded first. */
  const restore = useCallback(
    (incoming: Dataset) => {
      downloadTextFile(exportFilename('changelog-backup'), serializeExport(working), 'application/json');
      commit({ products: incoming.products, updates: incoming.updates, customTypes: incoming.customTypes });
    },
    [working, commit],
  );

  const merge = useCallback((plan: MergePlan) => commit(applyMerge(working, plan)), [working, commit]);

  /** Static deployment package: JSON + self-contained HTML. */
  const publishPackage = useCallback(() => {
    downloadTextFile('changelog.json', serializeExport(working), 'application/json');
    setTimeout(() => {
      downloadTextFile('changelog.html', renderChangelogHtml(working), 'text/html');
    }, 300);
  }, [working]);

  const types = useMemo(() => allTypes(working), [working]);

  return {
    ready, working, types, warning, saveError,
    dismissWarning: () => setWarning(null),
    saveUpdate, removeUpdate, createProduct, createType,
    readImportFile, previewMerge, restore, merge,
    exportJson, publishPackage,
  };
}
