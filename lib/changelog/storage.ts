import { validateDataset } from './schema';
import { SCHEMA_VERSION, type Dataset } from './types';

export const DRAFT_KEY = 'product-changelog:draft';

export interface DraftLoad {
  dataset: Dataset | null;
  /** Set when stored data existed but was unusable (corrupt / invalid). */
  warning?: string;
}

export interface SaveResult {
  ok: boolean;
  error?: string;
}

function getStorage(): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Reads the draft working dataset. Never throws; only touches storage on the client. */
export function loadDraft(): DraftLoad {
  const store = getStorage();
  if (!store) return { dataset: null, warning: 'Browser storage is unavailable; drafts will not be saved.' };
  let text: string | null;
  try {
    text = store.getItem(DRAFT_KEY);
  } catch {
    return { dataset: null, warning: 'Browser storage could not be read.' };
  }
  if (text === null || text.trim() === '') return { dataset: null };
  try {
    const parsed = JSON.parse(text) as { schemaVersion?: number; dataset?: unknown };
    if (parsed?.schemaVersion !== SCHEMA_VERSION) throw new Error('version');
    const result = validateDataset(parsed.dataset);
    if (!result.ok || !result.value) throw new Error('invalid');
    return { dataset: result.value };
  } catch {
    return {
      dataset: null,
      warning:
        'Saved draft data was corrupted or unreadable and was ignored. The published data is shown instead; the bad draft will be replaced on your next change.',
    };
  }
}

export function saveDraft(dataset: Dataset): SaveResult {
  const store = getStorage();
  if (!store) {
    return { ok: false, error: 'Browser storage is unavailable, so changes cannot be saved. Export JSON to keep your work.' };
  }
  try {
    store.setItem(
      DRAFT_KEY,
      JSON.stringify({ schemaVersion: SCHEMA_VERSION, savedAt: new Date().toISOString(), dataset }),
    );
    return { ok: true };
  } catch (e) {
    const quota =
      e instanceof DOMException &&
      (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e.code === 22);
    return {
      ok: false,
      error: quota
        ? 'Browser storage is full. Changes are not saved. Export JSON now to keep your work, then delete old updates or free browser storage.'
        : 'Changes could not be saved to browser storage. Export JSON to keep your work.',
    };
  }
}
