import { EXPORT_FORMAT, SCHEMA_VERSION, type ChangelogExport, type Dataset } from './types';
import { todayLocal } from './mutations';

/** Builds the documented, versioned export document for a dataset. */
export function buildExport(ds: Dataset, now: Date = new Date()): ChangelogExport {
  return {
    format: EXPORT_FORMAT,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    products: ds.products,
    updates: ds.updates,
    customTypes: ds.customTypes,
  };
}

export function serializeExport(ds: Dataset, now?: Date): string {
  return JSON.stringify(buildExport(ds, now), null, 2) + '\n';
}

export function exportFilename(prefix = 'changelog-export', now: Date = new Date()): string {
  return `${prefix}-${todayLocal(now)}.json`;
}
