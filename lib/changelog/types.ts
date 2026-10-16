/**
 * Changelog data model. Documented exchange format: see README.md ("JSON schema").
 */

export const SCHEMA_VERSION = 1;
export const EXPORT_FORMAT = 'product-changelog';

/** Built-in update types. Custom types are stored alongside the data. */
export const DEFAULT_TYPES = ['New Feature', 'Improvement', 'Bug Fix', 'Security Update'] as const;

/** Any non-empty type name: one of DEFAULT_TYPES or a custom type. */
export type UpdateType = string;

export interface Product {
  id: string;
  name: string;
}

export interface ChangelogUpdate {
  id: string;
  productId: string;
  moduleName: string;
  title: string;
  description: string;
  /** Local calendar date, `YYYY-MM-DD`. */
  releaseDate: string;
  type: UpdateType;
  version?: string;
}

export interface Dataset {
  products: Product[];
  updates: ChangelogUpdate[];
  /** User-defined update types (never includes the defaults). */
  customTypes: string[];
}

/** The versioned file written by Export JSON and read by Import JSON. */
export interface ChangelogExport extends Dataset {
  format: typeof EXPORT_FORMAT;
  schemaVersion: number;
  exportedAt: string;
}

export interface UpdateInput {
  productId: string;
  moduleName: string;
  title: string;
  description: string;
  releaseDate: string;
  type: UpdateType;
  version: string;
}

export type FieldErrors = Partial<Record<keyof UpdateInput, string>>;

export interface Result<T> {
  ok: boolean;
  value?: T;
  errors: string[];
}

export const LIMITS = {
  name: 120,
  title: 200,
  description: 5000,
  version: 40,
  typeName: 40,
  customTypes: 100,
} as const;
